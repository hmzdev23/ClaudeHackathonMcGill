/**
 * Seed script: generates synthetic transaction data with embedded anomalies.
 * Run via GET /api/seed — wipes existing data and re-inserts everything.
 */
import { getDb } from './index';
import { requiresApproval } from '../policy/rules';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Employee master data
// ---------------------------------------------------------------------------

const EMPLOYEES = [
  // Engineering (12)
  { id: 'emp-001', name: 'Marcus Chen',    department: 'Engineering', role: 'individual_contributor', title: 'Senior Engineer',    approval_threshold: 500 },
  { id: 'emp-002', name: 'Alex Kim',       department: 'Engineering', role: 'individual_contributor', title: 'Software Engineer',   approval_threshold: 500 },
  { id: 'emp-003', name: 'Priya Patel',    department: 'Engineering', role: 'individual_contributor', title: 'Senior Engineer',    approval_threshold: 500 },
  { id: 'emp-004', name: 'James Walker',   department: 'Engineering', role: 'individual_contributor', title: 'Junior Engineer',    approval_threshold: 500 },
  { id: 'emp-005', name: 'Nina Rodriguez', department: 'Engineering', role: 'individual_contributor', title: 'Senior Engineer',    approval_threshold: 500 },
  { id: 'emp-006', name: 'Derek Huang',    department: 'Engineering', role: 'individual_contributor', title: 'Software Engineer',   approval_threshold: 500 },
  { id: 'emp-007', name: 'Amara Osei',     department: 'Engineering', role: 'individual_contributor', title: 'Software Engineer',   approval_threshold: 500 },
  { id: 'emp-008', name: 'Kevin Park',     department: 'Engineering', role: 'individual_contributor', title: 'Junior Engineer',    approval_threshold: 500 },
  { id: 'emp-009', name: 'Sofia Martini',  department: 'Engineering', role: 'individual_contributor', title: 'Senior Engineer',    approval_threshold: 500 },
  { id: 'emp-010', name: 'Liam Burke',     department: 'Engineering', role: 'individual_contributor', title: 'Software Engineer',   approval_threshold: 500 },
  { id: 'emp-011', name: 'Zara Ahmed',     department: 'Engineering', role: 'individual_contributor', title: 'Software Engineer',   approval_threshold: 500 },
  { id: 'emp-012', name: 'Ryan Torres',    department: 'Engineering', role: 'manager',                title: 'Engineering Manager', approval_threshold: 1000 },

  // Marketing (10)
  { id: 'emp-013', name: 'Sarah Chen',     department: 'Marketing', role: 'individual_contributor', title: 'Growth Manager',      approval_threshold: 500 },
  { id: 'emp-014', name: 'Tom Rivera',     department: 'Marketing', role: 'individual_contributor', title: 'Content Strategist',  approval_threshold: 500 },
  { id: 'emp-015', name: 'Olivia Grant',   department: 'Marketing', role: 'individual_contributor', title: 'Brand Designer',      approval_threshold: 500 },
  { id: 'emp-016', name: 'Raj Kapoor',     department: 'Marketing', role: 'individual_contributor', title: 'Performance Marketer',approval_threshold: 500 },
  { id: 'emp-017', name: 'Emma Walsh',     department: 'Marketing', role: 'individual_contributor', title: 'SEO Specialist',      approval_threshold: 500 },
  { id: 'emp-018', name: 'Carlos Diaz',    department: 'Marketing', role: 'individual_contributor', title: 'Video Producer',      approval_threshold: 500 },
  { id: 'emp-019', name: 'Yuki Tanaka',    department: 'Marketing', role: 'individual_contributor', title: 'Social Media Manager',approval_threshold: 500 },
  { id: 'emp-020', name: 'Fatima Al-Amin', department: 'Marketing', role: 'individual_contributor', title: 'Events Coordinator',  approval_threshold: 500 },
  { id: 'emp-021', name: 'Ben Foster',     department: 'Marketing', role: 'individual_contributor', title: 'Marketing Analyst',   approval_threshold: 500 },
  { id: 'emp-022', name: 'Dana Mills',     department: 'Marketing', role: 'manager',                title: 'Marketing Director',  approval_threshold: 1000 },

  // Sales (12)
  { id: 'emp-023', name: 'Lisa Park',      department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-024', name: 'Tim Walsh',      department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-025', name: 'Grace Liu',      department: 'Sales', role: 'individual_contributor', title: 'SDR',                 approval_threshold: 500 },
  { id: 'emp-026', name: 'Ethan Brown',    department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-027', name: 'Hana Yamamoto',  department: 'Sales', role: 'individual_contributor', title: 'SDR',                 approval_threshold: 500 },
  { id: 'emp-028', name: 'Omar Farooq',    department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-029', name: 'Chloe Jensen',   department: 'Sales', role: 'individual_contributor', title: 'SDR',                 approval_threshold: 500 },
  { id: 'emp-030', name: 'Marco Ricci',    department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-031', name: 'Aisha Williams', department: 'Sales', role: 'individual_contributor', title: 'SDR',                 approval_threshold: 500 },
  { id: 'emp-032', name: 'Noah Kim',       department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-033', name: 'Isabel Cruz',    department: 'Sales', role: 'individual_contributor', title: 'Account Executive',   approval_threshold: 500 },
  { id: 'emp-034', name: 'Victor Stone',   department: 'Sales', role: 'executive',              title: 'VP of Sales',         approval_threshold: 2000 },

  // Operations (8)
  { id: 'emp-035', name: 'Jordan Lee',     department: 'Operations', role: 'individual_contributor', title: 'IT Administrator',    approval_threshold: 500 },
  { id: 'emp-036', name: 'Maya Singh',     department: 'Operations', role: 'individual_contributor', title: 'HR Generalist',       approval_threshold: 500 },
  { id: 'emp-037', name: 'Chris Nguyen',   department: 'Operations', role: 'individual_contributor', title: 'Facilities Manager',  approval_threshold: 500 },
  { id: 'emp-038', name: 'Taylor Reed',    department: 'Operations', role: 'individual_contributor', title: 'IT Support',          approval_threshold: 500 },
  { id: 'emp-039', name: 'Morgan Hayes',   department: 'Operations', role: 'individual_contributor', title: 'Procurement Analyst', approval_threshold: 500 },
  { id: 'emp-040', name: 'Riley Quinn',    department: 'Operations', role: 'individual_contributor', title: 'Operations Analyst',  approval_threshold: 500 },
  { id: 'emp-041', name: 'Casey Morgan',   department: 'Operations', role: 'individual_contributor', title: 'IT Specialist',       approval_threshold: 500 },
  { id: 'emp-042', name: 'Sam Peterson',   department: 'Operations', role: 'manager',                title: 'Operations Manager',  approval_threshold: 1000 },

  // Finance (8)
  { id: 'emp-043', name: 'Chris Davis',    department: 'Finance', role: 'individual_contributor', title: 'Financial Analyst',   approval_threshold: 500 },
  { id: 'emp-044', name: 'Nia Thompson',   department: 'Finance', role: 'individual_contributor', title: 'Accountant',          approval_threshold: 500 },
  { id: 'emp-045', name: 'Patrick Green',  department: 'Finance', role: 'individual_contributor', title: 'Financial Analyst',   approval_threshold: 500 },
  { id: 'emp-046', name: 'Elena Sousa',    department: 'Finance', role: 'individual_contributor', title: 'Accounts Payable',    approval_threshold: 500 },
  { id: 'emp-047', name: 'James Liu',      department: 'Finance', role: 'individual_contributor', title: 'Financial Analyst',   approval_threshold: 500 },
  { id: 'emp-048', name: 'Sandra King',    department: 'Finance', role: 'individual_contributor', title: 'Controller',          approval_threshold: 500 },
  { id: 'emp-049', name: 'Andre Moreau',   department: 'Finance', role: 'individual_contributor', title: 'Financial Analyst',   approval_threshold: 500 },
  { id: 'emp-050', name: 'Diana Foster',   department: 'Finance', role: 'executive',              title: 'CFO',                 approval_threshold: 5000 },
];

// ---------------------------------------------------------------------------
// Budget data
// ---------------------------------------------------------------------------

const BUDGETS = [
  // Q4 2025
  { department: 'Engineering', period: '2025-Q4', allocated: 45000 },
  { department: 'Marketing',   period: '2025-Q4', allocated: 38000 },
  { department: 'Sales',       period: '2025-Q4', allocated: 52000 },
  { department: 'Operations',  period: '2025-Q4', allocated: 22000 },
  { department: 'Finance',     period: '2025-Q4', allocated: 15000 },
  // Q1 2026
  { department: 'Engineering', period: '2026-Q1', allocated: 48000 },
  { department: 'Marketing',   period: '2026-Q1', allocated: 40000 },  // Marketing will hit 94%
  { department: 'Sales',       period: '2026-Q1', allocated: 55000 },
  { department: 'Operations',  period: '2026-Q1', allocated: 24000 },
  { department: 'Finance',     period: '2026-Q1', allocated: 16000 },
];

// ---------------------------------------------------------------------------
// Transaction generation helpers
// ---------------------------------------------------------------------------

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function quarterOf(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

// ---------------------------------------------------------------------------
// Regular transaction templates (realistic patterns)
// ---------------------------------------------------------------------------

const SAAS_SUBSCRIPTIONS = [
  { merchant: 'GitHub', category: 'software_saas', amount: 21 },
  { merchant: 'Slack', category: 'software_saas', amount: 15 },
  { merchant: 'Notion', category: 'software_saas', amount: 16 },
  { merchant: 'Figma', category: 'software_saas', amount: 45 },
  { merchant: 'Zoom', category: 'software_saas', amount: 20 },
  { merchant: 'Linear', category: 'software_saas', amount: 12 },
  { merchant: 'Loom', category: 'software_saas', amount: 12.5 },
  { merchant: 'Miro', category: 'software_saas', amount: 16 },
];

const MEAL_MERCHANTS = ['Chipotle', 'Sweetgreen', 'Panera Bread', 'Starbucks', 'Blue Bottle Coffee',
  'The Canteen', 'Noodle Bar', 'Poke House', 'The Wrap Co', 'Urban Kitchen'];

const OFFICE_MERCHANTS = ['Staples', 'Amazon Business', 'Office Depot', 'IKEA', 'Best Buy'];

const TRAVEL_AIRLINES = ['United Airlines', 'Delta Airlines', 'Air Canada', 'Southwest Airlines'];
const TRAVEL_HOTELS = ['Marriott Hotels', 'Hilton Hotels', 'Hyatt Hotels', 'Westin Hotels'];

// ---------------------------------------------------------------------------
// Build transactions array
// ---------------------------------------------------------------------------

interface TxnInput {
  id?: string;
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  description?: string;
  status?: string;
  requires_approval?: number;
  attendee_count?: number;
  event_tag?: string | null;
}

function makeTxn(t: TxnInput): Required<TxnInput> {
  const needsApproval = t.requires_approval ?? (requiresApproval(t.amount) ? 1 : 0);
  return {
    id: t.id ?? `txn-${crypto.randomUUID().slice(0, 8)}`,
    employee_id: t.employee_id,
    employee_name: t.employee_name,
    department: t.department,
    amount: t.amount,
    merchant: t.merchant,
    category: t.category,
    date: t.date,
    description: t.description ?? `${t.category} - ${t.merchant}`,
    status: t.status ?? (needsApproval ? 'pending' : 'approved'),
    requires_approval: needsApproval,
    attendee_count: t.attendee_count ?? 1,
    event_tag: t.event_tag ?? null,
  };
}

export function generateTransactions(): Required<TxnInput>[] {
  const txns: Required<TxnInput>[] = [];

  // Helper: add transaction
  const add = (t: TxnInput) => txns.push(makeTxn(t));

  // ------------------------------------------------------------------
  // 1. Monthly SaaS subscriptions (recurring, Oct 2025 – Mar 2026)
  //    ~15 subscriptions/month for Engineering + Marketing
  // ------------------------------------------------------------------
  for (let month = 10; month <= 15; month++) { // 10=Oct, 15=Mar(+12)
    const actualMonth = month > 12 ? month - 12 : month;
    const year = month > 12 ? 2026 : 2025;
    const day = 1;

    // Engineering SaaS
    ['emp-001', 'emp-003', 'emp-005', 'emp-009', 'emp-012'].forEach((empId) => {
      const emp = EMPLOYEES.find(e => e.id === empId)!;
      const sub = pick(SAAS_SUBSCRIPTIONS);
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: sub.amount, merchant: sub.merchant, category: sub.category,
            date: isoDate(year, actualMonth, day), attendee_count: 1 });
    });

    // Marketing SaaS
    ['emp-013', 'emp-014', 'emp-015', 'emp-022'].forEach((empId) => {
      const emp = EMPLOYEES.find(e => e.id === empId)!;
      const sub = pick([...SAAS_SUBSCRIPTIONS, { merchant: 'Canva', category: 'software_saas', amount: 55 },
        { merchant: 'HubSpot', category: 'software_saas', amount: 450 }, { merchant: 'Ahrefs', category: 'software_saas', amount: 199 }]);
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: sub.amount, merchant: sub.merchant, category: sub.category,
            date: isoDate(year, actualMonth, day + 1), attendee_count: 1 });
    });
  }

  // ------------------------------------------------------------------
  // 2. Regular meals — all employees, 2-4x/month
  // ------------------------------------------------------------------
  EMPLOYEES.forEach((emp) => {
    for (let m = 10; m <= 15; m++) {
      const actualMonth = m > 12 ? m - 12 : m;
      const year = m > 12 ? 2026 : 2025;
      const numMeals = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numMeals; i++) {
        const day = Math.floor(Math.random() * 25) + 1;
        const isTeam = Math.random() < 0.2;
        const amount = isTeam
          ? randBetween(60, 140)
          : randBetween(12, 68); // mostly under $75 solo limit
        add({
          employee_id: emp.id, employee_name: emp.name, department: emp.department,
          amount, merchant: pick(MEAL_MERCHANTS),
          category: isTeam ? 'team meals' : 'meals',
          date: isoDate(year, actualMonth, day),
          attendee_count: isTeam ? Math.floor(Math.random() * 4) + 2 : 1,
        });
      }
    }
  });

  // ------------------------------------------------------------------
  // 3. Office supplies — Operations, all months
  // ------------------------------------------------------------------
  ['emp-035', 'emp-037', 'emp-039', 'emp-042'].forEach((empId) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    for (let m = 10; m <= 15; m++) {
      const actualMonth = m > 12 ? m - 12 : m;
      const year = m > 12 ? 2026 : 2025;
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: randBetween(30, 185), merchant: pick(OFFICE_MERCHANTS),
            category: 'office supplies', date: isoDate(year, actualMonth, Math.floor(Math.random() * 20) + 1) });
    }
  });

  // ------------------------------------------------------------------
  // 4. Travel — Sales team, quarterly conferences
  // ------------------------------------------------------------------
  const salesTravelers = ['emp-023', 'emp-024', 'emp-026', 'emp-028', 'emp-030', 'emp-034'];
  salesTravelers.forEach((empId) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    // Q4 2025 travel
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(350, 780), merchant: pick(TRAVEL_AIRLINES),
          category: 'flights', date: isoDate(2025, 11, 10) });
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(180, 245), merchant: pick(TRAVEL_HOTELS),
          category: 'hotels', date: isoDate(2025, 11, 10), description: 'Hotel 1 night' });
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(180, 245), merchant: pick(TRAVEL_HOTELS),
          category: 'hotels', date: isoDate(2025, 11, 11), description: 'Hotel 1 night' });
    // Q1 2026 travel
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(350, 780), merchant: pick(TRAVEL_AIRLINES),
          category: 'flights', date: isoDate(2026, 1, 28) });
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(180, 245), merchant: pick(TRAVEL_HOTELS),
          category: 'hotels', date: isoDate(2026, 1, 28), description: 'Hotel 1 night' });
  });

  // ------------------------------------------------------------------
  // 5. Conference registrations — Engineering SFO Summit (Nov 2025)
  // ------------------------------------------------------------------
  const SFO_EMP = ['emp-001', 'emp-003', 'emp-005', 'emp-009', 'emp-012'];
  SFO_EMP.forEach((empId) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    const days = [12, 13, 14];
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: 1200, merchant: 'SFO Tech Summit', category: 'conference_registration',
          date: isoDate(2025, 11, 10), event_tag: 'SFO_SUMMIT_2025_NOV',
          requires_approval: 1, status: 'approved' });
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(380, 760), merchant: pick(TRAVEL_AIRLINES), category: 'flights',
          date: isoDate(2025, 11, 11), event_tag: 'SFO_SUMMIT_2025_NOV' });
    days.forEach((day) => {
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: randBetween(210, 245), merchant: pick(TRAVEL_HOTELS), category: 'hotels',
            date: isoDate(2025, 11, day), event_tag: 'SFO_SUMMIT_2025_NOV' });
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: randBetween(28, 68), merchant: pick(MEAL_MERCHANTS), category: 'meals',
            date: isoDate(2025, 11, day), event_tag: 'SFO_SUMMIT_2025_NOV', attendee_count: 1 });
    });
  });

  // ------------------------------------------------------------------
  // 6. NYC Sales Conference (Feb 2026)
  // ------------------------------------------------------------------
  const NYC_EMP = ['emp-023', 'emp-026', 'emp-034'];
  NYC_EMP.forEach((empId) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: 1400, merchant: 'NYC Sales World', category: 'conference_registration',
          date: isoDate(2026, 2, 2), event_tag: 'NYC_SALES_CONF_2026_FEB',
          requires_approval: 1, status: 'approved' });
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(400, 780), merchant: pick(TRAVEL_AIRLINES), category: 'flights',
          date: isoDate(2026, 2, 2), event_tag: 'NYC_SALES_CONF_2026_FEB' });
    [3, 4].forEach((day) => {
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: randBetween(210, 245), merchant: pick(TRAVEL_HOTELS), category: 'hotels',
            date: isoDate(2026, 2, day), event_tag: 'NYC_SALES_CONF_2026_FEB' });
    });
  });

  // ------------------------------------------------------------------
  // 7. Equipment purchases — Engineering, occasional
  // ------------------------------------------------------------------
  [['emp-001', '2025-10-15'], ['emp-003', '2025-11-20'], ['emp-005', '2026-01-08'],
   ['emp-009', '2026-02-14'], ['emp-012', '2025-12-05']].forEach(([empId, date]) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    add({ employee_id: empId, employee_name: emp.name, department: emp.department,
          amount: randBetween(320, 950), merchant: pick(['Apple', 'Dell', 'Logitech', 'Amazon Business']),
          category: 'equipment', date });
  });

  // ------------------------------------------------------------------
  // ANOMALY 1: Split charge — Marcus Chen (emp-001) splits $680 AWS → 2×$340
  // ------------------------------------------------------------------
  add({ id: 'txn-anomaly-001a', employee_id: 'emp-001', employee_name: 'Marcus Chen', department: 'Engineering',
        amount: 340, merchant: 'AWS', category: 'software_saas',
        date: '2026-01-15', description: 'AWS Infrastructure - Part 1', attendee_count: 1 });
  add({ id: 'txn-anomaly-001b', employee_id: 'emp-001', employee_name: 'Marcus Chen', department: 'Engineering',
        amount: 340, merchant: 'AWS', category: 'software_saas',
        date: '2026-01-15', description: 'AWS Infrastructure - Part 2', attendee_count: 1 });

  // ANOMALY 2: Split charge — Lisa Park (emp-023) splits $550 Salesforce → $275+$275
  add({ id: 'txn-anomaly-002a', employee_id: 'emp-023', employee_name: 'Lisa Park', department: 'Sales',
        amount: 275, merchant: 'Salesforce', category: 'software_saas',
        date: '2025-12-10', description: 'Salesforce Add-on License A', attendee_count: 1 });
  add({ id: 'txn-anomaly-002b', employee_id: 'emp-023', employee_name: 'Lisa Park', department: 'Sales',
        amount: 275, merchant: 'Salesforce', category: 'software_saas',
        date: '2025-12-10', description: 'Salesforce Add-on License B', attendee_count: 1 });

  // ANOMALY 3: Duplicate charge — Tom Rivera (emp-014) charges $89 Figma twice, 3 days apart
  add({ id: 'txn-anomaly-003a', employee_id: 'emp-014', employee_name: 'Tom Rivera', department: 'Marketing',
        amount: 89, merchant: 'Figma', category: 'software_saas',
        date: '2026-01-08', description: 'Figma Pro subscription' });
  add({ id: 'txn-anomaly-003b', employee_id: 'emp-014', employee_name: 'Tom Rivera', department: 'Marketing',
        amount: 89, merchant: 'Figma', category: 'software_saas',
        date: '2026-01-11', description: 'Figma Pro subscription' });

  // ANOMALY 4: Repeat offender — Alex Kim (emp-002) has 6 solo dinners over $75 limit
  [['2025-10-18', 88], ['2025-11-12', 92], ['2025-11-28', 85],
   ['2026-01-09', 97], ['2026-01-22', 102], ['2026-02-05', 110]].forEach(([date, amount], i) => {
    add({ id: `txn-anomaly-004${i}`, employee_id: 'emp-002', employee_name: 'Alex Kim', department: 'Engineering',
          amount: Number(amount), merchant: pick(['The Farmhouse', 'Blue Door Kitchen', 'Oak & Stone', 'Harvest Table']),
          category: 'meals', date: String(date), description: 'Solo dinner', attendee_count: 1 });
  });

  // ANOMALY 5: Round-number pattern — Jordan Lee (emp-035) 4×$500 "office supplies" in Jan 2026
  ['2026-01-03', '2026-01-10', '2026-01-17', '2026-01-24'].forEach((date, i) => {
    add({ id: `txn-anomaly-005${i}`, employee_id: 'emp-035', employee_name: 'Jordan Lee', department: 'Operations',
          amount: 500, merchant: pick(OFFICE_MERCHANTS), category: 'office supplies',
          date, description: 'Office supplies - bulk order', requires_approval: 1 });
  });

  // ANOMALY 6: Velocity spike — Sarah Chen (emp-013) spends $3,200 in one day (SFO conference prep)
  add({ id: 'txn-anomaly-006a', employee_id: 'emp-013', employee_name: 'Sarah Chen', department: 'Marketing',
        amount: 1450, merchant: 'Dreamforce', category: 'conference_registration',
        date: '2025-11-03', description: 'Dreamforce conference registration', requires_approval: 1, status: 'approved' });
  add({ id: 'txn-anomaly-006b', employee_id: 'emp-013', employee_name: 'Sarah Chen', department: 'Marketing',
        amount: 780, merchant: pick(TRAVEL_AIRLINES), category: 'flights',
        date: '2025-11-03', description: 'Flight to Dreamforce', requires_approval: 1, status: 'approved' });
  add({ id: 'txn-anomaly-006c', employee_id: 'emp-013', employee_name: 'Sarah Chen', department: 'Marketing',
        amount: 720, merchant: 'Marriott SF', category: 'hotels',
        date: '2025-11-03', description: 'Hotel (3 nights)', requires_approval: 1, status: 'approved' });
  add({ id: 'txn-anomaly-006d', employee_id: 'emp-013', employee_name: 'Sarah Chen', department: 'Marketing',
        amount: 250, merchant: 'Shopify Plus', category: 'software_saas',
        date: '2025-11-03', description: 'Marketing platform license' });

  // ANOMALY 7: Unusual merchant — Tim Walsh (emp-024) charges $420 at Grand Vegas Entertainment
  add({ id: 'txn-anomaly-007', employee_id: 'emp-024', employee_name: 'Tim Walsh', department: 'Sales',
        amount: 420, merchant: 'Grand Vegas Entertainment', category: 'entertainment',
        date: '2026-02-14', description: 'Client entertainment - Las Vegas', attendee_count: 1 });

  // ANOMALY 8: Policy violation (context) — Chris Davis (emp-043) $340 solo dinner
  add({ id: 'txn-anomaly-008', employee_id: 'emp-043', employee_name: 'Chris Davis', department: 'Finance',
        amount: 340, merchant: 'Le Bernardin', category: 'meals',
        date: '2026-01-20', description: 'Client dinner', attendee_count: 1 });

  // Additional Marketing spend to push near 94% of Q1 budget
  const mktgSpenders = ['emp-013', 'emp-014', 'emp-015', 'emp-016', 'emp-017', 'emp-018', 'emp-019', 'emp-020', 'emp-021', 'emp-022'];
  mktgSpenders.forEach((empId) => {
    const emp = EMPLOYEES.find(e => e.id === empId)!;
    // Extra Q1 2026 spend to push Marketing to ~94%
    for (let i = 0; i < 3; i++) {
      add({ employee_id: empId, employee_name: emp.name, department: emp.department,
            amount: randBetween(150, 480), merchant: pick(['Meta Ads', 'Google Ads', 'LinkedIn Ads', 'Canva Pro', 'Mailchimp', 'Webflow']),
            category: 'software_saas', date: isoDate(2026, Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 25) + 1) });
    }
  });

  return txns;
}

