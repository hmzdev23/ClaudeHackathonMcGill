import policyJson from '../../data/policy.json';

export const POLICY = policyJson;

export function isRestrictedMerchant(merchant: string): boolean {
  const lower = merchant.toLowerCase();
  return POLICY.restricted_merchant_keywords.some((keyword) =>
    lower.includes(keyword.toLowerCase())
  );
}

export function getMealLimit(attendee_count: number): number {
  return attendee_count >= 2
    ? POLICY.category_limits.meals_team
    : POLICY.category_limits.meals_solo;
}

export function getCategoryLimit(category: string): number | null {
  const lower = category.toLowerCase();

  // Direct meal categories
  if (
    POLICY.meal_category_names.some((name) => lower.includes(name.toLowerCase()))
  ) {
    // Default to solo limit; callers should use getMealLimit for attendee-aware checks
    return POLICY.category_limits.meals_solo;
  }

  // Travel - flights
  if (lower.includes('flight') || lower === 'flights') {
    return POLICY.category_limits.travel_flight;
  }

  // Travel - hotels
  if (lower.includes('hotel') || lower === 'hotels') {
    return POLICY.category_limits.travel_hotel_per_night;
  }

  // Travel - transportation (no specific limit beyond flight/hotel)
  if (lower === 'transportation' || lower === 'travel') {
    return null;
  }

  // Office supplies
  if (lower.includes('office') || lower.includes('supplies')) {
    return POLICY.category_limits.office_supplies;
  }

  // Software / SaaS
  if (lower.includes('software') || lower.includes('saas')) {
    return POLICY.category_limits.software_saas;
  }

  // Conference
  if (lower.includes('conference') || lower.includes('registration')) {
    return POLICY.category_limits.conference_registration;
  }

  // Equipment
  if (lower.includes('equipment') || lower.includes('hardware')) {
    return POLICY.category_limits.equipment;
  }

  // Entertainment
  if (lower.includes('entertainment')) {
    return POLICY.category_limits.entertainment;
  }

  // Training
  if (lower.includes('training') || lower.includes('education')) {
    return POLICY.category_limits.training;
  }

  return null;
}

export function requiresApproval(amount: number): boolean {
  return amount >= POLICY.approval_threshold;
}
