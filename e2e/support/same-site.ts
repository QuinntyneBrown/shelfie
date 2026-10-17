/** What the app itself sends with every API request; the API refuses state changes without it. */
export const SAME_SITE = { headers: { 'X-Requested-With': 'Shelfie' } };
