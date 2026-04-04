/**
 * Brim real-data seed — imports actual transactions from the Brim corporate card XLSX
 * (pre-processed to data/transactions_brim.json by the Python export script).
 * Aug 2025 – Mar 2026, 3 card groups, 4180 transactions.
 */
import { getDb } from './index';
import type { Database } from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Fleet subcategory remapping
// ---------------------------------------------------------------------------
export function remapFleetCategories(db: Database) {
  const run = (category: string, conditions: string[]) => {
    const where = conditions.map(c => `merchant LIKE '${c}'`).join(' OR ');
    db.prepare(`UPDATE transactions SET category = '${category}' WHERE category = 'transportation' AND (${where})`).run();
  };

  // 1. Permits & Compliance (state DOTs, oversize/weight permits, tolls, border)
  run('fleet_permits', [
    'TXDMV%', 'WSDOT%', 'SD DEPT OF TRANS%', 'NDHP%', 'PZG**MT DEPT%',
    'VCN*%', 'TDOT OSOW%', 'ILLINOIS DEPARTMENT%', 'OKC SIZE & WEIGHTS%',
    'PROVINCIAL PERMIT%', 'IA DOT%', 'MCSD OSOW%', 'MB HIGHWAYS%',
    'SASK PERMIT%', 'BC PERMIT%', 'MNDOT OSOW%', 'CO DEPT OF TRANS%',
    'ODOT CCD%', 'SVC FEE ODOT%', 'ELAVON SRV FEE DEPT%', 'DEPT OF TRANS%',
    'DOTD TRUCK PERMIT%', 'DOT-COMM%', 'DTA EPRO%', 'MDOT PERMIT%',
    'NEW YORK STATE OSCAR%', 'PENN DOT%', 'VA DMV%', 'AZ MVD%',
    'GOTPERMITS%', 'OXCARTPERMITS%', 'NIC*%', 'KYTC MOTOR%',
    'AB TRANSP%', 'AUTOAGENT*%', 'DOT OPERATING%', 'I3B*WYDOT%',
    'DTOPS%', 'CBP %', 'PMT*NM TAX%', 'IDOT ITAP%', 'UDOT%',
    'CSI-MO DEPT%', 'MS.GOV MDOT%', 'NV DOT%', 'YG MOTOR VEHICLES%',
    'YG WEIGH STATION%', 'SGI AUTO FUND%', 'SGI-MY SGI%', 'MTO TSD%',
    'CCD ORION%', 'IDEMIA TSA%', 'REG.MUNIC.OF%', 'YG TRANSPORT%',
    'WINNEBAGO CO IL%', 'OPC*%', 'BLUE WATER BRIDGE%', 'BUFFALO AND FORT ERIE%',
    'MACKINAC BRIDGE%', 'NF BRIDGE COMMISSION%', 'INTERNATIONAL BRIDGE%',
    '1000 ISLANDS BRIDGE%', 'WV PARKWAYS%', 'CTC-VIS%',
    'IN *CHESAPEAKE VEHICLE%', 'IN *GEORGIA VEHICLE%', 'PAYSIMPLY/ALBERTA INTE%',
    'ALBERTA ONE STOP REG%', 'CITY OF%PERMIT%', 'SERVICE FEE%',
    'DEPARTMENT OF TRANSPOR%', 'DOT OPERATING%', 'IN *INTEGRATED ENVIRON%',
  ]);

  // 2. Tires & Parts
  run('fleet_tires_parts', [
    'MNA*MICHELIN%', 'BB OF %', 'BAUER BUILT%', 'WW TIRE%', 'FTN TIRE%',
    'KAL-TIRE%', 'LOVE''S TIRE CARE%', 'GOODYEAR COMMERCIAL%', 'NAPA AUTO%',
    'O''REILLY%', 'CHROME WORLD%', 'PART STOP%', 'TRACTOR SUPPLY%',
    'TRACTOR-SUPPLY%', 'BUMPER TO BUMPER%', 'FORT GARRY%', 'RED FOX HEAVY%',
    '4 STATE TRUCKS%', 'CROPAC EQUIPMENT%', 'GALLES FILTER%', 'GLASVAN TRAILERS%',
    'KINGPIN TRAILERS%', 'LARSON TRUCK SALES%', 'TRUCK PRO %', 'VIKING CB RADIO%',
    'D H TIRE%', 'MTR TIRE SERVICES%', 'BLUE BEACON%', 'LOVE''S TIRE%',
  ]);

  // 3. Maintenance, Repairs & Washes
  run('fleet_maintenance', [
    '%TOWING%', '%TRUCK WASH%', '%CARWASH%', '%CAR WASH%',
    'JIFFY LUBE%', 'LUBEZONE%', '%REPAIR%', 'FREIGHTLINER%', 'KENWORTH%',
    'RUSH TRK CTR%', 'FIRST TRUCK CENTRE%', 'THE TRUCK SHOP%', 'TLG PETERBILT%',
    'QUALITY TRUCK%', 'BRANDT TRACTOR%', 'IOWA80 TRUCKSTOP SVC%',
    'ALLANS AUTOMOTIVE%', 'BERT%GARAGE%', 'COPPER RIVER AUTO%',
    'AFTERHOUR MOBILE%', 'D-TOWN DIESEL%', 'JHT SERVICE%', 'REDS MOBILE%',
    'SP KENT AUTOMOTIVE%', 'SPARKLE SUPER WASH%', 'SUDZY SPRINGS%',
    'DELTA PETRO WASH%', 'GLOBAL TRUCK WASH%', 'MASTERCLASS TRUCK%',
    'MILWAUKEE TRUCK WASH%', 'MONSTER TRUCK WASH%', 'NORTHERN TOUCH TRUCK%',
    'BROMAKEMECHANICAL%', 'ROBBYS TRACTOR%', 'CLASSIC TRUCK WASH%',
    'MCR TRUCK WASH%', 'RED BARN TRUCK WASH%', 'ACHESON TRUCK WASH%',
    'NORTHERN ALBERTA TOW%', 'DAVES TRUCK%', 'SIGN POST SERVICES%',
  ]);

  // 4. Fuel — all remaining truck stops & gas stations
  run('fleet_fuel', [
    'FLYING J%', 'PILOT %', 'LOVE''S #%', 'PETRO #%', 'PETRO-%',
    'TA #%', 'TA %', 'CENEX%', 'SHELL%', 'PHILLIPS 66%', 'EXXON%',
    'CONOCO%', 'CHEVRON%', 'ONE9 %', 'ROAD RANGER%', 'KWIK TRIP%',
    'CASEYS%', 'ALLSUPS%', 'MAVERIK%', 'SPEEDWAY%', 'QT %',
    'MARATHON%', 'AMOCO%', 'ARCO%', 'BP#%', 'CIRCLE K%', 'CITGO%',
    'MOBIL%', 'HOLIDAY STATIONS%', 'FUEL MAXX%', 'IOWA 80 TRUCKSTOP%',
    'COFFEE CUP%', 'TOOT%N TOTUM%', 'HUSKY%', 'ESSO%', 'ULTRAMAR%',
    'CEFCO%', 'HAT SIX TRAVEL%', 'PETRO ALBERTA%', 'PETRO ONTARIO%',
    'PETRO FLORENCE%', 'PETRO REMINGTON%', 'PETRO WELLS%', 'PETRO FUEL%',
    'PETRO GLADE%', 'PETRO RAPHINE%', 'PETRO-66%', 'LIVING SKY DIESEL%',
    'NORTH 60 PETRO%', 'NORTHDALE OIL%', 'VITUS ENERGY%', 'FRASERS OIL%',
    'MR FUEL%', 'CPC SCP%', 'STINKER%', 'RUTTER''S%', 'ONCUE EXPRESS%',
    'SANDHILL OIL%', 'GRASSWOOD ESSO%', 'CN TRAVEL PLAZA%', 'DUBOIS TRAVEL STOP%',
    'BASSANO ESSO%', 'CLEARWATER TRAVEL%', 'WESTERN DAKOTA ENERGY%',
    'YESWAY%', 'PUMP & PANTRY%', 'SCHATZ CROSSROADS%', 'ROSEBUD CASINO FUEL%',
    'ROSENBERG TRAVEL PLAZA%', 'SILVER CREEK TRAVEL%', 'FRONTIER TRAVEL%',
    'TONNKAWA TRAVEL%', 'BOISE STAGE STOP%', 'HERREID SUPER STOP%',
    '76 -%', 'GOLDEN GATE GAS%', 'NORTHERN ENERGY%', 'UFA RED DEER%',
    'STARO INC%', 'GOOD 2 GO STORE%', 'MUDD CREEK%', 'LITTLE SISTER%',
    'BLACKJACKS ROADHOUSE%', 'MT. VERNON FUEL%', 'PARKWAY CO-OP%',
    'TRANSCANADA TRUCK STOP%', 'SPEED PRO TRUCK STOP%', 'HIGHWAY 20 AUTO%',
    'HIGH DESERT TRUCK STOP%', 'QUICKLEES%', 'TRAVEL CENTERS%',
    'SHORTYS ONE ST%', 'SANDSTONE GAS%', 'MOOSOMIN C-STORE%',
    'TAYLOR QUIK PIK%', 'CHARLIES COUNTRY%', 'CROCKETT ENTERPRISES%',
    'PAYSIMPLY/ALBERTA FUEL%', 'GRAND ISLAND BOSS%', 'KIMBERS%',
    'JOHNNY K''S%', 'WHOA & GO%', 'TROTTERS WHOA%', 'BANNOCK PEAK%',
    'STATION 49%', 'SUPER DUPER%', 'A30 EXPRESS%', 'LEROY SHELL%',
    'HUGHES PETROLEUM%', 'FGP40055%', 'LC COOP SHELLBROOK%',
    'LLOYDMINSTER HUSKY%', 'CLAIRMONT HUSKY%', 'HUSKY TRAVEL%',
    'HUSKY LLOYDMINSTER%', 'REGINA HUSKY%', 'FLAIR DIR%', 'FLAIR IND%',
  ]);
}

