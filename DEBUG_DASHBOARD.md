# Dashboard Dynamic Loading - Debugging Guide

## Issue
Dashboard is still showing static data instead of loading from API.

## Quick Debugging Steps

### Step 1: Verify Backend is Running
1. Open a terminal in the `backend/` directory
2. Run: `npm start`
3. You should see: `Server running on port 5000`
4. If you get an error, check if:
   - Node.js is installed (`node --version`)
   - MongoDB is running (check connection string in code)
   - Port 5000 is not already in use

### Step 2: Check Browser Console
1. Open dashboard in browser
2. Right-click → **Inspect** (or press F12)
3. Go to **Console** tab
4. Look for messages like:
   - `Loading dashboard data from API...`
   - `Token exists: true/false`
   - `Raw projects response: [...]`
   - `Projects loaded: X`

### Step 3: Verify Authentication Token
In browser console, type:
```javascript
console.log(localStorage.getItem('token'))
```

**If it returns `null`:**
- You're not logged in
- Manually set a test token from a working user login
- Or login first on login.html

### Step 4: Test API Endpoints Directly
In browser console, paste this test code:
```javascript
// Test getProjects
async function testAPI() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('API Response:', data);
    console.log('Response status:', response.status);
  } catch (error) {
    console.error('API Test Error:', error);
  }
}
testAPI();
```

### Step 5: Check Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Reload dashboard
4. Look for requests to:
   - `localhost:5000/api/projects`
   - `localhost:5000/api/sprints`
   - `localhost:5000/api/tasks/project?...`
5. Check each request:
   - Status should be 200 (not 401, 404, 500)
   - Response should show JSON data

### Step 6: Common Issues & Solutions

**Issue: Token returns `null`**
→ Login first, then go to dashboard

**Issue: API requests show 401 Unauthorized**
→ Token might be expired or invalid
→ Login again to get fresh token

**Issue: API requests show 404 Not Found**
→ Backend endpoint doesn't exist OR
→ Backend is not running

**Issue: API requests show 500 Server Error**
→ Check backend console for error messages
→ May be a database connection issue

**Issue: Console says "API Error: Failed to fetch"**
→ CORS issue OR backend not running
→ Check backend is running on port 5000

### Step 7: Enable More Verbose Logging

Edit `frontend/dashboard.html` and add this before `<script src="api.js"></script>`:
```javascript
<script>
  // Verbose logging for debugging
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('FETCH:', args[0], args[1]?.method || 'GET');
    return originalFetch.apply(this, args)
      .then(r => {
        console.log('RESPONSE:', args[0], r.status);
        return r;
      })
      .catch(e => {
        console.error('FETCH ERROR:', args[0], e);
        throw e;
      });
  };
</script>
```

## Testing Checklist

- [ ] Backend is running (`npm start` in backend/)
- [ ] MongoDB is connected (no connection errors)
- [ ] You're logged in (token exists in localStorage)
- [ ] Browser console shows "Loading dashboard data from API..." message
- [ ] Console shows "Token exists: true"
- [ ] Console shows projects/sprints/tasks counts
- [ ] Network tab shows 200 responses from API endpoints
- [ ] Dashboard numbers update (not showing 3, 5, 24, 8)

## If Still Not Working

After following all steps above:
1. Share console output (F12 → Console tab, scroll to top)
2. Share network responses (F12 → Network tab → click on /api/projects → Response tab)
3. Check backend console for any error messages

## Quick Command Reference

**Start backend:**
```bash
cd backend
npm start
```

**Test if backend is running:**
```bash
curl http://localhost:5000/api/projects
# Should return 401 (unauthorized) which means server is running
```

**Clear token (force re-login):**
```javascript
localStorage.removeItem('token');
localStorage.removeItem('user');
```
