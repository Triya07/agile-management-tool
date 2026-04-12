# Duplicate/Competing Screens Cleanup Plan

## Issue Summary
Multiple duplicate pages exist with overlapping functionality, causing confusion, inconsistent data, and bugs. This document consolidates the canonical implementations.

---

## 1. Kanban Board (CRITICAL - LOCAL VS API MISMATCH)

### ❌ DEPRECATED: `board.html` (212 lines)
- Uses OLD local-only implementation with `script.js`
- Uses localStorage instead of backend API
- **NOT referenced by any active page** (except legacy code)
- Associated: `script.js` (only used here)

### ✅ CANONICAL: `kanban-board.html` (API-based)
- Uses `kanban-board.js` with API calls
- Properly authenticated with JWT tokens
- Actively used by:
  - `projects.html` (Kanban Board button)
  - `sprint.html` (navigation)
  - `scrum-board.html` (navigation)
  - `dashboard.html` (View Kanban Board button)
  - `team.html` (navigation)
  - `settings.html` (navigation)
  - `personalized-dashboard.html` (redirect)

**Action**: 
- ✅ DONE: Updated `reports.html` to link to `kanban-board.html` instead of `board.html`
- TODO: Deprecate `board.html` and `script.js` when ready (safe to remove)

---

## 2. Scrum Board (LOCAL VS API MISMATCH)

### ❌ DEPRECATED: `sprints.html` (620 lines)
- OLD local-only implementation
- Duplicates functionality of `scrum-board.html`
- **NOT referenced anywhere** (completely unused)
- Same title as `scrum-board.html`

### ✅ CANONICAL: `scrum-board.html` (287 lines, API-based)
- Uses `scrum-board.js` with API calls
- Modern, cleaner implementation
- Actively used by:
  - `personalized-dashboard.html` (Scrum Board redirect)
  - `projects.js` (createProject() navigation)
  - `projects.html` (sidebar)

**Action**: 
- TODO: Deprecate `sprints.html` when ready (safe to remove)

---

## 3. Sprint Management (OVERLAPPING ROLES)

### ✅ CANONICAL: `sprint.html` (API-based Sprint Board)
- Interactive board with drag-drop task management
- Uses `sprint.js` with API calls
- Shows tasks organized by status (todo, inprogress, done)
- For team members to manage sprint tasks

### ✅ ACTIVE: `sprint-overview.html`
- Displays current sprint info and user's assigned tasks
- Uses localStorage (legacy, read-only)
- For team members to view sprint progress
- Different purpose than sprint.html

### ✅ ACTIVE: `scrum-updates.html`
- Scrum meeting notes and updates
- Different purpose than both above

**Action**: All three serve different purposes and should remain.

---

## 4. Fixed Issues

### Broken Link: `profile.html` → `user-profile.html`
- **Status**: ✅ FIXED in `projects.html` (line 330)
- `profile.html` doesn't exist
- `user-profile.html` is the actual profile/account page

### Remember Me Flow Inconsistency
- **Status**: ✅ FIXED in `login.html` (lines 260-268)
- Now sets `savedUserRole` and `savedUser` when "Remember Me" checked
- Matches what `index.html` expects on landing page

### Reports Navigation
- **Status**: ✅ FIXED in `reports.html` (line 97)
- Changed Kanban Board link from `board.html` → `kanban-board.html`

---

## Summary Table

| File | Type | Status | Notes |
|------|------|--------|-------|
| `board.html` | Kanban (local) | ❌ DEPRECATED | Unused, use kanban-board.html |
| `kanban-board.html` | Kanban (API) | ✅ CANONICAL | Active, fully integrated |
| `sprints.html` | Scrum (local) | ❌ DEPRECATED | Unused, use scrum-board.html |
| `scrum-board.html` | Scrum (API) | ✅ CANONICAL | Active, fully integrated |
| `sprint.html` | Sprint Board (API) | ✅ ACTIVE | Interactive task management |
| `sprint-overview.html` | Sprint Info (local) | ✅ ACTIVE | Sprint progress overview |
| `scrum-updates.html` | Scrum Notes | ✅ ACTIVE | Meeting notes |
| `user-profile.html` | Profile | ✅ CANONICAL | User account page |
| `script.js` | Legacy JS | ❌ DEPRECATED | Only used by board.html |

---

## Recommendations

1. **Immediate (DONE)**:
   - ✅ Fixed profile.html broken link → user-profile.html
   - ✅ Fixed remember me flow (login saves savedUserRole/savedUser)
   - ✅ Fixed reports.html board reference → kanban-board.html

2. **Optional Future Cleanup** (not urgent):
   - Remove `board.html` (unused duplicate)
   - Remove `sprints.html` (unused duplicate)
   - Remove `script.js` (only used by deprecated board.html)

3. **Recommendation**: 
   - Archive deprecated files rather than delete immediately
   - This gives safety margin if references are discovered
   - Can delete 30 days after deployment if no issues arise

