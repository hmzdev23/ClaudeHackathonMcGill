import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;
let altClient: Anthropic | null = null;

export function getClaudeClient(useAlt = false): Anthropic {
  if (useAlt) {
    if (!altClient) {
      const apiKey = process.env.ALT_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ALT_ANTHROPIC_API_KEY is not set. Add it to your .env.local file.');
      altClient = new Anthropic({ apiKey, maxRetries: 0 });
    }
    return altClient;
  }
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env.local file.');
    client = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return client;
}

export const MODEL = 'claude-sonnet-4-6';
// Override via ALT_MODEL env var; falls back to haiku for cost-effective testing
export const ALT_MODEL = process.env.ALT_MODEL || 'claude-haiku-4-5-20251001';
