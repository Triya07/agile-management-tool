# FlowBoard - User Profile Customization Implementation Guide

## Overview
This document provides a comprehensive guide to the user profile customization system implemented in FlowBoard. The system ensures that each user sees only their own personalized data across all boards, dashboards, and projects.

## Architecture Overview

### Authentication Flow
1. User logs in via `login.html` or signs up via `signup.html`
2. JWT token is stored in localStorage as `token`
3. User data is stored in localStorage as `user` (JSON object)
4. All API requests automatically include Bearer token in headers via `api.js`

### Data Isolation Strategy
- **Backend**: All API endpoints filter data based on authenticated user ID (`req.user.id`)
- **Frontend**: API utility (`api.js`) manages token injection and automatic redirect on 401
- **Models**: Data models include user references (createdBy, assignedTo, members)

## Backend Architecture

### Key Files

#### 1. **Data Models** (`backend/models/`)
- **User.js**: User schema with role enum ["manager", "member"]
- **Project.js**: 
  - Added `type` field (scrum/kanban)
  - Added `members` array (ObjectId references to users)
  - Added `createdBy` field (reference to user who created project)
- **Sprint.js**: 
  - Added `projectId` reference
  - Added `status` field with enum [planning, active, completed]
- **Task.js**: 
  - Added `createdBy` and `assignedTo` (ObjectId references)
  - Added `projectId` reference
  - Added `priority` and `dueDate` fields
  - Status enum: [todo, inprogress, done]

#### 2. **Controllers** (`backend/controllers/`)

**userController.js** (NEW FILE)
- `getUserProfile()`: Returns current user's profile
- `getUserDashboard()`: Returns user-specific statistics and data
- `updateUserProfile()`: Allows user to update name and email
- `getUserProjects()`: Returns all projects accessible to user with statistics
- `getUserActivity()`: Returns recent tasks and sprints for the user

**projectController.js** (UPDATED)
- All endpoints filtered to return only user's projects
- Authentication required on all routes via `protect` middleware

**sprintController.js** (UPDATED)
- All sprints scoped to user's accessible projects
- User must have access to project to see/manage sprints

**taskController.js** (UPDATED)
- All tasks filtered based on user's project membership
- Added methods: getUserTasks, getProjectTasks, updateTaskStatus

#### 3. **Routes** (`backend/routes/`)

**userRoutes.js** (NEW FILE)
```
GET  /api/users/profile      - Get current user profile
GET  /api/users/dashboard    - Get user dashboard with statistics
PATCH /api/users/profile     - Update user profile
GET  /api/users/projects     - Get user's projects
GET  /api/users/activity     - Get user activity feed
```

**Other Routes**: All protected with `protect` middleware
```
/api/auth      - Authentication (login, signup)
/api/projects  - Project management
/api/sprints   - Sprint management
/api/tasks     - Task management
```

#### 4. **Middleware** (`backend/middleware/`)

**authMiddleware.js**
- `protect` middleware: Verifies JWT token, extracts user ID, attaches to req.user
- Applied to all sensitive routes

### Backend API Data Flow

1. Request arrives with Bearer token
2. `protect` middleware validates token and sets `req.user.id`
3. Controller retrieves only data accessible to this user
4. Response sent with filtered data

## Frontend Architecture

### Key Files

#### 1. **API Utility** (`frontend/api.js`)
Centralized API management with automatic token handling:
- `getToken()`: Retrieves JWT from localStorage
- `getCurrentUser()`: Returns parsed user object
- `apiCall()`: Generic fetch wrapper with auth header
- **User Endpoints**: getUserProfile, getUserDashboard, updateUserProfile, getUserProjects, getUserActivity
- **Project Endpoints**: getProjects, getProject, createProject, addProjectMember
- **Sprint Endpoints**: getProjectSprints, getAllSprints, createSprint
- **Task Endpoints**: getSprintTasks, getProjectTasks, getUserTasks, createTask, updateTaskStatus, deleteTask

#### 2. **Authentication Pages**

**login.html**
- User login with email/password
- Stores token and user in localStorage
- Redirects based on role (manager → projects.html, member → dashboard-team.html)

**signup.html**
- New user registration
- Creates account and logs in automatically
- Same redirect logic as login

#### 3. **User Profile** (`frontend/user-profile.html`)
Comprehensive user profile system with:
- **Profile Header**: User avatar, name, role, email
- **Statistics**: Total projects, completed tasks, active sprints
- **Profile Edit Form**: Update name and email with validation
- **Dashboard Tabs**:
  - Projects: Grid of user's projects with stats
  - My Tasks: List of tasks assigned to user
  - Activity: Recent activity feed

#### 4. **Personalized Dashboard** (`frontend/personalized-dashboard.html`)
Main landing page after login with:
- User information header
- Statistics cards (total projects, scrum/kanban count, active sprints)
- Projects grid with project type badge
- Assigned tasks list
- Easy navigation to project boards

#### 5. **Board Pages** (UPDATED)

**scrum-board.html** & **scrum-board.js**
- Loads only user's projects and assigned tasks from API
- Drag-drop task management with API updates
- Real-time status updates

**kanban-board.html** & **kanban-board.js**
- Dynamic Kanban columns from API
- Similar drag-drop functionality as scrum board

### Frontend Data Flow

