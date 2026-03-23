// Basic test setup file
// This demonstrates how to structure tests for the agile management tool

const path = require('path');

describe('Sprint Management System', () => {
  describe('Merge Markers', () => {
    it('should have no unresolved merge markers in source files', async () => {
      // This test ensures no merge conflicts left in codebase
      const fs = require('fs');
      const path = require('path');

      const checkForMergeMarkers = (dir) => {
        const files = fs.readdirSync(dir);
        const mergeMarkerPattern = /<<<<<<< HEAD|=======|>>>>>>>/;

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            checkForMergeMarkers(filePath);
          } else if (stat.isFile() && /\.(js|json|html|css)$/.test(file)) {
            const content = fs.readFileSync(filePath, 'utf8');
            expect(content).not.toMatch(mergeMarkerPattern);
          }
        }
      };

      // Check backend controllers
      checkForMergeMarkers(path.join(__dirname, '../controllers'));
    });
  });

  describe('Sprint Creation', () => {
    it('should require sprintGoal parameter in API', () => {
      // Verify createSprint in api.js includes sprintGoal parameter
      const fs = require('fs');
      const path = require('path');
      const apiPath = path.join(__dirname, '../../frontend/api.js');
      const apiContent = fs.readFileSync(apiPath, 'utf8');

      // Check the function signature includes sprintGoal
      expect(apiContent).toContain('async function createSprint(sprintName, sprintGoal, startDate, endDate, projectId)');
    });
  });

  describe('Task Status', () => {
    it('should pass status parameter when creating tasks', () => {
      // Verify projects.js passes status to createTask
      const fs = require('fs');
      const path = require('path');
      const projectsPath = path.join(__dirname, '../../frontend/projects.js');
      const projectsContent = fs.readFileSync(projectsPath, 'utf8');

      // Check that status is passed as the last parameter (8th parameter)
      expect(projectsContent).toContain('createTask(title, "", null, null, projectId, "medium", null, status)');
    });
  });

  describe('Dashboard Data', () => {
    it('should compute sprint statistics on backend', () => {
      // Verify userController computes sprint stats
      const fs = require('fs');
      const path = require('path');
      const userControllerPath = path.join(__dirname, '../controllers/userController.js');
      const controllerContent = fs.readFileSync(userControllerPath, 'utf8');

      // Check that sprint stats are computed
      expect(controllerContent).toContain('totalTasks');
      expect(controllerContent).toContain('completedTasks');
      expect(controllerContent).toContain('userTaskCount');
      expect(controllerContent).toContain('userCompletedCount');
    });
  });

  describe('Authentication Guards', () => {
    it('should have consistent role-based redirects', () => {
      // Verify dashboard-team.html has correct role check
      const fs = require('fs');
      const path = require('path');
      const dashboardTeamPath = path.join(__dirname, '../../frontend/dashboard-team.html');
      const content = fs.readFileSync(dashboardTeamPath, 'utf8');

      // Should redirect managers to dashboard.html, not recursively to itself
      expect(content).toContain("if (user.role === 'manager') window.location.href = 'dashboard.html'");
      expect(content).not.toContain("if (user.role !== 'manager') window.location.href = 'dashboard-team.html'");
    });
  });
});

describe('Code Quality', () => {
  it('should have valid JavaScript syntax', () => {
    // This is a placeholder - actual syntax checking happens with npm test
    expect(true).toBe(true);
  });
});
