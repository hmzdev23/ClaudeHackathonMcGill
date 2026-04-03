import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { CREATE_TABLES_SQL } from '../lib/db/schema';

// ---------------------------------------------------------------------------
// Seed script — run with: npx tsx scripts/seed.ts
// ---------------------------------------------------------------------------

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'expense.db');

// Wipe existing DB so seed is idempotent
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(CREATE_TABLES_SQL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uid = () => crypto.randomUUID();
const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const currentQuarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
const employees = [
  { id: 'emp-001', name: 'Alice Chen', department: 'Engineering', role: 'manager', title: 'VP Engineering', approval_threshold: 1000 },
  { id: 'emp-002', name: 'Bob Martinez', department: 'Engineering', role: 'individual_contributor', title: 'Senior Engineer', approval_threshold: 500 },
  { id: 'emp-003', name: 'Carol Johnson', department: 'Sales', role: 'manager', title: 'Sales Director', approval_threshold: 800 },
  { id: 'emp-004', name: 'David Kim', department: 'Sales', role: 'individual_contributor', title: 'Account Executive', approval_threshold: 500 },
  { id: 'emp-005', name: 'Eve Patel', department: 'Marketing', role: 'individual_contributor', title: 'Marketing Specialist', approval_threshold: 500 },
  { id: 'emp-006', name: 'Frank Wilson', department: 'Marketing', role: 'manager', title: 'Marketing Director', approval_threshold: 800 },
  { id: 'emp-007', name: 'Grace Lee', department: 'Finance', role: 'executive', title: 'CFO', approval_threshold: 5000 },
];

const insertEmployee = db.prepare(
  `INSERT INTO employees (id, name, department, role, title, approval_threshold)
   VALUES (@id, @name, @department, @role, @title, @approval_threshold)`
);
for (const e of employees) insertEmployee.run(e);

// ---------------------------------------------------------------------------
// Transactions — realistic mix including edge cases
// ---------------------------------------------------------------------------
const transactions = [
  // Alice — typical manager expenses
  { employee_id: 'emp-001', employee_name: 'Alice Chen', department: 'Engineering', amount: 42.50, merchant: 'Uber Eats', category: 'meals', date: daysAgo(2), description: 'Lunch during sprint planning', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-001', employee_name: 'Alice Chen', department: 'Engineering', amount: 189.00, merchant: 'Delta Airlines', category: 'flights', date: daysAgo(10), description: 'Flight to SF for team offsite', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: 'sf-offsite-q1' },
  { employee_id: 'emp-001', employee_name: 'Alice Chen', department: 'Engineering', amount: 225.00, merchant: 'Marriott Hotels', category: 'hotels', date: daysAgo(9), description: 'Hotel for SF offsite (1 night)', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: 'sf-offsite-q1' },
  { employee_id: 'emp-001', employee_name: 'Alice Chen', department: 'Engineering', amount: 1200.00, merchant: 'AWS re:Invent', category: 'conference_registration', date: daysAgo(30), description: 'AWS re:Invent registration', status: 'approved', requires_approval: 1, attendee_count: 1, event_tag: null },

  // Bob — some suspicious patterns (split charges, round numbers)
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 95.00, merchant: 'Office Depot', category: 'office_supplies', date: daysAgo(3), description: 'Mechanical keyboard', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 100.00, merchant: 'Office Depot', category: 'office_supplies', date: daysAgo(3), description: 'Monitor stand', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 100.00, merchant: 'Office Depot', category: 'office_supplies', date: daysAgo(3), description: 'Desk lamp', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 150.00, merchant: 'Best Buy', category: 'equipment', date: daysAgo(5), description: 'USB-C hub', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 250.00, merchant: 'Best Buy', category: 'equipment', date: daysAgo(5), description: 'Webcam and mic', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 200.00, merchant: 'Best Buy', category: 'equipment', date: daysAgo(5), description: 'Headset', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-002', employee_name: 'Bob Martinez', department: 'Engineering', amount: 550.00, merchant: 'Udemy Business', category: 'training', date: daysAgo(15), description: 'Annual Udemy subscription', status: 'pending', requires_approval: 1, attendee_count: 1, event_tag: null },

  // Carol — high-spending sales
  { employee_id: 'emp-003', employee_name: 'Carol Johnson', department: 'Sales', amount: 285.00, merchant: 'Nobu Restaurant', category: 'meals', date: daysAgo(1), description: 'Client dinner with Acme Corp', status: 'approved', requires_approval: 0, attendee_count: 4, event_tag: null },
  { employee_id: 'emp-003', employee_name: 'Carol Johnson', department: 'Sales', amount: 750.00, merchant: 'United Airlines', category: 'flights', date: daysAgo(7), description: 'Flight to NYC for Acme meeting', status: 'approved', requires_approval: 1, attendee_count: 1, event_tag: 'nyc-acme-deal' },
  { employee_id: 'emp-003', employee_name: 'Carol Johnson', department: 'Sales', amount: 320.00, merchant: 'The Ritz-Carlton', category: 'hotels', date: daysAgo(6), description: 'NYC hotel — over per-night limit!', status: 'flagged', requires_approval: 1, attendee_count: 1, event_tag: 'nyc-acme-deal' },
  { employee_id: 'emp-003', employee_name: 'Carol Johnson', department: 'Sales', amount: 175.00, merchant: 'Ruth\'s Chris Steak House', category: 'entertainment', date: daysAgo(6), description: 'Client entertainment dinner', status: 'approved', requires_approval: 0, attendee_count: 2, event_tag: null },
  { employee_id: 'emp-003', employee_name: 'Carol Johnson', department: 'Sales', amount: 1800.00, merchant: 'Salesforce Dreamforce', category: 'conference_registration', date: daysAgo(20), description: 'Dreamforce conference — over limit!', status: 'pending', requires_approval: 1, attendee_count: 1, event_tag: null },

  // David — restricted merchant attempt!
  { employee_id: 'emp-004', employee_name: 'David Kim', department: 'Sales', amount: 65.00, merchant: 'Subway', category: 'meals', date: daysAgo(1), description: 'Team lunch', status: 'approved', requires_approval: 0, attendee_count: 2, event_tag: null },
  { employee_id: 'emp-004', employee_name: 'David Kim', department: 'Sales', amount: 350.00, merchant: 'Grand Vegas Casino Resort', category: 'hotels', date: daysAgo(4), description: 'Hotel during Vegas trade show', status: 'flagged', requires_approval: 1, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-004', employee_name: 'David Kim', department: 'Sales', amount: 89.99, merchant: 'Amazon', category: 'office_supplies', date: daysAgo(8), description: 'Portable charger and cables', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-004', employee_name: 'David Kim', department: 'Sales', amount: 89.99, merchant: 'Amazon', category: 'office_supplies', date: daysAgo(6), description: 'Portable charger and cables', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },

  // Eve — marketing events
  { employee_id: 'emp-005', employee_name: 'Eve Patel', department: 'Marketing', amount: 450.00, merchant: 'Canva Pro', category: 'software_saas', date: daysAgo(12), description: 'Annual Canva Pro subscription', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-005', employee_name: 'Eve Patel', department: 'Marketing', amount: 2500.00, merchant: 'HubSpot', category: 'software_saas', date: daysAgo(25), description: 'HubSpot Marketing Hub — way over limit!', status: 'pending', requires_approval: 1, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-005', employee_name: 'Eve Patel', department: 'Marketing', amount: 125.00, merchant: 'Facebook Ads', category: 'entertainment', date: daysAgo(3), description: 'Sponsored social post', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-005', employee_name: 'Eve Patel', department: 'Marketing', amount: 78.50, merchant: 'Panera Bread', category: 'meals', date: daysAgo(2), description: 'Team brainstorm lunch', status: 'approved', requires_approval: 0, attendee_count: 3, event_tag: null },

  // Frank — marketing manager
  { employee_id: 'emp-006', employee_name: 'Frank Wilson', department: 'Marketing', amount: 350.00, merchant: 'Google Ads', category: 'software_saas', date: daysAgo(5), description: 'Monthly ad spend', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: null },
  { employee_id: 'emp-006', employee_name: 'Frank Wilson', department: 'Marketing', amount: 156.00, merchant: 'Uber', category: 'transportation', date: daysAgo(2), description: 'Airport transfers for product launch event', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: 'product-launch-q1' },
  { employee_id: 'emp-006', employee_name: 'Frank Wilson', department: 'Marketing', amount: 890.00, merchant: 'American Airlines', category: 'flights', date: daysAgo(8), description: 'Flight to LA for product launch — over flight limit!', status: 'pending', requires_approval: 1, attendee_count: 1, event_tag: 'product-launch-q1' },
  { employee_id: 'emp-006', employee_name: 'Frank Wilson', department: 'Marketing', amount: 210.00, merchant: 'Hilton Hotels', category: 'hotels', date: daysAgo(7), description: 'LA hotel for product launch', status: 'approved', requires_approval: 0, attendee_count: 1, event_tag: 'product-launch-q1' },

  // Grace — CFO, minimal personal expenses
  { employee_id: 'emp-007', employee_name: 'Grace Lee', department: 'Finance', amount: 35.00, merchant: 'Starbucks', category: 'meals', date: daysAgo(1), description: 'Coffee with board advisor', status: 'approved', requires_approval: 0, attendee_count: 2, event_tag: null },
  { employee_id: 'emp-007', employee_name: 'Grace Lee', department: 'Finance', amount: 500.00, merchant: 'Bloomberg Terminal', category: 'software_saas', date: daysAgo(14), description: 'Monthly Bloomberg Terminal', status: 'approved', requires_approval: 1, attendee_count: 1, event_tag: null },
];

const insertTransaction = db.prepare(
  `INSERT INTO transactions (id, employee_id, employee_name, department, amount, merchant, category, date, description, status, requires_approval, attendee_count, event_tag)
   VALUES (@id, @employee_id, @employee_name, @department, @amount, @merchant, @category, @date, @description, @status, @requires_approval, @attendee_count, @event_tag)`
);
for (const t of transactions) {
  insertTransaction.run({ id: uid(), ...t });
}

// ---------------------------------------------------------------------------
// Budgets (current quarter)
// ---------------------------------------------------------------------------
const budgets = [
  { department: 'Engineering', category: 'total', period: currentQuarter, allocated: 25000, spent: 3101.50 },
  { department: 'Engineering', category: 'equipment', period: currentQuarter, allocated: 5000, spent: 600 },
  { department: 'Engineering', category: 'training', period: currentQuarter, allocated: 3000, spent: 550 },
  { department: 'Engineering', category: 'travel', period: currentQuarter, allocated: 8000, spent: 414 },
  { department: 'Sales', category: 'total', period: currentQuarter, allocated: 40000, spent: 3734.98 },
  { department: 'Sales', category: 'travel', period: currentQuarter, allocated: 15000, spent: 1070 },
  { department: 'Sales', category: 'entertainment', period: currentQuarter, allocated: 5000, spent: 175 },
  { department: 'Marketing', category: 'total', period: currentQuarter, allocated: 30000, spent: 4759.50 },
  { department: 'Marketing', category: 'software_saas', period: currentQuarter, allocated: 8000, spent: 3300 },
  { department: 'Marketing', category: 'travel', period: currentQuarter, allocated: 6000, spent: 1256 },
  { department: 'Finance', category: 'total', period: currentQuarter, allocated: 10000, spent: 535 },
];

const insertBudget = db.prepare(
  `INSERT INTO budgets (id, department, category, period, allocated, spent)
   VALUES (@id, @department, @category, @period, @allocated, @spent)`
);
for (const b of budgets) {
  insertBudget.run({ id: uid(), ...b });
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------
const violations = [
  { transaction_id: 'v-placeholder-1', employee_id: 'emp-003', violation_type: 'over_limit' as const, severity: 'medium' as const, description: 'Hotel expense at The Ritz-Carlton ($320) exceeds per-night limit of $250', detected_at: daysAgo(6), status: 'open' },
  { transaction_id: 'v-placeholder-2', employee_id: 'emp-004', violation_type: 'restricted_merchant' as const, severity: 'critical' as const, description: 'Transaction at Grand Vegas Casino Resort — restricted merchant (gambling/casino keyword detected)', detected_at: daysAgo(4), status: 'open' },
  { transaction_id: 'v-placeholder-3', employee_id: 'emp-005', violation_type: 'over_limit' as const, severity: 'high' as const, description: 'HubSpot subscription ($2,500) exceeds software/SaaS limit of $500 by 400%', detected_at: daysAgo(25), status: 'open' },
  { transaction_id: 'v-placeholder-4', employee_id: 'emp-003', violation_type: 'over_limit' as const, severity: 'medium' as const, description: 'Dreamforce registration ($1,800) exceeds conference limit of $1,500', detected_at: daysAgo(20), status: 'open' },
  { transaction_id: 'v-placeholder-5', employee_id: 'emp-006', violation_type: 'over_limit' as const, severity: 'low' as const, description: 'Flight to LA ($890) exceeds flight limit of $800', detected_at: daysAgo(8), status: 'open' },
  { transaction_id: 'v-placeholder-6', employee_id: 'emp-002', violation_type: 'split_charge' as const, severity: 'high' as const, description: '3 transactions at Office Depot on same day totaling $295 — possible split to avoid approval threshold', detected_at: daysAgo(3), status: 'open' },
  { transaction_id: 'v-placeholder-7', employee_id: 'emp-002', violation_type: 'split_charge' as const, severity: 'high' as const, description: '3 transactions at Best Buy on same day totaling $600 — possible split to avoid approval threshold', detected_at: daysAgo(5), status: 'open' },
];

const insertViolation = db.prepare(
  `INSERT INTO violations (id, transaction_id, employee_id, violation_type, severity, description, detected_at, status)
   VALUES (@id, @transaction_id, @employee_id, @violation_type, @severity, @description, @detected_at, @status)`
);
for (const v of violations) {
  insertViolation.run({ id: uid(), ...v });
}

// ---------------------------------------------------------------------------
// Approvals (pending items for the approval queue)
// ---------------------------------------------------------------------------
const approvals = [
  {
    transaction_id: 'a-placeholder-1', employee_id: 'emp-002', amount: 550, merchant: 'Udemy Business',
    description: 'Annual Udemy subscription', ai_recommendation: 'approve' as const,
    ai_reasoning: 'Training expense within typical range. Employee has no prior violations for training. Slightly over $500 limit but reasonable for annual subscription.',
    context_packet: JSON.stringify({ employee_history: 'No prior training expenses', department_avg: 420 }),
    status: 'pending', created_at: daysAgo(15), resolved_at: null,
  },
  {
    transaction_id: 'a-placeholder-2', employee_id: 'emp-003', amount: 1800, merchant: 'Salesforce Dreamforce',
    description: 'Dreamforce conference — over limit!', ai_recommendation: 'deny' as const,
    ai_reasoning: 'Conference registration at $1,800 exceeds limit of $1,500 by 20%. Employee Carol Johnson already has 2 open violations. Recommend denial unless manager provides business justification.',
    context_packet: JSON.stringify({ violations: 2, recent_spending: 3734.98, dept_budget_pct: 45 }),
    status: 'pending', created_at: daysAgo(20), resolved_at: null,
  },
  {
    transaction_id: 'a-placeholder-3', employee_id: 'emp-005', amount: 2500, merchant: 'HubSpot',
    description: 'HubSpot Marketing Hub — way over limit!', ai_recommendation: 'deny' as const,
    ai_reasoning: 'Software expense at $2,500 is 5x the $500 SaaS limit. This appears to be a department-level subscription that should go through procurement, not individual expense. Recommend denial with redirect to procurement process.',
    context_packet: JSON.stringify({ dept_software_budget: 8000, dept_software_spent: 3300, pct_used: 41 }),
    status: 'pending', created_at: daysAgo(25), resolved_at: null,
  },
  {
    transaction_id: 'a-placeholder-4', employee_id: 'emp-006', amount: 890, merchant: 'American Airlines',
    description: 'Flight to LA for product launch — over flight limit!', ai_recommendation: 'approve' as const,
    ai_reasoning: 'Flight at $890 is $90 over the $800 limit (11% over). The product launch is a legitimate business event. Frank Wilson is a manager with a clean record. The overage is minimal and the trip is justified.',
    context_packet: JSON.stringify({ event: 'product-launch-q1', violation_history: 0, dept_travel_budget_pct: 21 }),
    status: 'pending', created_at: daysAgo(8), resolved_at: null,
  },
];

const insertApproval = db.prepare(
  `INSERT INTO approvals (id, transaction_id, employee_id, amount, merchant, description, ai_recommendation, ai_reasoning, context_packet, status, created_at, resolved_at)
   VALUES (@id, @transaction_id, @employee_id, @amount, @merchant, @description, @ai_recommendation, @ai_reasoning, @context_packet, @status, @created_at, @resolved_at)`
);
for (const a of approvals) {
  insertApproval.run({ id: uid(), ...a });
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------
const anomalies = [
  { type: 'split_charge' as const, transaction_ids: 'bob-office-depot-split', employee_id: 'emp-002', description: 'Bob Martinez: 3 charges at Office Depot on the same day ($95 + $100 + $100 = $295). Possible split to stay under $200 office supplies limit.', severity: 'high' as const, detected_at: daysAgo(3), status: 'open' },
  { type: 'split_charge' as const, transaction_ids: 'bob-bestbuy-split', employee_id: 'emp-002', description: 'Bob Martinez: 3 charges at Best Buy on the same day ($150 + $250 + $200 = $600). Possible split to avoid $500 approval threshold.', severity: 'high' as const, detected_at: daysAgo(5), status: 'open' },
  { type: 'duplicate' as const, transaction_ids: 'david-amazon-dup', employee_id: 'emp-004', description: 'David Kim: Duplicate $89.99 charge at Amazon for "Portable charger and cables" — 2 days apart. Likely duplicate submission.', severity: 'medium' as const, detected_at: daysAgo(6), status: 'open' },
  { type: 'round_number' as const, transaction_ids: 'bob-round-numbers', employee_id: 'emp-002', description: 'Bob Martinez: 5 of 7 recent transactions are exact round numbers ($95, $100, $100, $150, $250, $200, $550). Statistically unusual pattern.', severity: 'medium' as const, detected_at: daysAgo(3), status: 'open' },
  { type: 'unusual_merchant' as const, transaction_ids: 'david-casino', employee_id: 'emp-004', description: 'David Kim: Transaction at "Grand Vegas Casino Resort" — first-ever casino merchant across entire company.', severity: 'critical' as const, detected_at: daysAgo(4), status: 'open' },
];

const insertAnomaly = db.prepare(
  `INSERT INTO anomalies (id, type, transaction_ids, employee_id, description, severity, detected_at, status)
   VALUES (@id, @type, @transaction_ids, @employee_id, @description, @severity, @detected_at, @status)`
);
for (const a of anomalies) {
  insertAnomaly.run({ id: uid(), ...a });
}

db.close();
console.log('✅ Seed complete — populated 7 tables with demo data');
console.log(`   Database: ${dbPath}`);
