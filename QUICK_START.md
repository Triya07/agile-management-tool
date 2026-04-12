# Quick Start Guide - FlowBoard User Profile System

## Prerequisites
- Node.js and npm installed
- MongoDB installed and running
- VS Code or any code editor

## Setup Instructions

### 1. Backend Setup (5 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start MongoDB (in a separate terminal)
# On Windows:
mongod

# On Mac/Linux:
brew services start mongodb-community

# Verify .env file exists with:
# PORT=5000
# MONGODB_URI=mongodb://127.0.0.1:27017/agileDB
# JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Start backend server
node server.js

# Expected output: "🚀 FlowBoard Server running on port 5000"
```

### 2. Frontend Setup (2 minutes)

```bash
# Navigate to frontend directory
cd frontend

# Option A: Using VS Code Live Server
# 1. Right-click on index.html
# 2. Select "Open with Live Server"
# 3. Browser opens on http://localhost:5500 (or similar)

# Option B: Using Python (if available)
python -m http.server 8000

# Option C: Using Node http-server
npm install -g http-server
http-server
```

## First Time Usage

### Step 1: Create an Account
1. Open frontend in browser (http://localhost:5500 or similar)
2. Click "Sign Up"
3. Enter:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "password123"
   - Role: "manager" (or "member")
4. Click "Sign Up"
5. You'll be automatically logged in and redirected

### Step 2: Create a Project
1. You're now on the Projects page
2. Click "Create New Project"
3. Enter:
   - Name: "My First Project"
   - Type: "Scrum" or "Kanban"
   - Description: "Test project"
4. Click "Create"

### Step 3: Create a Sprint (for Scrum projects)
1. Click on your project
2. Click "New Sprint"
3. Enter sprint details
4. Click "Create Sprint"

### Step 4: Create Tasks
1. On the board page, click "Add Task"
2. Enter:
   - Title: "First Task"
   - Assign to: yourself
3. Click "Create"
4. Drag task between columns to change status

### Step 5: View Your Profile
1. Click on "Profile" in sidebar
2. View your personalized dashboard
3. See statistics for your projects and tasks
4. Edit your profile if needed

## Testing Multi-User Scenario

### User A Setup
```
Email: alice@example.com
Password: alice123
Role: manager
```

### User B Setup
```
Email: bob@example.com
Password: bob123
Role: member
```

### Test Steps
1. **Create Project as User A**:
   - Login as alice@example.com
   - Create project "Team Project"
   - Create sprint and add tasks

2. **Login as User B**:
   - Logout as User A
   - Login as bob@example.com
   - Verify you CANNOT see "Team Project"
   - Create your own project "Personal Project"

3. **Add User B to Project**:
   - Logout as User B
   - Login as User A
   - Go to "Team Project"
   - Click "Add Member"
   - Enter bob@example.com
   - Click "Add"

4. **Verify Access**:
   - Logout as User A
   - Login as User B
   - Verify "Team Project" is now visible
   - View only tasks assigned to you

## Key Features Overview

### Authentication
- ✅ Login/Signup with JWT tokens
- ✅ Automatic token management
- ✅ Secure password hashing
- ✅ Role-based access (Manager vs Member)

### Personalization
- ✅ User-specific project views
- ✅ Personalized dashboard with statistics
- ✅ Task assignment per user
- ✅ Activity feed showing your actions

### Boards
- ✅ Scrum board (todo → inprogress → done)
- ✅ Kanban board (dynamic columns)
- ✅ Drag-drop task management
- ✅ Real-time status updates

### User Profile
- ✅ View profile information
- ✅ Edit profile (name, email)
- ✅ View statistics
- ✅ See assigned tasks
- ✅ View project list
- ✅ Activity timeline

## Accessing Different Pages

### For Managers
1. **Dashboard**: http://localhost:5500/dashboard.html
2. **Projects**: http://localhost:5500/projects.html
3. **Kanban Board**: http://localhost:5500/kanban-board.html
4. **Scrum Board**: http://localhost:5500/scrum-board.html
5. **Profile**: http://localhost:5500/user-profile.html

### For Team Members
1. **Team Dashboard**: http://localhost:5500/dashboard-team.html
2. **My Tasks**: http://localhost:5500/my-tasks.html
3. **Sprint Overview**: http://localhost:5500/sprint-overview.html
4. **Scrum Updates**: http://localhost:5500/scrum-updates.html
5. **Profile**: http://localhost:5500/user-profile.html

## API Endpoints Reference

### Authentication
```
POST /api/auth/signup
POST /api/auth/login
```

### User Profile (Requires Authentication)
```
GET  /api/users/profile
GET  /api/users/dashboard
GET  /api/users/projects
GET  /api/users/activity
PATCH /api/users/profile
```

### Projects (Requires Authentication)
```
GET  /api/projects
POST /api/projects
GET  /api/projects/:id
PUT  /api/projects/:id/members
```

### Sprints (Requires Authentication)
```
GET  /api/sprints
GET  /api/sprints/project/:projectId
POST /api/sprints
```

### Tasks (Requires Authentication)
```
GET  /api/tasks
GET  /api/tasks/project/:projectId
GET  /api/tasks/user
POST /api/tasks
PATCH /api/tasks/:id/status
DELETE /api/tasks/:id
```

## Troubleshooting

### Backend won't start
```
Error: connect ECONNREFUSED 127.0.0.1:27017
Solution: MongoDB is not running. Start MongoDB first.
```

### 401 Unauthorized errors
```
Error: User receives 401 on API calls
Solution: Token is missing or invalid
- Check localStorage has 'token' and 'user'
- Logout and login again
```

### Database appears empty
```
Problem: Created projects/tasks but not visible
Solution: 
- Check you're logged in with correct user
- Verify tasks/projects are in your user's projects
- Check browser console for API errors
```

### CORS errors
```
Error: Access to XMLHttpRequest has been blocked by CORS policy
Solution: 
- Ensure backend is running on port 5000
- Check CORS configuration in server.js
- Clear browser cache and refresh
```

### Frontend shows "Loading..."
```
Problem: Dashboard or profile shows loading indefinitely
Solution:
- Check browser console for errors
- Verify backend server is running
- Check network tab to see API requests
- Verify valid token in localStorage
```

## Data Structure

### User Object (stored in localStorage)
```javascript
{
  _id: "63f7a123...",
  name: "John Doe",
  email: "john@example.com",
  role: "manager" | "member"
}
```

### Project Object
```javascript
{
  _id: "63f7a456...",
  name: "My Project",
  type: "scrum" | "kanban",
  createdBy: userId,
  members: [userId1, userId2],
  description: "Project description"
}
```

### Task Object
```javascript
{
  _id: "63f7a789...",
  title: "Task title",
  status: "todo" | "inprogress" | "done",
  assignedTo: userId,
  createdBy: userId,
  projectId: projectId,
  priority: "low" | "medium" | "high",
  dueDate: "2025-03-15"
}
```

## Next Steps

1. ✅ Setup backend and frontend
2. ✅ Create test users
3. ✅ Create projects and tasks
4. ✅ Test multi-user data isolation
5. ✅ Verify all board functionalities
6. 🔄 Consider deploying to production
7. 🔄 Add more features (notifications, advanced filtering, etc.)

## Support

If you encounter issues:
1. Check browser console (F12 → Console tab)
2. Check backend console for errors
3. Verify MongoDB is running
4. Check network requests (F12 → Network tab)
5. Review error messages and API responses

---

**Happy Project Management! 🚀**