// ---------------------------------------------------------------------------
// Compute and populate budgets.spent from transactions
// ---------------------------------------------------------------------------

function computeBudgetSpend(
  txns: Required<TxnInput>[]
): Record<string, Record<string, number>> {
  // { "Engineering:2026-Q1": 12345.67 }
  const spend: Record<string, number> = {};
  txns.forEach((t) => {
    const q = quarterOf(t.date);
    const key = `${t.department}:${q}`;
    spend[key] = (spend[key] ?? 0) + t.amount;
  });
  return { raw: spend } as unknown as Record<string, Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export function seedDatabase(): { employees: number; transactions: number; budgets: number } {
  const db = getDb();

  // Wipe existing data
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
  const insertManyEmployees = db.transaction((emps: typeof EMPLOYEES) => {
    emps.forEach((e) => insertEmployee.run(e));
  });
  insertManyEmployees(EMPLOYEES);

  // Generate transactions
  const txns = generateTransactions();

  // Compute spend per dept/quarter
  const spendMap: Record<string, number> = {};
  txns.forEach((t) => {
    const q = quarterOf(t.date);
    const key = `${t.department}:${q}`;
    spendMap[key] = (spendMap[key] ?? 0) + t.amount;
  });

  // Insert budgets
  const insertBudget = db.prepare(
    `INSERT INTO budgets (id, department, category, period, allocated, spent)
     VALUES (@id, @department, @category, @period, @allocated, @spent)`
  );
  const insertManyBudgets = db.transaction(() => {
    BUDGETS.forEach((b) => {
      const spent = spendMap[`${b.department}:${b.period}`] ?? 0;
      insertBudget.run({
        id: crypto.randomUUID(),
        department: b.department,
        category: 'total',
        period: b.period,
        allocated: b.allocated,
        spent: Math.round(spent * 100) / 100,
      });
    });
  });
  insertManyBudgets();

  // Insert transactions
  const insertTxn = db.prepare(
    `INSERT INTO transactions (id, employee_id, employee_name, department, amount, merchant, category, date, description, status, requires_approval, attendee_count, event_tag)
     VALUES (@id, @employee_id, @employee_name, @department, @amount, @merchant, @category, @date, @description, @status, @requires_approval, @attendee_count, @event_tag)`
  );
  const insertManyTxns = db.transaction((ts: Required<TxnInput>[]) => {
    ts.forEach((t) => insertTxn.run(t));
  });
  insertManyTxns(txns);

  return { employees: EMPLOYEES.length, transactions: txns.length, budgets: BUDGETS.length };
}
