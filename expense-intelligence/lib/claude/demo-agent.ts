/**
 * Demo mode — pre-built responses that look real without burning API credits.
 * Swap back to real agent by removing the demo imports in API routes.
 */
import type { AgentStreamEvent, ActionPlan } from './agent';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Autopilot ─────────────────────────────────────────────────────────────────

const DEMO_ACTION_PLAN: ActionPlan = {
  summary:
    'Analysis of 9 cardholders across Fleet Operations reveals 3 pending approvals, 2 tip-policy violations, and an anomalous fuel concentration risk for emp-001. Total flagged spend is $12,840 — overall risk is medium, with one urgent card-sharing pattern requiring immediate review.',
  risk_level: 'medium',
  actions: [
    {
      id: 'action-001',
      type: 'approve_expense',
      priority: 'urgent',
      title: 'Approve $1,247 fuel — Marcus Chen, Shell Depot',
      reasoning:
        'Commercial fuel fill for route coverage. Amount within fleet policy, employee has clean prior record. Safe to approve.',
      target_id: 'apr-001',
      amount: 1247.0,
      employee: 'Marcus Chen',
      department: 'Fleet Operations',
      auto_executable: true,
    },
    {
      id: 'action-002',
      type: 'deny_expense',
      priority: 'urgent',
      title: 'Deny $89 meal — 22% tip exceeds 20% policy limit',
      reasoning:
        'Tip of $16.38 on a $74.62 client meal is 22%, exceeding the Brim 20% meal-gratuity limit. Requires resubmission with corrected amount.',
      target_id: 'apr-002',
      amount: 89.0,
      employee: 'Sarah Rodriguez',
      department: 'Logistics',
      auto_executable: true,
    },
    {
      id: 'action-003',
      type: 'approve_expense',
      priority: 'high',
      title: 'Approve $312 highway permits — Ahmed Patel',
      reasoning:
        'Multi-province permit bundle for Q2 route expansion. Fully documented, below category limit, no violations on record.',
      target_id: 'apr-003',
      amount: 312.0,
      employee: 'Ahmed Patel',
      department: 'Fleet Operations',
      auto_executable: true,
    },
    {
      id: 'action-004',
      type: 'anomaly_alert',
      priority: 'high',
      title: 'Fuel anomaly — emp-001 filled up 4× in 72 hours',
      reasoning:
        'Marcus Chen logged 4 fuel transactions totaling $3,240 across 3 stations within 72 hours — 3.2σ above the peer baseline. Pattern is consistent with card sharing or tank-topping for non-company vehicles.',
      target_id: undefined,
      amount: 3240.0,
      employee: 'Marcus Chen',
      department: 'Fleet Operations',
      auto_executable: false,
    },
    {
      id: 'action-005',
      type: 'compliance_alert',
      priority: 'high',
      title: 'Alcohol charges flagged — James Wilson, Riverside Hotel',
      reasoning:
        '2 charges totaling $94 at Riverside Hotel Bar with no client-meeting documentation. Brim policy prohibits alcohol unless accompanying a customer. Escalate for explanation.',
      target_id: undefined,
      amount: 94.0,
      employee: 'James Wilson',
      department: 'Sales',
      auto_executable: false,
    },
    {
      id: 'action-006',
      type: 'budget_alert',
      priority: 'medium',
      title: 'Fleet Ops fuel budget 87% used — 18 days remaining',
      reasoning:
        'Fleet Operations has consumed $43,500 of $50,000 fuel budget. At the current $820/day burn rate, projected monthly overage is $2,160. Consider a temporary spend freeze on non-essential top-ups.',
      target_id: undefined,
      amount: 43500.0,
      employee: undefined,
      department: 'Fleet Operations',
      auto_executable: false,
    },
    {
      id: 'action-007',
      type: 'vendor_opportunity',
      priority: 'low',
      title: 'Consolidate to 2 fuel vendors — potential 8% saving',
      reasoning:
        'Fleet is split across 6 fuel vendors. Consolidating volume to Shell and Petro-Canada (top 2 by spend) could unlock a volume-discount rate of ~8%, saving approximately $3,200/month.',
      target_id: undefined,
      employee: undefined,
      department: 'Fleet Operations',
      auto_executable: false,
    },
  ],
  insights: [
    'Total flagged spend this period: $12,840 across 9 active cardholders',
    'emp-001 (Marcus Chen) drives 38% of all fuel spend — highest single-cardholder concentration',
    'Tip violations dropped 40% vs last month, but 2 new alcohol-related flags emerged in Sales',
    'Fleet Operations fuel budget on pace to overshoot by $2,160 at current burn rate',
    'Permits & tolls categories are 100% policy-compliant — no violations across any cardholder',
  ],
};

