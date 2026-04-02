const fs = require("fs");
const path = require("path");

describe("Regression Guards", () => {
  it("task controller should enforce manager checks on sensitive actions", () => {
    const controllerPath = path.join(__dirname, "../controllers/taskController.js");
    const content = fs.readFileSync(controllerPath, "utf8");

    expect(content).toContain("verifyProjectManagerAccess(projectId, userId, req.user.role)");
    expect(content).toContain("verifyProjectManagerAccess(task.projectId, userId, req.user.role)");
    expect(content).toContain("Only project managers can perform this action");
  });

  it("task controller should validate enums and required title", () => {
    const controllerPath = path.join(__dirname, "../controllers/taskController.js");
    const content = fs.readFileSync(controllerPath, "utf8");

    expect(content).toContain("const VALID_TASK_STATUSES");
    expect(content).toContain("const VALID_TASK_PRIORITIES");
    expect(content).toContain("const VALID_TASK_TYPES");
    expect(content).toContain("requireNonEmptyString(title, \"Task title\")");
  });

  it("frontend auth pages should not hardcode localhost API URLs", () => {
    const loginPath = path.join(__dirname, "../../frontend/login.html");
    const signupPath = path.join(__dirname, "../../frontend/signup.html");
    const login = fs.readFileSync(loginPath, "utf8");
    const signup = fs.readFileSync(signupPath, "utf8");

    expect(login).toContain("resolveApiBaseUrl()");
    expect(signup).toContain("resolveApiBaseUrl()");
    expect(login).not.toContain("http://localhost:5000/api/auth/login");
    expect(signup).not.toContain("http://localhost:5000/api/auth/signup");
  });
});
