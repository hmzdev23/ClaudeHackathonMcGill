export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  amount REAL NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  attendee_count INTEGER NOT NULL DEFAULT 1,
  event_tag TEXT
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'individual_contributor', 'executive')),
  title TEXT NOT NULL,
  approval_threshold REAL NOT NULL DEFAULT 500
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  period TEXT NOT NULL,
  allocated REAL NOT NULL,
  spent REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('over_limit', 'restricted_merchant', 'context_violation', 'split_charge')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  amount REAL NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  ai_recommendation TEXT CHECK (ai_recommendation IN ('approve', 'deny')),
  ai_reasoning TEXT,
  context_packet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS expense_reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  event_tag TEXT,
  transaction_ids TEXT NOT NULL,
  total_amount REAL NOT NULL,
  policy_status TEXT NOT NULL CHECK (policy_status IN ('clean', 'violations_present')),
  narrative TEXT,
  generated_at TEXT NOT NULL,
  cfo_approved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('split_charge', 'duplicate', 'round_number', 'velocity', 'unusual_merchant')),
  transaction_ids TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_violations_employee ON violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
`;
