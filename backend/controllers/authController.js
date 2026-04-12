const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function canSelfAssignManagerRole() {
  return process.env.ALLOW_MANAGER_SELF_SIGNUP === "true";
}

// SIGN UP
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const requestedRole = String(role || "member").toLowerCase();
    if (requestedRole === "manager" && !canSelfAssignManagerRole()) {
      return res.status(403).json({
        message: "Manager accounts cannot be created through public signup."
      });
    }

    const userExists = await User.findOne({ email, isDeleted: { $ne: true } });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: requestedRole === "manager" ? "manager" : "member"
    });

    res.status(201).json({
      message: "Signup successful",
      token: jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      ),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    if (user.isDeleted) {
      return res.status(401).json({ message: "This account is no longer active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      message: "Login successful",
      token: jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      ),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CHANGE PASSWORD (authenticated user)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE ACCOUNT (authenticated user)
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(400).json({ message: "Account has already been deleted" });
    }

    const deletedAt = new Date();
    const tombstoneEmail = `deleted+${user._id.toString()}+${deletedAt.getTime()}@flowboard.local`;
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    await Project.updateMany(
      { members: user._id },
      { $pull: { members: user._id } }
    );

    await Task.updateMany(
      { assignedTo: user._id },
      {
        $set: { assignedTo: null },
        $push: {
          activityHistory: {
            action: "unassigned_due_to_account_deletion",
            field: "assignedTo",
            oldValue: user._id.toString(),
            newValue: "unassigned",
            changedBy: user._id,
            changedAt: deletedAt
          }
        }
      }
    );

    await Task.updateMany(
      { assignedUsers: user._id },
      {
        $pull: { assignedUsers: user._id }
      }
    );

    await Task.updateMany(
      { reporter: user._id },
      { $set: { reporter: null } }
    );

    user.name = "Deleted User";
    user.email = tombstoneEmail;
    user.password = hashedPassword;
    user.role = "member";
    user.phone = "";
    user.jobTitle = "";
    user.department = "";
    user.bio = "";
    user.skills = [];
    user.employeeId = "";
    user.startDate = null;
    user.avatar = "";
    user.tasksCompleted = 0;
    user.tasksAssigned = 0;
    user.projectsLed = 0;
    user.isDeleted = true;
    user.deletedAt = deletedAt;

    await user.save();

    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
