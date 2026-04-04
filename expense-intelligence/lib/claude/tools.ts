import type Anthropic from '@anthropic-ai/sdk';

type Tool = Anthropic.Messages.Tool;

export const EXPENSE_TOOLS: Tool[] = [
  {
    name: 'query_transactions',
    description:
      'Query expense transactions with flexible filters. Can group by column for aggregated results. Returns raw transaction rows or aggregated counts/totals.',
    input_schema: {
      type: 'object' as const,
      properties: {
        department: { type: 'string', description: 'Filter by department name' },
        employee_id: { type: 'string', description: 'Filter by employee ID (e.g. emp-001)' },
        category: { type: 'string', description: 'Filter by expense category' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        min_amount: { type: 'number', description: 'Minimum transaction amount' },
        max_amount: { type: 'number', description: 'Maximum transaction amount' },
        status: { type: 'string', description: 'Transaction status filter' },
        merchant: { type: 'string', description: 'Merchant name search (partial match)' },
        group_by: {
          type: 'string',
          enum: ['department', 'employee_id', 'employee_name', 'category', 'merchant', 'status', 'date', 'event_tag'],
          description: 'Group results by this column for aggregated stats',
        },
        order_by: { type: 'string', description: 'SQL ORDER BY clause (e.g. "amount DESC")' },
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'get_employee_profile',
    description:
      'Get a comprehensive profile for an employee including spending history, top categories, violation count, average transaction, total spent, and peer comparison.',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id: { type: 'string', description: 'Employee ID (e.g. emp-001)' },
        lookback_days: { type: 'number', description: 'Number of days to look back (default 90)' },
        include_violations: { type: 'boolean', description: 'Whether to include violation count' },
      },
      required: ['employee_id'],
    },
  },
  {
    name: 'get_budget_status',
    description:
      'Get budget status for departments including allocated, spent, remaining, percent used, and projected end-of-period spending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        department: { type: 'string', description: 'Filter by department (omit for all)' },
        period: { type: 'string', description: 'Budget period like "2026-Q1" (defaults to current quarter)' },
      },
    },
  },
  {
    name: 'check_compliance',
    description:
      'Check a transaction or set of transactions against company expense policy. Returns violations found.',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id: { type: 'string', description: 'Employee ID to check compliance for' },
        category: { type: 'string', description: 'Expense category' },
        amount: { type: 'number', description: 'Transaction amount' },
        merchant: { type: 'string', description: 'Merchant name' },
        attendee_count: { type: 'number', description: 'Number of attendees (for meal limits)' },
      },
      required: ['amount', 'merchant', 'category'],
    },
  },
  {
    name: 'get_violations',
    description:
      'Get policy violations with optional filters. Also returns repeat offenders (employees with 2+ violations).',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id: { type: 'string', description: 'Filter by employee ID' },
        violation_type: {
          type: 'string',
          enum: ['over_limit', 'restricted_merchant', 'context_violation', 'split_charge'],
          description: 'Filter by violation type',
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by severity',
        },
        status: { type: 'string', enum: ['open', 'resolved'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'detect_anomalies',
    description:
      'Run anomaly detection algorithms. Returns split charges, duplicates, round numbers, velocity spikes, and unusual merchants.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['split_charge', 'duplicate', 'round_number', 'velocity', 'unusual_merchant', 'all'],
          description: 'Type of anomaly to detect (default: all)',
        },
      },
    },
  },
  {
    name: 'get_dashboard_kpis',
    description:
      'Get high-level dashboard KPIs: total spend QTD, pending approvals count, open violations count, and departments over 80% budget.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_expense_report_data',
    description:
      'Get transactions grouped for an expense report, typically for a specific employee and event/trip.',
    input_schema: {
      type: 'object' as const,
      properties: {
        employee_id: { type: 'string', description: 'Employee ID' },
        event_tag: { type: 'string', description: 'Event tag to group by (e.g. "sf-offsite-q1")' },
      },
      required: ['employee_id'],
    },
  },
  {
    name: 'render_visualization',
    description:
      'REQUIRED: Render a chart or table inline in the chat. You MUST call this tool whenever you have grouped/aggregated data to show. Call it BEFORE writing your text response. Use: bar=grouped comparisons (top spenders, spend by dept/category), line=trends over time, pie=proportions/breakdown, table=multiple detail rows, number=single KPI value, gauge=budget utilization %. The chart appears inline — users expect to see it.',
    input_schema: {
      type: 'object' as const,
      required: ['type', 'title', 'data'],
      properties: {
        type: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'table', 'number', 'gauge'],
          description: 'Chart type: bar=comparisons, line=trends, pie=proportions, table=rows, number=single metric, gauge=utilization',
        },
        title: { type: 'string', description: 'Chart title' },
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of data objects to visualize',
        },
        x_key: { type: 'string', description: 'Field name for x-axis labels (bar/line charts)' },
        y_key: { type: 'string', description: 'Field name for the numeric value (bar/line charts)' },
        color_key: { type: 'string', description: 'Field for color differentiation (optional)' },
        format: {
          type: 'string',
          enum: ['currency', 'percent', 'number'],
          description: 'How to format numeric values',
        },
      },
    },
  },
];
