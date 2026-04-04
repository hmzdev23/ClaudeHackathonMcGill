import { getDb } from './index';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  description: string;
  status: string;
  requires_approval: number;
  attendee_count: number;
  event_tag: string | null;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  title: string;
  approval_threshold: number;
}

export interface Budget {
  id: string;
  department: string;
  category: string;
  period: string;
  allocated: number;
  spent: number;
}

export interface Violation {
  id: string;
  transaction_id: string;
  employee_id: string;
  violation_type: string;
  severity: string;
  description: string;
  detected_at: string;
  status: string;
}

export interface Approval {
  id: string;
  transaction_id: string;
  employee_id: string;
  amount: number;
  merchant: string;
  description: string;
  ai_recommendation: string;
  ai_reasoning: string;
  context_packet: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ExpenseReport {
  id: string;
  title: string;
  employee_id: string;
  employee_name: string;
  event_tag: string | null;
  transaction_ids: string;
  total_amount: number;
  policy_status: string;
  narrative: string | null;
  generated_at: string;
  cfo_approved: number;
}

export interface Anomaly {
  id: string;
  type: string;
  transaction_ids: string;
  employee_id: string;
  description: string;
  severity: string;
  detected_at: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Aggregated row type (for GROUP BY results)
// ---------------------------------------------------------------------------

export interface AggregatedRow {
  [key: string]: string | number | null;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface TransactionFilters {
  department?: string;
  employee_id?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  status?: string;
  merchant?: string;
}

export interface ViolationFilters {
  employee_id?: string;
  violation_type?: string;
  severity?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface AnomalyFilters {
  employee_id?: string;
  type?: string;
  severity?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

function getQuarterDateRange(period: string): { start: string; end: string } {
  // period looks like "2026-Q1"
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (!match) {
    throw new Error(`Invalid period format: ${period}. Expected YYYY-QN`);
  }
  const year = parseInt(match[1], 10);
  const q = parseInt(match[2], 10);
  const startMonth = (q - 1) * 3; // 0-indexed
  const endMonth = startMonth + 2;

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0); // last day of end month

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { start: fmt(start), end: fmt(end) };
}

function getDaysElapsedInQuarter(period: string): { elapsed: number; total: number } {
  const { start, end } = getQuarterDateRange(period);
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date();

  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = Math.min(now.getTime(), endDate.getTime()) - startDate.getTime();

  const total = Math.ceil(totalMs / (1000 * 60 * 60 * 24)) + 1;
  const elapsed = Math.max(1, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)));

