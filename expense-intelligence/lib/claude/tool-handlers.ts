import {
  queryTransactions,
  getEmployeeProfile,
  getBudgetStatus,
  getViolationsSummary,
  getAnomalies,
  getDashboardKpis,
  getTransactionsForReport,
  detectSplitCharges,
  detectDuplicates,
  detectRoundNumbers,
  detectVelocitySpikes,
  detectUnusualMerchants,
} from '../db/queries';

import {
  isRestrictedMerchant,
  getCategoryLimit,
  getMealLimit,
  requiresApproval,
  POLICY,
} from '../policy/rules';

// ---------------------------------------------------------------------------
// Central tool dispatcher
// ---------------------------------------------------------------------------

export function handleToolCall(
  toolName: string,
  input: Record<string, unknown>
): unknown {
  switch (toolName) {
    case 'query_transactions':
      return queryTransactions(
        {
          department: input.department as string | undefined,
          employee_id: input.employee_id as string | undefined,
          category: input.category as string | undefined,
          date_from: input.date_from as string | undefined,
          date_to: input.date_to as string | undefined,
          min_amount: input.min_amount as number | undefined,
          max_amount: input.max_amount as number | undefined,
          status: input.status as string | undefined,
          merchant: input.merchant as string | undefined,
        },
        {
          group_by: input.group_by as string | undefined,
          order_by: input.order_by as string | undefined,
          // Default cap to prevent blowing the 10k token/min rate limit
          limit: (input.limit as number | undefined) ?? 30,
        }
      );

    case 'get_employee_profile':
      return getEmployeeProfile(
        input.employee_id as string,
        (input.lookback_days as number) ?? 90,
        (input.include_violations as boolean) ?? true
      );

    case 'get_budget_status':
      return getBudgetStatus(
        input.department as string | undefined,
        input.period as string | undefined
      );

    case 'check_compliance': {
      const amount = input.amount as number;
      const merchant = input.merchant as string;
      const category = input.category as string;
      const attendee_count = (input.attendee_count as number) ?? 1;

      const issues: Array<{ rule: string; severity: string; detail: string }> = [];

      // 1. Restricted merchant check
      if (isRestrictedMerchant(merchant)) {
        issues.push({
          rule: 'restricted_merchant',
          severity: 'critical',
          detail: `"${merchant}" matches restricted merchant keywords: ${POLICY.restricted_merchant_keywords.join(', ')}`,
        });
      }

      // 2. Category limit check
      const isMealCategory = POLICY.meal_category_names.some((n) =>
        category.toLowerCase().includes(n.toLowerCase())
      );

      if (isMealCategory) {
        const limit = getMealLimit(attendee_count);
        const perPerson = attendee_count > 0 ? amount / attendee_count : amount;
        if (perPerson > limit) {
          issues.push({
            rule: 'over_limit',
            severity: perPerson > limit * 2 ? 'high' : 'medium',
            detail: `Meal cost per person ($${perPerson.toFixed(2)}) exceeds ${attendee_count >= 2 ? 'team' : 'solo'} meal limit of $${limit}`,
          });
        }
      } else {
        const limit = getCategoryLimit(category);
        if (limit !== null && amount > limit) {
          const overPct = ((amount - limit) / limit) * 100;
          issues.push({
            rule: 'over_limit',
            severity: overPct > 100 ? 'high' : overPct > 50 ? 'medium' : 'low',
            detail: `$${amount.toFixed(2)} exceeds ${category} limit of $${limit} (${overPct.toFixed(0)}% over)`,
          });
        }
      }

      // 3. Approval requirement
      const needsApproval = requiresApproval(amount);

      return {
        compliant: issues.length === 0,
        requires_approval: needsApproval,
        issues,
        policy_summary: {
          approval_threshold: POLICY.approval_threshold,
          applied_limit: isMealCategory
            ? getMealLimit(attendee_count)
            : getCategoryLimit(category),
        },
      };
    }

    case 'get_violations':
      return getViolationsSummary({
        employee_id: input.employee_id as string | undefined,
        violation_type: input.violation_type as string | undefined,
        severity: input.severity as string | undefined,
        status: input.status as string | undefined,
      });

    case 'detect_anomalies': {
      const anomalyType = (input.type as string) ?? 'all';
      const results: Record<string, unknown> = {};

      if (anomalyType === 'all' || anomalyType === 'split_charge') {
        results.split_charges = detectSplitCharges();
      }
      if (anomalyType === 'all' || anomalyType === 'duplicate') {
        results.duplicates = detectDuplicates();
      }
      if (anomalyType === 'all' || anomalyType === 'round_number') {
        results.round_numbers = detectRoundNumbers();
      }
      if (anomalyType === 'all' || anomalyType === 'velocity') {
        results.velocity_spikes = detectVelocitySpikes();
      }
      if (anomalyType === 'all' || anomalyType === 'unusual_merchant') {
        results.unusual_merchants = detectUnusualMerchants();
      }

      // Also fetch stored anomalies
      results.stored_anomalies = getAnomalies(
        anomalyType !== 'all' ? { type: anomalyType } : {}
      );

      return results;
    }

    case 'get_dashboard_kpis':
      return getDashboardKpis();

    case 'get_expense_report_data':
      return getTransactionsForReport(
        input.employee_id as string,
        input.event_tag as string | undefined
      );

    case 'render_visualization':
      // Returns the spec as-is — the agent loop extracts it and sends it to the frontend
      return { _visualization: input };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
