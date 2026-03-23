const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    // Basic info
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    
    // Task metadata
    taskType: {
      type: String,
      enum: ["story", "bug", "task", "subtask", "epic"],
      default: "task"
    },
    status: {
      type: String,
      enum: ["todo", "inprogress", "review", "blocked", "done"],
      default: "todo"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    
    // Agile specifics
    storyPoints: {
      type: Number,
      default: 0
    },
    estimate: {
      type: Number, // in hours
      default: 0
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockedReason: {
      type: String
    },
    
    // Assignment & ownership
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
    // Categorization
    labels: [{
      type: String
    }],
    
    // Relationships
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint"
    },
    backlogRank: {
      type: Number,
      default: null
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    dependsOn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task"
    }],
    
    // Dates
    dueDate: {
      type: Date
    },
    startDate: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    
    // Acceptance & details
    acceptanceCriteria: [{
      text: String,
      completed: {
        type: Boolean,
        default: false
      }
    }],
    
    // Attachments
    attachments: [{
      name: String,
      url: String,
      uploadedBy: mongoose.Schema.Types.ObjectId,
      uploadedAt: Date
    }],
    
    // Comments
    comments: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Activity tracking
    activityHistory: [{
      action: String, // "created", "updated", "status_changed", "assigned", etc
      field: String, // what was changed
      oldValue: String,
      newValue: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      changedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Task", taskSchema);