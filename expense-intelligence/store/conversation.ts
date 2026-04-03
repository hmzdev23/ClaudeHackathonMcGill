'use client';

import { create } from 'zustand';
import type { VisualizationSpec } from '@/lib/claude/agent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  visualization?: VisualizationSpec;
  toolCalls?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface ConversationStore {
  messages: ChatMessage[];
  isLoading: boolean;

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearConversation: () => void;
  setLoading: (v: boolean) => void;

  /** Returns the conversation in Anthropic message format (text only, completed turns) */
  getAnthropicHistory: () => Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  messages: [],
  isLoading: false,

  addMessage: (msg) => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: new Date() }],
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  clearConversation: () => set({ messages: [] }),

  setLoading: (v) => set({ isLoading: v }),

  getAnthropicHistory: () =>
    get()
      .messages.filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content })),
}));
