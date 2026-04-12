import { getDb } from '@/lib/db';
import {
  queryTransactions,
  insertViolation,
  detectSplitCharges,
  type Transaction,
} from '@/lib/db/queries';
import { getCategoryLimit, getMealLimit, isRestrictedMerchant } from '@/lib/policy/rules';

export const dynamic = 'force-dynamic';

interface RawViolation {
  transaction_id: string;
  employee_id: string;
  violation_type: string;
  description: string;
  amount?: number;
  limit?: number;
}

export async function POST() {
  try {
    const db = getDb();

    // Clear existing open violations before re-scanning (idempotent)
    db.prepare("DELETE FROM violations WHERE status = 'open'").run();

    const rawViolations: RawViolation[] = [];

    // 1. Detect amount violations: check each transaction against category limits
    const transactions = queryTransactions({}) as Transaction[];

    for (const txn of transactions) {
      // Check meal limits (attendee-aware)
      const category = txn.category.toLowerCase();
      const isMealCategory = ['meals', 'team meals', 'food & beverage', 'client entertainment'].some(
        (name) => category.includes(name.toLowerCase())
      );

      if (isMealCategory) {
        const limit = getMealLimit(txn.attendee_count);
        const perPersonAmount = txn.attendee_count > 0 ? txn.amount / txn.attendee_count : txn.amount;
        if (perPersonAmount > limit) {
          rawViolations.push({
            transaction_id: txn.id,
            employee_id: txn.employee_id,
            violation_type: 'over_limit',
            description: `${txn.employee_name} charged $${txn.amount.toFixed(2)} at ${txn.merchant} (${category}) — $${perPersonAmount.toFixed(2)}/person exceeds $${limit} meal limit`,
            amount: txn.amount,
            limit,
          });
        }
      } else {
        const limit = getCategoryLimit(txn.category);
        if (limit !== null && txn.amount > limit) {
          rawViolations.push({
            transaction_id: txn.id,
            employee_id: txn.employee_id,
            violation_type: 'over_limit',
            description: `${txn.employee_name} charged $${txn.amount.toFixed(2)} at ${txn.merchant} (${txn.category}) — exceeds $${limit} category limit`,
            amount: txn.amount,
            limit,
          });
        }
      }

      // 3. Detect restricted merchants
      if (isRestrictedMerchant(txn.merchant)) {
        rawViolations.push({
          transaction_id: txn.id,
          employee_id: txn.employee_id,
          violation_type: 'restricted_merchant',
          description: `${txn.employee_name} charged $${txn.amount.toFixed(2)} at '${txn.merchant}' — restricted merchant`,
          amount: txn.amount,
        });
      }
    }

    // 2. Detect split charges
    const splitCharges = detectSplitCharges();
    for (const split of splitCharges) {
      const txnIds = split.transactions.map((t) => t.id).join(',');
      rawViolations.push({
        transaction_id: txnIds,
        employee_id: split.employee_id,
        violation_type: 'split_charge',
        description: `${split.employee_name} split a $${split.total.toFixed(2)} charge at ${split.merchant} into ${split.transactions.length} payments on ${split.date} — total exceeds $500 approval threshold`,
      });
    }

    // 5. Call Claude to rank severity and write descriptions
    let rankedViolations: Array<{
      transaction_id: string;
      employee_id: string;
      violation_type: string;
      severity: string;
      description: string;
    }> = [];

    if (rawViolations.length > 0) {
      // Rule-based severity ranking (no API cost)
      rankedViolations = rawViolations.map((v) => {
        let severity = 'medium';
        if (v.violation_type === 'restricted_merchant') {
          severity = 'critical';
        } else if (v.violation_type === 'split_charge') {
          severity = 'high';
        } else if (v.violation_type === 'over_limit' && v.amount && v.limit) {
          const ratio = v.amount / v.limit;
          if (ratio >= 3) severity = 'critical';
          else if (ratio >= 2) severity = 'high';
          else if (ratio >= 1.5) severity = 'medium';
          else severity = 'low';
        }
        return {
          transaction_id: v.transaction_id,
          employee_id: v.employee_id,
          violation_type: v.violation_type,
          severity,
          description: v.description,
        };
      });
    }

    // 6. Insert each violation into the DB (check for duplicates)
    const now = new Date().toISOString();
    for (const v of rankedViolations) {
      const existing = db
        .prepare('SELECT id FROM violations WHERE transaction_id = ?')
        .get(v.transaction_id);

      if (!existing) {
        insertViolation({
          transaction_id: v.transaction_id,
          employee_id: v.employee_id,
          violation_type: v.violation_type,
          severity: v.severity,
          description: v.description,
          detected_at: now,
          status: 'open',
        });
      }
    }

    // 7. Return the final violations list
    return Response.json({
      success: true,
      violations_found: rankedViolations.length,
      violations: rankedViolations,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Compliance scan failed' },
      { status: 500 }
    );
  }
}
