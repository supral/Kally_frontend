import type { Customer } from '../../../types/common';

export function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

/** Match customers by name, email, card ID, or phone (phone needs at least 3 digits in the query). */
export function matchCustomersBySearch(query: string, customers: Customer[]): Customer[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = raw.toLowerCase();
  const qDigits = digitsOnly(raw);
  const out: Customer[] = [];
  for (const c of customers) {
    const name = (c.name ?? '').toLowerCase();
    const email = (c.email ?? '').toLowerCase();
    const cardId = (c.membershipCardId ?? '').toLowerCase();
    const phoneDigits = digitsOnly(c.phone ?? '');
    if (name.includes(q)) {
      out.push(c);
      continue;
    }
    if (email && email.includes(q)) {
      out.push(c);
      continue;
    }
    if (cardId && cardId.includes(q)) {
      out.push(c);
      continue;
    }
    if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) {
      out.push(c);
    }
  }
  return out;
}

/**
 * True if the string looks like a phone number: only digits and common phone punctuation, at least 3 digits, no letters.
 * So numeric searches open the Phone field, not Name.
 */
export function isPhoneLikeQuery(s: string): boolean {
  const t = String(s || '').trim();
  if (!t) return false;
  if (/[a-zA-Z]/.test(t)) return false;
  return digitsOnly(t).length >= 3;
}

/** Build query string for new-customer page: phone=… for number-like input, name=… otherwise. */
export function newCustomerMembershipSearchParams(searchQuery: string): string {
  const t = searchQuery.trim();
  if (!t) return '';
  if (isPhoneLikeQuery(t)) return `phone=${encodeURIComponent(t)}`;
  return `name=${encodeURIComponent(t)}`;
}

/** Map URL params to form fields so numbers never land in the name field by mistake. */
export function initialNamePhoneFromUrl(searchParams: URLSearchParams): { name: string; phone: string } {
  const phoneP = searchParams.get('phone')?.trim() || '';
  const nameP = searchParams.get('name')?.trim() || '';
  if (phoneP) return { name: '', phone: phoneP };
  if (nameP && isPhoneLikeQuery(nameP)) return { name: '', phone: nameP };
  return { name: nameP, phone: '' };
}