const DEMO_TOOL_SEQUENCE: { tool: string; delay: number }[] = [
  { tool: 'get_dashboard_kpis', delay: 950 },
  { tool: 'get_pending_approvals', delay: 750 },
  { tool: 'get_violations', delay: 820 },
  { tool: 'detect_anomalies', delay: 1050 },
  { tool: 'get_budget_status', delay: 700 },
  { tool: 'get_employee_profile', delay: 600 },
  { tool: 'render_visualization', delay: 500 },
];

export function runDemoAutopilotStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      for (const { tool, delay } of DEMO_TOOL_SEQUENCE) {
        send({ type: 'tool_call', tool, content: tool });
        await sleep(delay);
      }

      // Brief pause before the plan
      await sleep(400);
      send({ type: 'action_plan', plan: DEMO_ACTION_PLAN });
      send({ type: 'done' });
      controller.close();
    },
  });
}

// ── Query ─────────────────────────────────────────────────────────────────────

interface DemoResponse {
  keywords: string[];
  text: string;
  visualization?: AgentStreamEvent['visualization'];
}

const DEMO_QUERY_RESPONSES: DemoResponse[] = [
  {
    keywords: ['top spend', 'highest spend', 'biggest spend', 'most spend', 'top spender', 'who spent', 'highest amount'],
    visualization: {
      type: 'bar',
      title: 'Top Spenders — Current Period',
      data: [
        { employee: 'Marcus Chen', amount: 18420 },
        { employee: 'Sarah Rodriguez', amount: 8940 },
        { employee: 'James Wilson', amount: 6820 },
        { employee: 'Ahmed Patel', amount: 5670 },
        { employee: 'Priya Sharma', amount: 3980 },
        { employee: 'Lisa Nguyen', amount: 3240 },
      ],
      x_key: 'employee',
      y_key: 'amount',
      format: 'currency',
    },
    text: `Here are the **top spenders** for the current period:

**1. Marcus Chen (Fleet Operations) — $18,420**
Primarily fuel ($14,200) and road permits ($4,220). His spend is 3.2× the fleet average — flagged for anomaly review due to 4 fuel fill-ups in 72 hours across 3 different stations.

**2. Sarah Rodriguez (Logistics) — $8,940**
Fuel ($5,100), client meals ($2,340), tolls ($1,500). 3 tip-related policy flags on meal expenses this period.

**3. James Wilson (Sales) — $6,820**
Hotel stays ($3,200), client dinners ($2,100), fuel ($1,520). 2 alcohol charges under review — no customer meeting documented.

**4. Ahmed Patel (Fleet Operations) — $5,670**
Consistent fuel spend, fully compliant. No violations on record.

**5. Priya Sharma (Dispatch) — $3,980**
Mixed spend: permits, tolls, minor meals. One $127 transaction pending approval above the $50 threshold.

Marcus Chen's concentration (38% of total fleet spend) is the key risk to watch.`,
  },
  {
    keywords: ['violation', 'compliance', 'policy', 'breach', 'non-compliant', 'flag'],
    text: `Here's a summary of **current policy violations**:

**Active Violations: 7**

🔴 **High Severity (2)**
- **James Wilson** — $94 in alcohol charges at Riverside Hotel Bar. No client meeting documented. Policy prohibits alcohol unless accompanying a customer.
- **Sarah Rodriguez** — 22% tip on $74.62 client meal. Exceeds Brim's 20% meal-gratuity limit. Resubmission required.

🟡 **Medium Severity (3)**
- **Marcus Chen** — 4 fuel transactions in 72 hours across 3 stations. Possible card sharing ($3,240 total). Under anomaly review.
- **Priya Sharma** — $127 expense exceeds $50 approval threshold without prior manager sign-off.
- **David Kim** — Merchant categorized as personal-use adjacent. Missing business-purpose justification.

🟢 **Low Severity (2)**
- **Ahmed Patel** — Receipt missing for one $43 fuel fill-up.
- **Lisa Nguyen** — Office supply expense submitted under wrong category.

**Repeat Offender:** Sarah Rodriguez has accumulated 4 tip violations in the last 90 days. Recommend a 1:1 policy refresher before further client-entertainment spend is approved.`,
  },
  {
    keywords: ['budget', 'over budget', 'remaining', 'limit', 'allocation', 'department spend'],
    visualization: {
      type: 'bar',
      title: 'Department Budget Utilization',
      data: [
        { department: 'Fleet Ops', utilization: 87 },
        { department: 'Logistics', utilization: 71 },
        { department: 'Sales', utilization: 63 },
        { department: 'Dispatch', utilization: 48 },
        { department: 'Admin', utilization: 34 },
      ],
      x_key: 'department',
      y_key: 'utilization',
      format: 'percent',
    },
    text: `Here's the **budget health** across all departments:

**Fleet Operations — ⚠️ 87% ($43,500 / $50,000)**
18 days remaining in the period. At the current $820/day burn rate, projected overage is **$2,160**. Recommend a temporary freeze on discretionary fuel top-ups.

**Logistics — 71% ($35,500 / $50,000)**
On track. Spend is slightly elevated due to extra tolls from the Q1 rerouting. No action needed.

**Sales — 63% ($31,500 / $50,000)**
Normal pace. Note: 2 alcohol charges ($94) are currently flagged and may be clawed back, which would bring utilization to 62%.

**Dispatch — 48% ($24,000 / $50,000)**
Well within budget. Efficient month.

**Administration — 34% ($6,800 / $20,000)**
Far under budget. Permit renewal costs expected in the last week will bring this to ~60%.

**Overall portfolio:** $141,300 of $220,000 allocated (64%) with 18 days remaining. Fleet Operations is the only department at risk.`,
  },
  {
    keywords: ['anomal', 'unusual', 'suspicious', 'weird', 'outlier', 'strange'],
    text: `Here are the **anomalies** detected in the current dataset:

**🔴 High Confidence Anomalies (2)**

**1. Marcus Chen — Fuel Frequency Spike**
4 fuel transactions ($3,240 total) at 3 different stations within a 72-hour window. Peer baseline for this role is 1 fill-up every 2 days. This pattern sits **3.2 standard deviations** above average and is the clearest signal in the dataset. Most likely explanation: card being used by additional drivers, or deliberate tank-topping for non-company vehicles.

**2. James Wilson — Off-hours Hotel Charges**
3 hotel room charges on weekends ($1,140 total) with no corresponding travel requests in the system. Sales team doesn't have weekend travel obligations for this period.

**🟡 Medium Confidence (1)**

**David Kim — Merchant Pattern**
2 transactions at a merchant whose MCC code (5941 — Sporting Goods) doesn't match any documented business purpose. Amounts are small ($67 total) but the pattern is consistent over 3 months.

**Recommendation:** Prioritize a conversation with Marcus Chen's direct manager about the fueling pattern — the card-sharing hypothesis, if confirmed, is a policy violation that affects insurance liability.`,
  },
  {
    keywords: ['overview', 'summary', 'status', 'how are we', 'general', 'overall', 'report', 'tell me about'],
    visualization: {
      type: 'bar',
      title: 'Monthly Spend Trend',
      data: [
        { month: 'Oct 2025', amount: 38200 },
        { month: 'Nov 2025', amount: 41600 },
        { month: 'Dec 2025', amount: 36900 },
        { month: 'Jan 2026', amount: 44100 },
        { month: 'Feb 2026', amount: 47800 },
        { month: 'Mar 2026', amount: 52340 },
      ],
      x_key: 'month',
      y_key: 'amount',
      format: 'currency',
    },
    text: `Here's a **full portfolio overview** for the current period:

**Spend Summary**
- Total spend (YTD): $260,940 across 9 active cardholders
- This month so far: $52,340 — up 9.5% vs February
- Largest category: Fuel (58%), followed by Permits (22%), Meals (12%), Tolls (8%)

**Compliance Health**
- 7 active violations (2 high, 3 medium, 2 low)
- 3 pending approvals totaling $1,648
- Repeat offender alert: Sarah Rodriguez (4 tip violations in 90 days)

**Budget Status**
- Fleet Operations at 87% — on pace to overshoot by $2,160
- All other departments tracking normally
- Portfolio overall at 64% with 18 days remaining

**Key Risks**
1. Marcus Chen's fuel pattern (card sharing hypothesis) — $3,240 flagged
2. James Wilson alcohol charges — $94, no documentation
3. Fleet Ops budget — projected $2,160 overage

**Positive Signals**
- Permits & tolls spend is 100% clean
- Ahmed Patel and Lisa Nguyen have zero violations
- Tip violations trending down 40% month-over-month`,
  },
  {
    keywords: ['fuel', 'gas', 'petrol', 'station', 'fill'],
    text: `Here's a breakdown of **fuel spend** across the fleet:

**Total fuel spend this period: $30,360** (58% of all cardholder spend)

**By Employee:**
- Marcus Chen: $14,200 (47% of fuel spend) ⚠️
- Ahmed Patel: $6,100 (20%)
- Sarah Rodriguez: $5,100 (17%)
- James Wilson: $1,520 (5%)
- Others: $3,440 (11%)

**Top Fuel Vendors:**
1. Shell — $11,200 (37%)
2. Petro-Canada — $8,900 (29%)
3. Esso — $5,400 (18%)
4. Others (3 vendors) — $4,860 (16%)

**Anomaly Flag:** Marcus Chen's $14,200 is 3.8× the average fleet driver's fuel spend. The 4-fill-up-in-72-hours pattern at 3 different stations is the primary concern.

**Opportunity:** Consolidating from 6 fuel vendors to the top 2 (Shell + Petro-Canada) would capture ~66% of volume and likely unlock a commercial fleet discount of 6–8%, saving $1,800–$2,400/month.`,
  },
  {
    keywords: ['approval', 'pending', 'approve', 'waiting', 'review'],
    text: `There are **3 pending approvals** requiring your attention:

**1. Marcus Chen — $1,247 | Shell Depot | Fuel** ✅ Recommend Approve
Commercial fuel fill for route coverage. Within fleet limits, clean prior record, proper documentation. Safe to process.

**2. Sarah Rodriguez — $89 | La Maison Bistro | Client Meal** ❌ Recommend Deny
Tip of $16.38 on $74.62 = 22% gratuity. Brim policy caps meal tips at 20%. Requires cardholder to resubmit with a corrected amount ($74.62 + max $14.92 tip = $89.54 → deny as-submitted).

**3. Ahmed Patel — $312 | Ontario MTO | Highway Permits** ✅ Recommend Approve
Multi-province permit bundle for Q2 route. Fully documented, below category limit, zero violations on record.

**Summary:** 2 approvals, 1 denial. Total auto-approvable: $1,559. Resubmission required for $89 Sarah Rodriguez meal.`,
  },
];

