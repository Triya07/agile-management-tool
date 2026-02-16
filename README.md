# FlowBoard - Agile Project Management Tool

## 🎯 Project Overview

FlowBoard is a comprehensive agile project management tool designed to help teams collaborate on projects using Scrum and Kanban methodologies. The platform features user-specific data isolation, ensuring that each user sees only their personalized projects, tasks, and dashboards.

### Key Features

✅ **User Authentication & Authorization**
- JWT token-based authentication
- Role-based access control (Manager & Member)
- Secure password hashing with bcryptjs

✅ **Personalized User Experience**
- User-specific project views
- Personalized dashboards with statistics
- Activity tracking and feeds
- Editable user profiles

✅ **Project Management**
- Scrum and Kanban project types
- Project creation and team member management
- Sprint planning and management
- Task assignment and tracking

✅ **Agile Boards**
- Scrum board with status columns (To Do → In Progress → Done)
- Kanban board with dynamic columns
- Drag-and-drop task management
- Real-time status updates via API

✅ **Team Collaboration**
- Add team members to projects
- Assign tasks to specific users
- View team member contributions
- Activity timeline

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- CORS for cross-origin requests

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- No external dependencies (pure JavaScript)
- RESTful API integration
- Responsive design

**Database:**
- MongoDB (local or Atlas)
- Collections: Users, Projects, Sprints, Tasks

## 🔐 Data Isolation & Security

### Authentication Flow

1. **User Login/Signup**
   - Credentials sent to `/api/auth/login` or `/api/auth/signup`
   - Backend verifies credentials or creates new user
   - JWT token issued and returned

2. **Token Storage**
   - Token stored in localStorage as `token`
   - User info stored in localStorage as `user` (JSON)
   - Token automatically injected in all API requests

3. **Request Processing**
   - Backend `protect` middleware validates token
   - User ID extracted from decoded JWT
   - User ID attached to request as `req.user.id`

4. **Data Filtering**
   - All controllers filter data based on `req.user.id`
   - Only data accessible to user is returned
   - Prevents data leakage between users

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Modern web browser

### Installation

**1. Clone or download the repository**
```bash
cd agile-management-tool
```

**2. Setup Backend**
```bash
cd backend
npm install
# Configure .env with MongoDB URI and JWT secret
node server.js
```

**3. Setup Frontend**
```bash
cd frontend
# Use VS Code Live Server or Python http server
# Open index.html in browser
```

**4. Create Test Account**
- Go to Signup page
- Enter credentials
- Auto-redirected to dashboard after signup

## 📁 Project Structure

```
agile-management-tool/
├── backend/
│   ├── controllers/     # API controllers
│   ├── middleware/      # Auth middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── server.js        # Express server
│   └── .env             # Environment config
├── frontend/
│   ├── api.js           # API utility
│   ├── style.css        # Styles
│   ├── *.html           # Pages
│   └── *.js             # Page logic
└── docs/
    ├── IMPLEMENTATION_GUIDE.md
    └── QUICK_START.md
```

## 📊 API Endpoints

All endpoints except `/api/auth/*` require valid JWT token in Authorization header.

**Authentication:**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

**User Profile:**
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/dashboard` - Get dashboard data
- `GET /api/users/projects` - Get user's projects
- `GET /api/users/activity` - Get activity feed
- `PATCH /api/users/profile` - Update profile

**Projects:**
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get specific project
- `PUT /api/projects/:id/members` - Add member

**Sprints:**
- `GET /api/sprints/project/:projectId` - Get sprints
- `POST /api/sprints` - Create sprint

**Tasks:**
- `GET /api/tasks/project/:projectId` - Get project tasks
- `GET /api/tasks/user` - Get assigned tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/status` - Update status
- `DELETE /api/tasks/:id` - Delete task

## 🧪 Testing

### Create Test Users

**User A (Manager):**
- Email: alice@example.com
- Password: alice123
- Role: manager

**User B (Member):**
- Email: bob@example.com
- Password: bob123
- Role: member

### Test Data Isolation

1. Login as User A
2. Create "Team Project"
3. Logout
4. Login as User B
5. Verify User B cannot see "Team Project"
6. User A adds User B to project
7. User B now sees "Team Project"

## 📖 Documentation

See the following for more details:

- [QUICK_START.md](./QUICK_START.md) - Quick start guide with setup steps
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Detailed architecture and testing guide

## 🔧 Troubleshooting

**Backend won't start:**
- Ensure MongoDB is running: `mongod`
- Check .env configuration
- Verify port 5000 is available

**API returns 401 Unauthorized:**
- Logout and login again
- Check localStorage for valid token
- Verify backend is running

**Frontend shows no data:**
- Open browser console (F12)
- Check for API errors
- Verify backend server is running

## 🚀 Deployment

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for deployment instructions.

## 📝 License

MIT License - Feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please submit a Pull Request.

---

**Version:** 1.0
**Last Updated:** 2025

**Happy Project Management! 🎯**
