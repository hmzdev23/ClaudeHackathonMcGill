import { getDb } from '@/lib/db';
import {
  getAnomalies,
  insertAnomaly,
  detectSplitCharges,
  detectDuplicates,
  detectRoundNumbers,
  detectVelocitySpikes,
  detectUnusualMerchants,
} from '@/lib/db/queries';
import { isRestrictedMerchant } from '@/lib/policy/rules';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const anomalies = getAnomalies();
    return Response.json({ anomalies });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load anomalies' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const allAnomalies: Array<{
      type: string;
      transaction_ids: string;
      employee_id: string;
      description: string;
      severity: string;
    }> = [];

    // 1. Detect split charges
    const splitCharges = detectSplitCharges();
    for (const split of splitCharges) {
      const txnIds = split.transactions.map((t) => t.id).join(',');
      const existing = db
        .prepare('SELECT id FROM anomalies WHERE transaction_ids = ? AND type = ?')
        .get(txnIds, 'split_charge');

      if (!existing) {
        const count = split.transactions.length;
        const description = `${split.employee_name} split a $${split.total.toFixed(2)} charge at ${split.merchant} into ${count} payments of $${(split.total / count).toFixed(2)} on ${split.date} — total exceeds $500 approval threshold`;
        insertAnomaly({
          type: 'split_charge',
          transaction_ids: txnIds,
          employee_id: split.employee_id,
          description,
          severity: 'high',
          detected_at: now,
          status: 'open',
        });
        allAnomalies.push({
          type: 'split_charge',
          transaction_ids: txnIds,
          employee_id: split.employee_id,
          description,
          severity: 'high',
        });
      }
    }

    // 2. Detect duplicates
    const duplicates = detectDuplicates();
    for (const dup of duplicates) {
      const txnIds = `${dup.t1_id},${dup.t2_id}`;
      const existing = db
        .prepare('SELECT id FROM anomalies WHERE transaction_ids = ? AND type = ?')
        .get(txnIds, 'duplicate');

      if (!existing) {
        // Get transaction dates for the description
        const t1 = db.prepare('SELECT date FROM transactions WHERE id = ?').get(dup.t1_id) as { date: string } | undefined;
        const t2 = db.prepare('SELECT date FROM transactions WHERE id = ?').get(dup.t2_id) as { date: string } | undefined;
        const t1Date = t1?.date || 'unknown';
        const t2Date = t2?.date || 'unknown';
        const description = `${dup.employee_name} charged $${dup.amount} at ${dup.merchant} twice within ${dup.days_apart} days (${t1Date} and ${t2Date})`;
        insertAnomaly({
          type: 'duplicate',
          transaction_ids: txnIds,
          employee_id: dup.employee_id,
          description,
          severity: 'medium',
          detected_at: now,
          status: 'open',
        });
        allAnomalies.push({
          type: 'duplicate',
          transaction_ids: txnIds,
          employee_id: dup.employee_id,
          description,
          severity: 'medium',
        });
      }
    }

    // 3. Detect round numbers
    const roundNumbers = detectRoundNumbers();
    for (const rn of roundNumbers) {
      const txnIds = rn.transactions.map((t) => t.id).join(',');
      const existing = db
        .prepare('SELECT id FROM anomalies WHERE employee_id = ? AND type = ?')
        .get(rn.employee_id, 'round_number');

      if (!existing) {
        const avgAmount = rn.transactions.reduce((sum, t) => sum + t.amount, 0) / rn.transactions.length;
        const description = `${rn.employee_name} has ${rn.count} round-number charges ($${avgAmount.toFixed(0)} each) — may indicate inflated expense claims`;
        insertAnomaly({
          type: 'round_number',
          transaction_ids: txnIds,
          employee_id: rn.employee_id,
          description,
          severity: 'medium',
          detected_at: now,
          status: 'open',
        });
        allAnomalies.push({
          type: 'round_number',
          transaction_ids: txnIds,
          employee_id: rn.employee_id,
          description,
          severity: 'medium',
        });
      }
    }

    // 4. Detect velocity spikes
    const velocitySpikes = detectVelocitySpikes();
    for (const spike of velocitySpikes) {
      const spikeKey = `${spike.employee_id}:${spike.spike_date}`;
      const existing = db
        .prepare("SELECT id FROM anomalies WHERE employee_id = ? AND type = 'velocity_spike' AND description LIKE ?")
        .get(spike.employee_id, `%${spike.spike_date}%`);

      if (!existing) {
        const description = `${spike.employee_name} spent $${spike.daily_spend.toFixed(2)} on ${spike.spike_date} — ${(spike.daily_spend / spike.avg_daily).toFixed(1)}x their $${spike.avg_daily.toFixed(2)} daily average`;
        insertAnomaly({
          type: 'velocity_spike',
          transaction_ids: spikeKey,
          employee_id: spike.employee_id,
          description,
          severity: 'high',
          detected_at: now,
          status: 'open',
        });
        allAnomalies.push({
          type: 'velocity_spike',
          transaction_ids: spikeKey,
          employee_id: spike.employee_id,
          description,
          severity: 'high',
        });
      }
    }

    // 5. Detect unusual merchants — filter for restricted keywords
    const unusualMerchants = detectUnusualMerchants();
    for (const um of unusualMerchants) {
      const txnId = um.transaction.id;
      const existing = db
        .prepare('SELECT id FROM anomalies WHERE transaction_ids = ? AND type = ?')
        .get(txnId, 'unusual_merchant');

      if (!existing) {
        const severity = isRestrictedMerchant(um.transaction.merchant) ? 'critical' : 'low';
        const description = `${um.employee_name} charged $${um.transaction.amount} at '${um.transaction.merchant}' on ${um.transaction.date} — first-time merchant not seen in transaction history`;
        insertAnomaly({
          type: 'unusual_merchant',
          transaction_ids: txnId,
          employee_id: um.employee_id,
          description,
          severity,
          detected_at: now,
          status: 'open',
        });
        allAnomalies.push({
          type: 'unusual_merchant',
          transaction_ids: txnId,
          employee_id: um.employee_id,
          description,
          severity,
        });
      }
    }

    // Return all anomalies (stored + newly detected)
    const storedAnomalies = getAnomalies();

    return Response.json({
      success: true,
      new_anomalies: allAnomalies.length,
      anomalies: storedAnomalies,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Anomaly detection failed' },
      { status: 500 }
    );
  }
}
