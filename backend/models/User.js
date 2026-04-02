const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["manager", "member"],
    default: "member"
  },
  
  // Professional profile
  phone: {
    type: String
  },
  jobTitle: {
    type: String
  },
  department: {
    type: String
  },
  bio: {
    type: String
  },
  skills: [{
    type: String
  }],
  
  // Employment info
  employeeId: {
    type: String
  },
  startDate: {
    type: Date
  },
  avatar: {
    type: String
  },
  
  // Stats
  tasksCompleted: {
    type: Number,
    default: 0
  },
  tasksAssigned: {
    type: Number,
    default: 0
  },
  projectsLed: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