1. Page loads and checks for valid token in localStorage
2. Calls API endpoint with token in Authorization header
3. Backend validates token and returns only user-specific data
4. Frontend renders data in real-time
5. User actions (drag-drop, form submit) update via API

## User Experience Flow

### For Manager Role:
1. Login → Redirected to projects.html
2. Can see only projects they created or were added to
3. Can add team members to projects
4. Can view all sprints and tasks in their projects
5. Click profile icon → User profile with personalization options

### For Member Role:
1. Login → Redirected to dashboard-team.html
2. See personalized dashboard with assigned tasks
3. Can view only projects they're members of
4. Can update task status via drag-drop
5. Access profile from dashboard or team pages

## Testing Checklist

### 1. Authentication Testing
- [ ] Login with valid credentials
- [ ] Token correctly stored in localStorage
- [ ] Logout clears localStorage
- [ ] Invalid token redirects to login
- [ ] Expired token triggers re-login

### 2. Data Isolation Testing
- [ ] Create User A with 2 projects
- [ ] Create User B with 1 different project
- [ ] Login as User A: Should see only their 2 projects
- [ ] Login as User B: Should see only their 1 project
- [ ] User A cannot access User B's project data
- [ ] Add User B as member to User A's project
- [ ] User B now sees User A's project

### 3. Dashboard Customization Testing
- [ ] User profile loads with correct user data
- [ ] Project statistics show only user's projects
- [ ] Task counts match actual tasks
- [ ] Activity feed shows user's recent actions
- [ ] Edit profile updates immediately

### 4. Board Functionality Testing
- [ ] Scrum board loads only user's projects
- [ ] Kanban board displays all user's tasks
- [ ] Drag-drop updates task status via API
- [ ] New tasks created only visible to assigned users
- [ ] Task filtering works correctly by status

### 5. API Endpoint Testing
```bash
# Test authentication
POST /api/auth/signup - Create new user
POST /api/auth/login - Login user

# Test user endpoints (all require valid JWT)
GET /api/users/profile - Get user profile
GET /api/users/dashboard - Get dashboard data
GET /api/users/projects - Get user's projects
GET /api/users/activity - Get activity feed
PATCH /api/users/profile - Update profile

# Test project endpoints (all require valid JWT)
GET /api/projects - Get user's projects
POST /api/projects - Create new project
GET /api/projects/:id - Get specific project
PUT /api/projects/:id/members - Add member

# Test sprint endpoints (all require valid JWT)
GET /api/sprints/project/:projectId - Get project sprints
POST /api/sprints - Create sprint

# Test task endpoints (all require valid JWT)
GET /api/tasks/project/:projectId - Get project tasks
GET /api/tasks/user - Get user's assigned tasks
POST /api/tasks - Create task
PATCH /api/tasks/:id/status - Update task status
```

## Deployment Checklist

### Backend Setup
1. Install dependencies: `npm install` in backend/
2. Configure `.env` file with:
   - MONGODB_URI (MongoDB connection string)
   - JWT_SECRET (strong secret key)
   - PORT (default 5000)
3. Start MongoDB server (local or cloud Atlas)
4. Start backend: `node server.js`

### Frontend Setup
1. Ensure backend is running on http://localhost:5000
2. Open index.html in browser (or serve with live server)
3. Navigate to login.html for authentication

### Environment Variables (.env)
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/agileDB
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
FRONTEND_URL=http://localhost:3000
```

## Security Considerations

### Implemented
✅ JWT token-based authentication
✅ Password hashing (bcryptjs)
✅ Server-side data filtering
✅ CORS properly configured
✅ Protected API endpoints with middleware
✅ Token stored in localStorage (accessible to frontend only)

### Recommendations
- [ ] Use HTTPS in production
- [ ] Implement refresh tokens with expiration
- [ ] Add rate limiting on auth endpoints
- [ ] Implement role-based access control (RBAC) for finer control
- [ ] Add audit logging for sensitive operations
- [ ] Implement 2FA for sensitive accounts
- [ ] Regular security audits

## Troubleshooting

### Issue: "User not found" error on login
**Solution**: Check if user exists in database. Ensure MongoDB is running.

### Issue: Unauthorized (401) on API requests
**Solution**: Check if token is valid and stored correctly in localStorage. Try logout and login again.

### Issue: Dashboard shows no data
**Solution**: Ensure user has projects assigned. Check browser console for API errors. Verify backend is running.

### Issue: Database connection failed
**Solution**: Ensure MongoDB is running locally or connection string is correct. Check MONGODB_URI in .env

### Issue: CORS error in console
**Solution**: Backend CORS is configured to allow all origins. Check if backend is running on correct port.

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live board updates
2. **Notifications**: Email/push notifications for task assignments
3. **Advanced Filtering**: Save favorite filters per user
4. **Team Collaboration**: Comments and mentions on tasks
5. **Reporting**: Advanced analytics and burndown charts
6. **Mobile App**: React Native or Flutter for mobile access
7. **Export**: PDF export for reports and dashboards
8. **Integration**: Slack, Teams, or GitHub integration

## Support & Documentation

For more information:
- Backend routes: See `backend/routes/`
- Frontend components: See `frontend/`
- Database models: See `backend/models/`
- API documentation: Check each controller file

---

**Last Updated**: 2025
**Version**: 1.0 - User Profile Customization