const FALLBACK_RESPONSE = `I've analyzed the expense data for your 9 cardholders. Here's what stands out:

The portfolio currently has **$52,340 in spend this period** across fuel (58%), permits (22%), meals (12%), and tolls (8%). Fleet Operations is tracking 87% through its monthly budget with 18 days remaining — the only department at risk of overage.

There are **7 active policy violations** and **3 pending approvals** totaling $1,648. The most pressing issue is Marcus Chen's fuel pattern: 4 fill-ups in 72 hours across 3 stations suggests possible card sharing, which creates insurance liability exposure.

What specific aspect would you like me to dig into? I can pull up top spenders, budget status, violations, anomalies, or pending approvals in detail.`;

function matchResponse(message: string): DemoResponse {
  const lower = message.toLowerCase();
  for (const r of DEMO_QUERY_RESPONSES) {
    if (r.keywords.some((kw) => lower.includes(kw))) return r;
  }
  return { keywords: [], text: FALLBACK_RESPONSE };
}

async function streamText(
  text: string,
  send: (e: AgentStreamEvent) => void,
  chunkSize = 6,
  delayMs = 18
) {
  // Stream in small chunks to simulate real token streaming
  for (let i = 0; i < text.length; i += chunkSize) {
    send({ type: 'text_delta', content: text.slice(i, i + chunkSize) });
    await sleep(delayMs);
  }
}

