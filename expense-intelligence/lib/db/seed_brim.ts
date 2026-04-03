/**
 * Brim real-data seed — imports actual transactions from the Brim corporate card XLSX
 * (pre-processed to data/transactions_brim.json by the Python export script).
 * Aug 2025 – Mar 2026, 9 cardholders, 4180 transactions.
 */
import { getDb } from './index';
import crypto from 'crypto';
import brimData from '../../data/transactions_brim.json';

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

type EmployeeRole = 'manager' | 'individual_contributor' | 'executive';

interface BrimEmployee {
  id: string;
  name: string;
  department: string;
  role: string;
  title: string;
}

const ROLE_MAP: Record<string, EmployeeRole> = {
  driver: 'individual_contributor',
  admin: 'individual_contributor',
  manager: 'manager',
  executive: 'executive',
};

const EMPLOYEES = (brimData.employees as BrimEmployee[]).map((e) => ({
  id: e.id,
  name: e.name,
  department: e.department,
  role: ROLE_MAP[e.role] ?? 'individual_contributor',
  title: e.title,
  approval_threshold: e.role === 'executive' ? 5000 : e.role === 'manager' ? 1000 : 50,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quarterOf(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

function requiresApproval(amount: number): boolean {
  return amount >= 50; // real Brim threshold
}

// ---------------------------------------------------------------------------
// Anomaly detection on imported transactions
// ---------------------------------------------------------------------------

interface TxnRow {
  id: string;
  employee_id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  description: string;
}

function detectAnomalies(txns: TxnRow[]): Array<{
  id: string;
  type: 'split_charge' | 'duplicate' | 'round_number' | 'velocity' | 'unusual_merchant';
  transaction_ids: string;
  employee_id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  status: string;
}> {
  const anomalies = [];

  type Sev = 'low' | 'medium' | 'high' | 'critical';

  // 1. Duplicates — same employee, same merchant, same amount, same or adjacent day
  const seen: Record<string, TxnRow[]> = {};
  txns.forEach((t) => {
    const key = `${t.employee_id}|${t.merchant}|${t.amount}`;
    seen[key] = seen[key] ?? [];
    seen[key].push(t);
  });
  for (const [, group] of Object.entries(seen)) {
    if (group.length >= 2) {
      const dates = group.map((t) => new Date(t.date).getTime());
      const spread = Math.max(...dates) - Math.min(...dates);
      if (spread <= 3 * 24 * 60 * 60 * 1000) {
        anomalies.push({
          id: `anom-dup-${crypto.randomUUID().slice(0, 8)}`,
          type: 'duplicate' as const,
          transaction_ids: group.map((t) => t.id).join(','),
          employee_id: group[0].employee_id,
          description: `Possible duplicate: ${group.length}× ${group[0].merchant} @ $${group[0].amount} within 3 days`,
          severity: (group.length >= 3 ? 'critical' : 'high') as Sev,
          detected_at: new Date().toISOString(),
          status: 'open',
        });
      }
    }
  }

  // 2. Round-number large transactions
  txns
    .filter((t) => t.amount >= 500 && t.amount % 100 === 0)
    .slice(0, 15)
    .forEach((t) => {
      anomalies.push({
        id: `anom-rnd-${crypto.randomUUID().slice(0, 8)}`,
        type: 'round_number' as const,
        transaction_ids: t.id,
        employee_id: t.employee_id,
        description: `Round-number transaction: $${t.amount} at ${t.merchant}`,
        severity: (t.amount >= 2000 ? 'high' : 'medium') as Sev,
        detected_at: new Date().toISOString(),
        status: 'open',
      });
    });

  // 3. Velocity spikes — employee with 8+ transactions on same day
  const byEmpDay: Record<string, TxnRow[]> = {};
  txns.forEach((t) => {
    const key = `${t.employee_id}|${t.date}`;
    byEmpDay[key] = byEmpDay[key] ?? [];
    byEmpDay[key].push(t);
  });
  for (const [, group] of Object.entries(byEmpDay)) {
    if (group.length >= 8) {
      anomalies.push({
        id: `anom-vel-${crypto.randomUUID().slice(0, 8)}`,
        type: 'velocity' as const,
        transaction_ids: group.map((t) => t.id).join(','),
        employee_id: group[0].employee_id,
        description: `Velocity spike: ${group.length} transactions on ${group[0].date} totalling $${group.reduce((s, t) => s + t.amount, 0).toFixed(2)}`,
        severity: 'high' as Sev,
        detected_at: new Date().toISOString(),
        status: 'open',
      });
    }
  }

  return anomalies.slice(0, 50); // cap at 50
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export function seedBrimDatabase(): { employees: number; transactions: number; budgets: number; anomalies: number } {
  const db = getDb();

  // Wipe all data
  db.exec(`
    DELETE FROM anomalies;
    DELETE FROM expense_reports;
    DELETE FROM approvals;
    DELETE FROM violations;
    DELETE FROM budgets;
    DELETE FROM transactions;
    DELETE FROM employees;
  `);

  // Insert employees
  const insertEmployee = db.prepare(
    `INSERT INTO employees (id, name, department, role, title, approval_threshold)
     VALUES (@id, @name, @department, @role, @title, @approval_threshold)`
  );
  db.transaction(() => EMPLOYEES.forEach((e) => insertEmployee.run(e)))();

  // Prepare transactions
  const rawTxns = brimData.transactions as Array<{
    employee_id: string;
    employee_name: string;
    department: string;
    amount: number;
    merchant: string;
    category: string;
    date: string;
    description: string;
  }>;

  const txns = rawTxns.map((t) => ({
    id: `txn-${crypto.randomUUID().slice(0, 8)}`,
    employee_id: t.employee_id,
    employee_name: t.employee_name,
    department: t.department,
    amount: t.amount,
    merchant: t.merchant,
    category: t.category,
    date: t.date,
    description: t.description || `${t.category} — ${t.merchant}`,
    status: requiresApproval(t.amount) ? 'pending' : 'approved',
    requires_approval: requiresApproval(t.amount) ? 1 : 0,
    attendee_count: 1,
    event_tag: null as string | null,
  }));

  // Compute spend by dept/quarter
  const spendMap: Record<string, number> = {};
  txns.forEach((t) => {
    const q = quarterOf(t.date);
    const key = `${t.department}:${q}`;
    spendMap[key] = (spendMap[key] ?? 0) + t.amount;
  });

  // Build budgets — allocate 115% of actual spend so some go over
  const periodSet = new Set(txns.map((t) => quarterOf(t.date)));
  const deptSet = new Set(txns.map((t) => t.department));
  const budgets: Array<{ id: string; department: string; category: string; period: string; allocated: number; spent: number }> = [];

  for (const dept of deptSet) {
    for (const period of periodSet) {
      const spent = spendMap[`${dept}:${period}`] ?? 0;
      if (spent === 0) continue;
      // Allocate 110-130% of actual spend for realism
      const factor = dept === 'Operations' ? 1.05 : 1.20;
      budgets.push({
        id: crypto.randomUUID(),
        department: dept,
        category: 'total',
        period,
        allocated: Math.round(spent * factor),
        spent: Math.round(spent * 100) / 100,
      });
    }
  }

  const insertBudget = db.prepare(
    `INSERT INTO budgets (id, department, category, period, allocated, spent)
     VALUES (@id, @department, @category, @period, @allocated, @spent)`
  );
  db.transaction(() => budgets.forEach((b) => insertBudget.run(b)))();

  // Insert transactions
  const insertTxn = db.prepare(
    `INSERT INTO transactions (id, employee_id, employee_name, department, amount, merchant, category, date, description, status, requires_approval, attendee_count, event_tag)
     VALUES (@id, @employee_id, @employee_name, @department, @amount, @merchant, @category, @date, @description, @status, @requires_approval, @attendee_count, @event_tag)`
  );
  db.transaction(() => txns.forEach((t) => insertTxn.run(t)))();

  // Detect anomalies
  const anomalies = detectAnomalies(txns);
  const insertAnomaly = db.prepare(
    `INSERT INTO anomalies (id, type, transaction_ids, employee_id, description, severity, detected_at, status)
     VALUES (@id, @type, @transaction_ids, @employee_id, @description, @severity, @detected_at, @status)`
  );
  db.transaction(() => anomalies.forEach((a) => insertAnomaly.run(a)))();

  // Create pending approvals for the most recent large transactions
  const pendingTxns = txns
    .filter((t) => t.requires_approval && t.amount >= 200)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const insertApproval = db.prepare(
    `INSERT INTO approvals (id, transaction_id, employee_id, amount, merchant, description, ai_recommendation, ai_reasoning, status, created_at)
     VALUES (@id, @transaction_id, @employee_id, @amount, @merchant, @description, @ai_recommendation, @ai_reasoning, @status, @created_at)`
  );

  const approvalReasons: Record<string, { rec: string; reason: string }> = {
    transportation: { rec: 'approve', reason: 'Standard fleet operational expense. Merchant and amount consistent with prior transactions.' },
    equipment: { rec: 'approve', reason: 'Equipment purchase within policy limits. Business purpose is clear from merchant and category.' },
    meals: { rec: 'approve', reason: 'Meal expense within per-person limit. Receipt required for reimbursement.' },
    hotels: { rec: 'approve', reason: 'Hotel stay within nightly limit. Business travel purpose documented.' },
    software_saas: { rec: 'approve', reason: 'Software subscription within SaaS budget. Recurring operational cost.' },
    office_supplies: { rec: 'deny', reason: 'Amount exceeds office supplies limit. Requires additional justification and manager sign-off.' },
  };

  db.transaction(() => {
    pendingTxns.forEach((t) => {
      const reasoning = approvalReasons[t.category] ?? { rec: 'approve', reason: 'Expense appears consistent with role and department policy.' };
      insertApproval.run({
        id: `appr-${crypto.randomUUID().slice(0, 8)}`,
        transaction_id: t.id,
        employee_id: t.employee_id,
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        ai_recommendation: reasoning.rec,
        ai_reasoning: reasoning.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    });
  })();

  return {
    employees: EMPLOYEES.length,
    transactions: txns.length,
    budgets: budgets.length,
    anomalies: anomalies.length,
  };
}
