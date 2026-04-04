export const MODEL_PREF_KEY = "ai-model-pref";

export type ModelPref = 'primary' | 'groq' | 'openrouter';

export function getModelPref(): ModelPref {
  if (typeof window === "undefined") return 'primary';
  try {
    const v = localStorage.getItem(MODEL_PREF_KEY);
    if (v === 'groq' || v === 'openrouter') return v;
    return 'primary';
  } catch {
    return 'primary';
  }
}

/** Returns the value to pass as use_alt_model to API routes */
export function getUseAltModel(): boolean | 'groq' | 'openrouter' {
  const p = getModelPref();
  if (p === 'groq') return true;
  if (p === 'openrouter') return 'openrouter';
  return false;
}
