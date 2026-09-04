export const ENTITIES = ['CA', 'TX', 'UAE', 'PK', 'BuzzFlick'];
export const REVENUE_BRANDS = ['CA', 'TX', 'UAE', 'BuzzFlick'];
export const CURRENCIES = ['USD', 'PKR', 'AED', 'GBP', 'EUR'];
export const ALLOCATION_METHODS = ['Direct', 'Percentage', 'Equal Split', 'Manual'];
export const COST_OWNERS = ['CA', 'TX', 'UAE', 'PK', 'BuzzFlick', 'Shared'];
export const REVENUE_TYPES = ['Fresh', 'Recurring', 'Upsell'];
export const ACCOUNT_TYPES = ['expense', 'revenue'];
export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Admin', 'Other'];
export const DASHBOARD_BRANDS = ['All Brands', 'CA', 'TX', 'UAE', 'BuzzFlick'];

// Display labels for each entity code (internal codes stay stable for backward compatibility
// with existing data; only the labels shown to users changed per the entity rename request).
export const ENTITY_LABELS: Record<string, string> = {
  CA: 'TekRevol CA',
  TX: 'TekRevol TX',
  UAE: 'TekRevol AE',
  PK: 'TekRevol PK',
  BuzzFlick: 'BuzzFlick',
};
export function entityLabel(code: string): string {
  return ENTITY_LABELS[code] || code;
}

// Cash Received In (Revenue Entry) — same set of entities as Paid By Entity.
export const CASH_RECEIVED_IN_OPTIONS = ENTITIES;

// Paid By Entity (Expense Entry) — same set of entities.
export const PAID_BY_ENTITY_OPTIONS = ENTITIES;

// Entity-specific banks. The Bank dropdown on Expense Entry filters to the list
// that matches the currently selected "Paid By Entity".
export const BANKS_BY_ENTITY: Record<string, string[]> = {
  CA: ['Wells Fargo CA'],
  TX: ['Chase TX'],
  UAE: ['Emirates AED', 'Emirates USD'],
  PK: ['Meezan Bank', 'Bank AL Habib'],
  BuzzFlick: ['Bank of America (BOA)'],
};
export const ALL_BANKS = Object.values(BANKS_BY_ENTITY).flat();

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
