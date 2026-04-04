import type Anthropic from '@anthropic-ai/sdk';
import { EXPENSE_TOOLS } from './tools';

type Tool = Anthropic.Messages.Tool;

const AUTOPILOT_ONLY_TOOLS: Tool[] = [
  {
    name: 'get_pending_approvals',
    description:
      'Get all pending expense approvals enriched with employee name, department, and context. Use this early in the analysis to assess what decisions need to be made.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'output_action_plan',
    description:
      'Output your final structured action plan. Call this LAST after completing all analysis. This is your deliverable to the finance manager — be specific, decisive, and data-driven.',
    input_schema: {
      type: 'object' as const,
      required: ['summary', 'risk_level', 'actions', 'insights'],
      properties: {
        summary: {
          type: 'string',
          description:
            'Executive summary of findings in 2-3 sentences. State the overall risk level and the most important issues clearly.',
        },
        risk_level: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Overall portfolio risk assessment based on what you found.',
        },
        actions: {
          type: 'array',
          description: 'Specific recommended actions sorted by priority (urgent first).',
          items: {
            type: 'object',
            required: ['id', 'type', 'priority', 'title', 'reasoning', 'auto_executable'],
            properties: {
              id: {
                type: 'string',
                description: 'Unique ID like "action-001", "action-002", etc.',
              },
              type: {
                type: 'string',
                enum: [
                  'approve_expense',
                  'deny_expense',
                  'budget_alert',
                  'anomaly_alert',
                  'compliance_alert',
                  'vendor_opportunity',
                ],
              },
              priority: {
                type: 'string',
                enum: ['urgent', 'high', 'medium', 'low'],
              },
              title: {
                type: 'string',
                description: 'Short action title under 60 characters.',
              },
              reasoning: {
                type: 'string',
                description:
                  'Your reasoning for this recommendation in 1-2 sentences. Be specific — cite amounts, percentages, policy rules.',
              },
              target_id: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description:
                  'The approval ID to act on. Required for approve_expense and deny_expense. Use null for informational actions.',
              },
              amount: { type: 'number', description: 'Dollar amount if applicable.' },
              employee: { type: 'string', description: 'Employee name if applicable.' },
              department: { type: 'string', description: 'Department if applicable.' },
              auto_executable: {
                type: 'boolean',
                description:
                  'true for approve_expense and deny_expense (can be auto-executed). false for informational alerts.',
              },
            },
          },
        },
        insights: {
          type: 'array',
          items: { type: 'string' },
          description: '3-5 key data-driven observations from your analysis. Each should be a concrete finding with a number or percentage.',
        },
      },
    },
  },
];

export const AUTOPILOT_TOOLS: Tool[] = [...EXPENSE_TOOLS, ...AUTOPILOT_ONLY_TOOLS];
