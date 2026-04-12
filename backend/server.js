require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Check if MongoDB URI is provided
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("❌ MONGODB_URI is not defined in .env file");
  console.log("📝 Please create a .env file with MONGODB_URI");
  console.log("💡 Example: MONGODB_URI=mongodb://localhost:27017/agile-management-tool");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(mongoUri)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("\n🛠️  Troubleshooting MongoDB connection:");
    console.log("1. Make sure MongoDB is running locally");
    console.log("2. Check your MONGODB_URI in .env file");
    console.log("3. For local MongoDB: mongod --dbpath /path/to/data");
    console.log("4. For MongoDB Atlas: Check your connection string and credentials");
    
    // Don't exit - allow server to run without DB for testing
    console.log("⚠️  Server will continue without database connection");
  });

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    message: "FlowBoard API is running",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// User Schema (inline for simplicity)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["manager", "worker"], default: "worker" },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ["scrum", "kanban"], default: "scrum" },
  owner: { type: String, required: true },
  status: { type: String, enum: ["active", "completed", "on-hold"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

const Project = mongoose.model("Project", projectSchema);

// Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ["todo", "inprogress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  assignee: String,
  projectId: String,
  dueDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", taskSchema);

// Authentication Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Simulate user creation for demo mode
      return res.status(201).json({
        message: 'User registered successfully (demo mode)',
        user: { username, email, role: role || 'worker' },
        token: 'demo-token-' + Date.now()
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user (in production, hash the password!)
    const user = new User({ username, email, password, role: role || 'worker' });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { username: user.username, email: user.email, role: user.role },
      token: 'jwt-token-placeholder'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Demo users for testing
      const demoUsers = {
        'admin@example.com': { username: 'Admin', role: 'manager', password: 'admin123' },
        'worker@example.com': { username: 'Worker', role: 'worker', password: 'worker123' },
        'test@example.com': { username: 'TestUser', role: 'worker', password: 'test123' }
      };

      const user = demoUsers[email];
      if (user && user.password === password) {
        return res.json({
          message: 'Login successful (demo mode)',
          user: { username: user.username, email, role: user.role },
          token: 'demo-token-' + Date.now()
        });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // Find user in database
    const user = await User.findOne({ email });
    if (!user || user.password !== password) { // In production, use bcrypt.compare()
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      user: { username: user.username, email: user.email, role: user.role },
      token: 'jwt-token-placeholder'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Project Routes
app.get("/api/projects", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Return demo projects
      return res.json([
        { id: 1, name: 'Demo Project 1', type: 'scrum', status: 'active' },
        { id: 2, name: 'Demo Project 2', type: 'kanban', status: 'active' }
      ]);
    }

    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, type, owner } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (mongoose.connection.readyState !== 1) {
      // Return demo project
      return res.status(201).json({
        id: Date.now(),
        name,
        description,
        type: type || 'scrum',
        owner: owner || 'demo-user',
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }

    const project = new Project({ name, description, type, owner: owner || 'unknown' });
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Task Routes
app.get("/api/tasks", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Return demo tasks
      return res.json([
        { id: 1, title: 'Demo Task 1', status: 'todo', assignee: 'TestUser' },
        { id: 2, title: 'Demo Task 2', status: 'inprogress', assignee: 'Worker' }
      ]);
    }

    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, status, assignee, projectId } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    if (mongoose.connection.readyState !== 1) {
      // Return demo task
      return res.status(201).json({
        id: Date.now(),
        title,
        description,
        status: status || 'todo',
        assignee,
        projectId,
        createdAt: new Date().toISOString()
      });
    }

    const task = new Task({ title, description, status, assignee, projectId });
    await task.save();

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (mongoose.connection.readyState !== 1) {
      // Return demo updated task
      return res.json({
        id: id,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }

    const task = await Task.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlowBoard Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  
  // Show helpful information
  if (!process.env.MONGODB_URI) {
    console.log('\n⚠️  MongoDB not configured - running in demo mode');
    console.log('📝 Create .env file with MONGODB_URI to enable database');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
  process.exit(0);
});