export function runDemoQueryStream(message: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      // Simulate tool call + brief "thinking" delay
      send({ type: 'tool_call', tool: 'query_transactions', content: 'query_transactions' });
      await sleep(600);

      const match = matchResponse(message);

      if (match.visualization) {
        send({ type: 'visualization', visualization: match.visualization });
        await sleep(150);
      }

      await streamText(match.text, send);
      send({ type: 'done' });
      controller.close();
    },
  });
}

// ── Non-streaming (compliance AI analysis, reports) ───────────────────────────

export function getDemoComplianceAnalysis(
  hasViolations: boolean,
  amount: number,
  merchant: string,
  category: string
): string {
  if (!hasViolations) {
    return `This ${category} expense of $${amount.toFixed(2)} at ${merchant} appears fully compliant with Brim policy. The amount is within category limits${amount <= 50 ? ' and below the $50 approval threshold' : ''}, and the merchant type aligns with expected ${category} spend. No action required — safe to approve.`;
  }
  return `This ${category} expense of $${amount.toFixed(2)} at ${merchant} has triggered a policy flag. Review the violations listed above before approving. If this was a legitimate business expense, the cardholder should resubmit with corrected amounts and appropriate documentation. Expenses that consistently exceed policy limits should be addressed through a 1:1 conversation to prevent repeat occurrences.`;
}

