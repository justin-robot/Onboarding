-- PM Agent Schema for tasks.db
-- Initialize with: sqlite3 .pm/tasks.db < .pm/schema.sql

-- Drop existing tables if reinitializing
DROP TABLE IF EXISTS task_dependencies;
DROP TABLE IF EXISTS tasks;

-- Tasks table
CREATE TABLE tasks (
  sprint TEXT NOT NULL,
  task_num INTEGER NOT NULL,
  spec TEXT,                          -- Spec file name (e.g., '01-workspace-crud.md')
  title TEXT NOT NULL,
  description TEXT,
  done_when TEXT NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending | red | green | blocked
  blocked_reason TEXT,
  type TEXT,                          -- database | actions | frontend | infra | agent | e2e | docs
  owner TEXT,
  skills TEXT,                        -- Comma-separated skills to invoke
  pattern_audited BOOLEAN DEFAULT FALSE,
  pattern_audit_notes TEXT,
  skills_updated BOOLEAN DEFAULT FALSE,
  skills_update_notes TEXT,
  tests_pass BOOLEAN DEFAULT FALSE,
  testing_posture TEXT,               -- Grade: A, B, C, D, F
  verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sprint, task_num)
);

-- Task dependencies table
CREATE TABLE task_dependencies (
  sprint TEXT NOT NULL,
  task_num INTEGER NOT NULL,
  depends_on_sprint TEXT NOT NULL,
  depends_on_task INTEGER NOT NULL,
  PRIMARY KEY (sprint, task_num, depends_on_sprint, depends_on_task),
  FOREIGN KEY (sprint, task_num) REFERENCES tasks(sprint, task_num),
  FOREIGN KEY (depends_on_sprint, depends_on_task) REFERENCES tasks(sprint, task_num)
);

-- View: Available tasks (pending with no unfinished dependencies)
CREATE VIEW available_tasks AS
SELECT t.*
FROM tasks t
WHERE t.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM task_dependencies d
    JOIN tasks dep ON d.depends_on_sprint = dep.sprint AND d.depends_on_task = dep.task_num
    WHERE d.sprint = t.sprint AND d.task_num = t.task_num
      AND dep.status != 'green'
  );

-- View: Blocked tasks
CREATE VIEW blocked_tasks AS
SELECT t.*, t.blocked_reason as reason
FROM tasks t
WHERE t.status = 'blocked';

-- View: Sprint progress
CREATE VIEW sprint_progress AS
SELECT
  sprint,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'green' THEN 1 ELSE 0 END) as green,
  SUM(CASE WHEN status = 'red' THEN 1 ELSE 0 END) as red,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
  SUM(CASE WHEN pattern_audited = 1 THEN 1 ELSE 0 END) as audited,
  SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified,
  ROUND(100.0 * SUM(CASE WHEN status = 'green' THEN 1 ELSE 0 END) / COUNT(*), 1) as percent_complete
FROM tasks
GROUP BY sprint;

-- View: Tasks needing pattern audit (green but not audited)
CREATE VIEW needs_pattern_audit AS
SELECT *
FROM tasks
WHERE status = 'green' AND pattern_audited = FALSE;

-- View: Tasks needing verification
CREATE VIEW needs_verification AS
SELECT *
FROM tasks
WHERE status = 'green' AND verified = FALSE;

-- Indexes for common queries
CREATE INDEX idx_tasks_sprint_status ON tasks(sprint, status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_deps_task ON task_dependencies(sprint, task_num);
CREATE INDEX idx_deps_depends_on ON task_dependencies(depends_on_sprint, depends_on_task);