  return { elapsed, total };
}

// ---------------------------------------------------------------------------
// queryTransactions
// ---------------------------------------------------------------------------

export function queryTransactions(
  filters: TransactionFilters = {},
  options: {
    group_by?: string;
    order_by?: string;
    limit?: number;
  } = {}
): Transaction[] | AggregatedRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.department) {
    conditions.push('department = @department');
    params.department = filters.department;
  }
  if (filters.employee_id) {
    conditions.push('employee_id = @employee_id');
    params.employee_id = filters.employee_id;
  }
  if (filters.category) {
    conditions.push('category = @category');
    params.category = filters.category;
  }
  if (filters.date_from) {
    conditions.push('date >= @date_from');
    params.date_from = filters.date_from;
  }
  if (filters.date_to) {
    conditions.push('date <= @date_to');
    params.date_to = filters.date_to;
  }
  if (filters.min_amount !== undefined) {
    conditions.push('amount >= @min_amount');
    params.min_amount = filters.min_amount;
  }
  if (filters.max_amount !== undefined) {
    conditions.push('amount <= @max_amount');
    params.max_amount = filters.max_amount;
  }
  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
  }
  if (filters.merchant) {
    conditions.push('merchant LIKE @merchant');
    params.merchant = `%${filters.merchant}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  if (options.group_by) {
    // Validate group_by column against allowed columns to prevent injection
    const allowedGroupBy = [
      'department',
      'employee_id',
      'employee_name',
      'category',
      'merchant',
      'status',
      'date',
      'event_tag',
    ];
    if (!allowedGroupBy.includes(options.group_by)) {
      throw new Error(`Invalid group_by column: ${options.group_by}`);
    }
    const col = options.group_by;
    const sql = `
      SELECT ${col}, COUNT(*) as count, SUM(amount) as total_amount, AVG(amount) as avg_amount
      FROM transactions
      ${whereClause}
      GROUP BY ${col}
      ${options.order_by ? `ORDER BY ${options.order_by}` : 'ORDER BY total_amount DESC'}
      ${options.limit ? `LIMIT ${Number(options.limit)}` : ''}
    `;
    return db.prepare(sql).all(params) as AggregatedRow[];
  }

  // Validate order_by if provided
  const orderClause = options.order_by
    ? `ORDER BY ${options.order_by}`
    : 'ORDER BY date DESC';

  const sql = `
    SELECT * FROM transactions
    ${whereClause}
    ${orderClause}
    ${options.limit ? `LIMIT ${Number(options.limit)}` : ''}
  `;

  return db.prepare(sql).all(params) as Transaction[];
}

// ---------------------------------------------------------------------------
// getEmployeeProfile
// ---------------------------------------------------------------------------

export interface EmployeeProfile {
  employee: Employee | null;
  transactions: Transaction[];
  top_categories: Array<{ category: string; total: number; count: number }>;
  violation_count: number;
  avg_transaction: number;
  total_spent: number;
  peer_avg: number;
}

export function getEmployeeProfile(
  employee_id: string,
  lookback_days: number = 90,
  include_violations: boolean = true
): EmployeeProfile {
  const db = getDb();

  const employee = db
    .prepare('SELECT * FROM employees WHERE id = @employee_id')
    .get({ employee_id }) as Employee | undefined;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookback_days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const transactions = db
    .prepare(
      'SELECT * FROM transactions WHERE employee_id = @employee_id AND date >= @cutoff ORDER BY date DESC'
    )
    .all({ employee_id, cutoff }) as Transaction[];

  const top_categories = db
    .prepare(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE employee_id = @employee_id AND date >= @cutoff
       GROUP BY category
       ORDER BY total DESC`
    )
    .all({ employee_id, cutoff }) as Array<{ category: string; total: number; count: number }>;

  const violationRow = include_violations
    ? (db
        .prepare(
          'SELECT COUNT(*) as cnt FROM violations WHERE employee_id = @employee_id'
        )
        .get({ employee_id }) as { cnt: number })
    : { cnt: 0 };

  const total_spent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avg_transaction = transactions.length > 0 ? total_spent / transactions.length : 0;

  // Peer average: average total spend for employees in the same department over the same lookback
  let peer_avg = 0;
  if (employee) {
    const peerRow = db
      .prepare(
        `SELECT AVG(emp_total) as avg_total FROM (
           SELECT employee_id, SUM(amount) as emp_total
           FROM transactions
           WHERE department = @department AND date >= @cutoff
           GROUP BY employee_id
         )`
      )
      .get({ department: employee.department, cutoff }) as { avg_total: number | null } | undefined;
    peer_avg = peerRow?.avg_total ?? 0;
  }

  return {
    employee: employee ?? null,
    transactions,
    top_categories,
    violation_count: violationRow.cnt,
    avg_transaction: Math.round(avg_transaction * 100) / 100,
    total_spent: Math.round(total_spent * 100) / 100,
    peer_avg: Math.round(peer_avg * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// getBudgetStatus
// ---------------------------------------------------------------------------

export interface BudgetStatus {
  department: string;
  category: string;
  period: string;
  allocated: number;
  spent: number;
  remaining: number;
  percent_used: number;
  projected_end_of_period: number;
}

export function getBudgetStatus(department?: string, period?: string): BudgetStatus[] {
  const db = getDb();
  const effectivePeriod = period ?? getCurrentQuarter();

  const conditions: string[] = ['period = @period'];
  const params: Record<string, string> = { period: effectivePeriod };

  if (department) {
    conditions.push('department = @department');
    params.department = department;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const budgets = db
    .prepare(`SELECT * FROM budgets ${whereClause}`)
    .all(params) as Budget[];

  const { elapsed, total } = getDaysElapsedInQuarter(effectivePeriod);

  return budgets.map((b) => {
    const remaining = b.allocated - b.spent;
    const percent_used = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
    const projected_end_of_period =
      elapsed > 0 ? (b.spent / elapsed) * total : 0;

    return {
      department: b.department,
      category: b.category,
      period: b.period,
      allocated: b.allocated,
      spent: b.spent,
      remaining: Math.round(remaining * 100) / 100,
      percent_used: Math.round(percent_used * 100) / 100,
      projected_end_of_period: Math.round(projected_end_of_period * 100) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// getViolationsSummary
// ---------------------------------------------------------------------------

export interface ViolationsSummary {
  violations: Violation[];
  repeat_offenders: Array<{ employee_id: string; name: string; count: number }>;
}

export function getViolationsSummary(filters: ViolationFilters = {}): ViolationsSummary {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.employee_id) {
    conditions.push('v.employee_id = @employee_id');
    params.employee_id = filters.employee_id;
  }
  if (filters.violation_type) {
    conditions.push('v.violation_type = @violation_type');
    params.violation_type = filters.violation_type;
  }
  if (filters.severity) {
    conditions.push('v.severity = @severity');
    params.severity = filters.severity;
  }
  if (filters.status) {
    conditions.push('v.status = @status');
    params.status = filters.status;
  }
  if (filters.date_from) {
    conditions.push('v.detected_at >= @date_from');
    params.date_from = filters.date_from;
  }
  if (filters.date_to) {
    conditions.push('v.detected_at <= @date_to');
    params.date_to = filters.date_to;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const violations = db
    .prepare(`SELECT v.* FROM violations v ${whereClause} ORDER BY v.detected_at DESC`)
    .all(params) as Violation[];

  const repeat_offenders = db
    .prepare(
      `SELECT v.employee_id, COALESCE(e.name, v.employee_id) as name, COUNT(*) as count
       FROM violations v
       LEFT JOIN employees e ON e.id = v.employee_id
       ${whereClause}
       GROUP BY v.employee_id
       HAVING count >= 2
       ORDER BY count DESC`
    )
    .all(params) as Array<{ employee_id: string; name: string; count: number }>;

  return { violations, repeat_offenders };
}

// ---------------------------------------------------------------------------
// getAnomalies
// ---------------------------------------------------------------------------

export function getAnomalies(filters: AnomalyFilters = {}): Anomaly[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.employee_id) {
    conditions.push('employee_id = @employee_id');
    params.employee_id = filters.employee_id;
  }
  if (filters.type) {
    conditions.push('type = @type');
    params.type = filters.type;
  }
  if (filters.severity) {
    conditions.push('severity = @severity');
    params.severity = filters.severity;
  }
  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(`SELECT * FROM anomalies ${whereClause} ORDER BY detected_at DESC`)
    .all(params) as Anomaly[];
}

// ---------------------------------------------------------------------------
// Insert / Update operations
// ---------------------------------------------------------------------------

export function insertViolation(violation: Omit<Violation, 'id'>): void {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO violations (id, transaction_id, employee_id, violation_type, severity, description, detected_at, status)
     VALUES (@id, @transaction_id, @employee_id, @violation_type, @severity, @description, @detected_at, @status)`
  ).run({ id, ...violation });
}

export function insertApproval(approval: Omit<Approval, 'id'>): void {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO approvals (id, transaction_id, employee_id, amount, merchant, description, ai_recommendation, ai_reasoning, context_packet, status, created_at, resolved_at)
     VALUES (@id, @transaction_id, @employee_id, @amount, @merchant, @description, @ai_recommendation, @ai_reasoning, @context_packet, @status, @created_at, @resolved_at)`
  ).run({ id, ...approval });
}

export function updateApprovalStatus(id: string, status: 'approved' | 'denied'): void {
  const db = getDb();
  const resolved_at = new Date().toISOString();
  db.prepare(
    `UPDATE approvals SET status = @status, resolved_at = @resolved_at WHERE id = @id`
  ).run({ id, status, resolved_at });
}

export function insertExpenseReport(report: Omit<ExpenseReport, 'id'>): string {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO expense_reports (id, title, employee_id, employee_name, event_tag, transaction_ids, total_amount, policy_status, narrative, generated_at, cfo_approved)
     VALUES (@id, @title, @employee_id, @employee_name, @event_tag, @transaction_ids, @total_amount, @policy_status, @narrative, @generated_at, @cfo_approved)`
  ).run({ id, ...report });
  return id;
}

export function insertAnomaly(anomaly: Omit<Anomaly, 'id'>): void {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO anomalies (id, type, transaction_ids, employee_id, description, severity, detected_at, status)
     VALUES (@id, @type, @transaction_ids, @employee_id, @description, @severity, @detected_at, @status)`
  ).run({ id, ...anomaly });
}

export function updateBudgetSpent(department: string, period: string, amount: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE budgets SET spent = spent + @amount WHERE department = @department AND period = @period`
  ).run({ department, period, amount });
}

// ---------------------------------------------------------------------------
// getDashboardKpis
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  total_spend_qtd: number;
  pending_approvals: number;
  open_violations: number;
  departments_over_80pct: number;
}

export function getDashboardKpis(): DashboardKpis {
  const db = getDb();
  const currentPeriod = getCurrentQuarter();
  const { start, end } = getQuarterDateRange(currentPeriod);

  const spendRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE date >= @start AND date <= @end`
    )
    .get({ start, end }) as { total: number };

  const pendingRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM approvals WHERE status = 'pending'`)
    .get() as { cnt: number };

  const violationsRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM violations WHERE status = 'open'`)
    .get() as { cnt: number };

  const deptOverRow = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM (
         SELECT department
         FROM budgets
         WHERE period = @period AND category = 'total' AND allocated > 0
         AND (spent / allocated) >= 0.8
       )`
    )
    .get({ period: currentPeriod }) as { cnt: number };

  return {
    total_spend_qtd: Math.round(spendRow.total * 100) / 100,
    pending_approvals: pendingRow.cnt,
    open_violations: violationsRow.cnt,
    departments_over_80pct: deptOverRow.cnt,
  };
}

// ---------------------------------------------------------------------------
// getTransactionsForReport
// ---------------------------------------------------------------------------

export function getTransactionsForReport(
  employee_id: string,
  event_tag?: string
): Transaction[] {
  const db = getDb();

  if (event_tag) {
    return db
      .prepare(
        `SELECT * FROM transactions
         WHERE employee_id = @employee_id AND event_tag = @event_tag
         ORDER BY date ASC`
      )
      .all({ employee_id, event_tag }) as Transaction[];
  }

  // No event_tag: return all transactions for the employee
  return db
    .prepare(
      `SELECT * FROM transactions
       WHERE employee_id = @employee_id
       ORDER BY date ASC`
    )
    .all({ employee_id }) as Transaction[];
}

// ---------------------------------------------------------------------------
// Anomaly Detection Functions
// ---------------------------------------------------------------------------

export interface SplitChargeResult {
  employee_id: string;
  employee_name: string;
  date: string;
  merchant: string;
  total: number;
  transactions: Transaction[];
}

export function detectSplitCharges(): SplitChargeResult[] {
  const db = getDb();

  // Find same employee, same merchant, same day with 2+ transactions that together exceed $500
  const groups = db
    .prepare(
      `SELECT employee_id, employee_name, date, merchant, SUM(amount) as total, COUNT(*) as cnt
       FROM transactions
       GROUP BY employee_id, merchant, date
       HAVING cnt >= 2 AND total > 500
       ORDER BY total DESC`
    )
    .all() as Array<{
    employee_id: string;
    employee_name: string;
    date: string;
    merchant: string;
    total: number;
    cnt: number;
  }>;

  return groups.map((g) => {
    const txns = db
      .prepare(
        `SELECT * FROM transactions
         WHERE employee_id = @employee_id AND merchant = @merchant AND date = @date
         ORDER BY amount ASC`
      )
      .all({
        employee_id: g.employee_id,
        merchant: g.merchant,
        date: g.date,
      }) as Transaction[];

    return {
      employee_id: g.employee_id,
      employee_name: g.employee_name,
      date: g.date,
      merchant: g.merchant,
      total: Math.round(g.total * 100) / 100,
      transactions: txns,
    };
  });
}

export interface DuplicateResult {
  employee_id: string;
  employee_name: string;
  t1_id: string;
  t2_id: string;
  merchant: string;
  amount: number;
  days_apart: number;
}

export function detectDuplicates(): DuplicateResult[] {
  const db = getDb();

  // Same employee, same merchant, same amount, within 3 days
  return db
    .prepare(
      `SELECT
         t1.employee_id,
         t1.employee_name,
         t1.id as t1_id,
         t2.id as t2_id,
         t1.merchant,
         t1.amount,
         CAST(julianday(t2.date) - julianday(t1.date) AS INTEGER) as days_apart
       FROM transactions t1
       JOIN transactions t2
         ON t1.employee_id = t2.employee_id
         AND t1.merchant = t2.merchant
         AND t1.amount = t2.amount
         AND t1.id < t2.id
         AND ABS(julianday(t2.date) - julianday(t1.date)) <= 3
       ORDER BY t1.date DESC`
    )
    .all() as DuplicateResult[];
}

export interface RoundNumberResult {
  employee_id: string;
  employee_name: string;
  count: number;
  transactions: Transaction[];
}

export function detectRoundNumbers(): RoundNumberResult[] {
  const db = getDb();

  // Employees with many round-number transactions (amount % 50 == 0 and amount > 0)
  const groups = db
    .prepare(
      `SELECT employee_id, employee_name, COUNT(*) as count
       FROM transactions
       WHERE amount > 0 AND CAST(amount AS INTEGER) = amount AND CAST(amount AS INTEGER) % 50 = 0
       GROUP BY employee_id
       HAVING count >= 3
       ORDER BY count DESC`
    )
    .all() as Array<{ employee_id: string; employee_name: string; count: number }>;

  return groups.map((g) => {
    const txns = db
      .prepare(
        `SELECT * FROM transactions
         WHERE employee_id = @employee_id
           AND amount > 0
           AND CAST(amount AS INTEGER) = amount
           AND CAST(amount AS INTEGER) % 50 = 0
         ORDER BY date DESC`
      )
      .all({ employee_id: g.employee_id }) as Transaction[];

    return {
      employee_id: g.employee_id,
      employee_name: g.employee_name,
      count: g.count,
      transactions: txns,
    };
  });
}

export interface VelocitySpikeResult {
  employee_id: string;
  employee_name: string;
  spike_date: string;
  daily_spend: number;
  avg_daily: number;
}

export function detectVelocitySpikes(): VelocitySpikeResult[] {
  const db = getDb();

  // For each employee, find days where spending is 3x their average daily spend
  return db
    .prepare(
      `WITH daily_spend AS (
         SELECT employee_id, employee_name, date, SUM(amount) as daily_total
         FROM transactions
         GROUP BY employee_id, date
       ),
       employee_avg AS (
         SELECT employee_id, AVG(daily_total) as avg_daily
         FROM daily_spend
         GROUP BY employee_id
         HAVING COUNT(*) >= 3
       )
       SELECT
         ds.employee_id,
         ds.employee_name,
         ds.date as spike_date,
         ROUND(ds.daily_total, 2) as daily_spend,
         ROUND(ea.avg_daily, 2) as avg_daily
       FROM daily_spend ds
       JOIN employee_avg ea ON ds.employee_id = ea.employee_id
       WHERE ds.daily_total >= ea.avg_daily * 3
         AND ea.avg_daily > 0
       ORDER BY ds.daily_total DESC`
    )
    .all() as VelocitySpikeResult[];
}

export interface UnusualMerchantResult {
  employee_id: string;
  employee_name: string;
  transaction: Transaction;
}

export function detectUnusualMerchants(): UnusualMerchantResult[] {
  const db = getDb();

  // A merchant is "unusual" if it only appears once across all transactions
  // and the employee's department has never used it
  const rows = db
    .prepare(
      `SELECT t.*
       FROM transactions t
       WHERE t.merchant IN (
         SELECT merchant FROM transactions GROUP BY merchant HAVING COUNT(*) = 1
       )
       ORDER BY t.date DESC`
    )
    .all() as Transaction[];

  return rows.map((t) => ({
    employee_id: t.employee_id,
    employee_name: t.employee_name,
    transaction: t,
  }));
}

// ---------------------------------------------------------------------------
// Chart data queries
// ---------------------------------------------------------------------------

export interface MonthlySpend {
  month: string;  // "YYYY-MM"
  total: number;
}

export interface CategorySpend {
  category: string;
  total: number;
}

export interface DepartmentSpend {
  department: string;
  total: number;
}

export function getMonthlySpend(): MonthlySpend[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', date) as month,
              ROUND(SUM(amount), 2) as total
       FROM transactions
       GROUP BY month
       ORDER BY month`
    )
    .all() as MonthlySpend[];
  return rows;
}

export function getCategorySpend(): CategorySpend[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT category, ROUND(SUM(amount), 2) as total
       FROM transactions
       GROUP BY category
       ORDER BY total DESC
       LIMIT 8`
    )
    .all() as CategorySpend[];
  return rows;
}

export function getDepartmentSpend(): DepartmentSpend[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT department, ROUND(SUM(amount), 2) as total
       FROM transactions
       GROUP BY department
       ORDER BY total DESC`
    )
    .all() as DepartmentSpend[];
  return rows;
}
