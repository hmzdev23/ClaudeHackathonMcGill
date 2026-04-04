import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your .env.local file.'
      );
    }
    // maxRetries:0 — we handle retries in the agent loop ourselves
    client = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return client;
}

export const MODEL = 'claude-sonnet-4-6';
