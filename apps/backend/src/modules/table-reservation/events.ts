// Custom events emitted by the table-reservation workflows, for the
// notification subscribers (ticket 06) to react to. Named after the
// workflows that emit them (reserve-table -> RESERVED, cancel-reservation ->
// CANCELLED), not after generic CRUD verbs.
export const TableReservationEvents = {
  RESERVED: "table_reservation.reserved",
  CANCELLED: "table_reservation.cancelled",
} as const
