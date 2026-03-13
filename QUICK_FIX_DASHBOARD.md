# Dashboard Setup Guide

## How to Get Dashboard Working with Your Data

### Step 1: Start the Backend Server
```bash
cd backend
npm start
```

**Expected Output:**
```
Server running on port 5000
Connected to MongoDB
```

### Step 2: Login to App
1. Go to `frontend/login.html`
2. Login with your account credentials

### Step 3: Create Projects, Sprints, and Tasks
Add your own data:
- Create projects in the Projects page
- Create sprints for each project
- Add tasks to your sprints

### Step 4: View Dashboard
Go to `frontend/dashboard.html`

The dashboard will show:
- **Active Projects:** Count of your projects
- **Active Sprints:** Count of your sprints
- **Total Tasks:** All tasks across your projects
- **Team Members:** Total members in your projects
- **Recent Activity:** Latest projects, sprints, and tasks you created

---

## Dashboard Updates in Real-Time

Whenever you:
- Create a new project
- Add a sprint
- Create a task

Just **refresh the dashboard page** to see updated numbers and recent activity.

---

## Empty State

If you haven't created any data yet:
- Dashboard shows: 0 projects, 0 sprints, 0 tasks, 0 members
- Recent activity shows: "No data yet. Create a project to get started."

---

## Troubleshooting

### "Nothing happens when I click on the dashboard"
1. Make sure backend is running: `npm start` in backend folder
2. Make sure you're logged in - login first, then go to dashboard
3. Check browser console (F12) for any error messages

### "API Error" in console
- Login again to refresh your token
- Make sure backend server is running

### Dashboard shows "0" for everything
- This is normal if you haven't created any data yet
- Create a project and it will update when you refresh