export function getDemoApprovalRecommendation(
  amount: number,
  merchant: string,
  category: string,
  violationCount: number
): { recommendation: 'approve' | 'deny'; reasoning: string } {
  if (violationCount > 0) {
    return {
      recommendation: 'deny',
      reasoning: `This ${category} charge of $${amount.toFixed(2)} at ${merchant} has ${violationCount} policy violation${violationCount > 1 ? 's' : ''} flagged. Resubmission with corrected amounts and appropriate documentation is required before this expense can be approved.`,
    };
  }
  return {
    recommendation: 'approve',
    reasoning: `The $${amount.toFixed(2)} ${category} charge at ${merchant} is within policy limits and consistent with normal spend patterns for this cardholder. No violations detected — safe to approve.`,
  };
}

export function getDemoReportNarrative(
  employeeName: string,
  department: string,
  total: number,
  count: number,
  eventTag?: string
): string {
  return `This expense report covers ${count} transaction${count !== 1 ? 's' : ''} totaling $${total.toFixed(2)} submitted by ${employeeName} (${department})${eventTag ? ` for ${eventTag}` : ''}. The spend profile is consistent with ${department} operational norms, primarily driven by fuel and permit-related charges which represent the core cost categories for this role. All high-value transactions have been cross-referenced against the Brim expense policy; any items requiring manager sign-off are flagged in the line items below. Overall, the expense pattern reflects standard business activity with no significant outliers beyond what has already been identified in the compliance review.`;
}
