// The restaurant's timezone is the single source of truth for pickup times, and
// the only authority. Slots are computed in Paris wall-clock; the customer's
// browser timezone decides nothing. This constant must never be duplicated as a
// hard-coded string — every renderer (storefront, admin widget, future kitchen
// ticket) passes it explicitly to its date formatter so a phone set to another
// timezone can't shift the displayed hour.
export const RESTAURANT_TIMEZONE = "Europe/Paris"