// ---------------------------------------------------------------------------
// Load JSON fresh from disk every time (never use the cached module bundle)
// ---------------------------------------------------------------------------

function loadBrimData(): { employees: BrimEmployee[]; transactions: BrimTxn[] } {
  const filePath = path.join(process.cwd(), 'data', 'transactions_brim.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrimEmployee {
  id: string;
  name: string;
  department: string;
  role: string;
  title: string;
}

interface BrimTxn {
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  description: string;
}

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
  const brimData = loadBrimData();

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
  const employees = brimData.employees.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    role: 'individual_contributor',
    title: e.title,
    approval_threshold: 50,
  }));

  const insertEmployee = db.prepare(
    `INSERT INTO employees (id, name, department, role, title, approval_threshold)
     VALUES (@id, @name, @department, @role, @title, @approval_threshold)`
  );
  db.transaction(() => employees.forEach((e) => insertEmployee.run(e)))();

  // Prepare transactions
  const txns = brimData.transactions.map((t) => ({
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
    // Group by YYYY-MM so reports can be filtered by month
    event_tag: t.date.slice(0, 7), // e.g. "2025-09"
  }));

  // Insert transactions
  // NOTE: No budget data is seeded — the source XLSX contains no budget allocations.
  const insertTxn = db.prepare(
    `INSERT INTO transactions (id, employee_id, employee_name, department, amount, merchant, category, date, description, status, requires_approval, attendee_count, event_tag)
     VALUES (@id, @employee_id, @employee_name, @department, @amount, @merchant, @category, @date, @description, @status, @requires_approval, @attendee_count, @event_tag)`
  );
  db.transaction(() => txns.forEach((t) => insertTxn.run(t)))();

  // ── Reclassify transportation into fleet subcategories ──────────────────────
  remapFleetCategories(db);

  // Detect anomalies
  const anomalies = detectAnomalies(txns);
  const insertAnomaly = db.prepare(
    `INSERT INTO anomalies (id, type, transaction_ids, employee_id, description, severity, detected_at, status)
     VALUES (@id, @type, @transaction_ids, @employee_id, @description, @severity, @detected_at, @status)`
  );
  db.transaction(() => anomalies.forEach((a) => insertAnomaly.run(a)))();

  // Create pending approvals for the most recent large transactions.
  // ai_recommendation and ai_reasoning are left null — generated on demand by Claude.
  const pendingTxns = txns
    .filter((t) => t.requires_approval && t.amount >= 200)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const insertApproval = db.prepare(
    `INSERT INTO approvals (id, transaction_id, employee_id, amount, merchant, description, ai_recommendation, ai_reasoning, status, created_at)
     VALUES (@id, @transaction_id, @employee_id, @amount, @merchant, @description, NULL, NULL, @status, @created_at)`
  );

  db.transaction(() => {
    pendingTxns.forEach((t) => {
      insertApproval.run({
        id: `appr-${crypto.randomUUID().slice(0, 8)}`,
        transaction_id: t.id,
        employee_id: t.employee_id,
        amount: t.amount,
        merchant: t.merchant,
        description: t.description,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    });
  })();

  return {
    employees: employees.length,
    transactions: txns.length,
    budgets: 0,
    anomalies: anomalies.length,
  };
}
