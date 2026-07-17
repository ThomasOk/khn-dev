import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import { Context } from "@medusajs/framework/types"
import { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import Invoice from "./models/invoice"
import InvoiceCounter from "./models/invoice-counter"
import { formatInvoiceNumber } from "../../lib/invoice/format-invoice-number"

type IssueInvoiceInput = {
  order_id: string
  year: number
  frozen_data: Record<string, unknown>
}

// The gapless numbering guarantee (ADR 0002, spec §"Attribution atomique du
// numéro") lives entirely in issueInvoice. It is the module's one
// transactional method; everything else stays plain CRUD.
class InvoiceModuleService extends MedusaService({
  Invoice,
  InvoiceCounter,
}) {
  @InjectManager()
  async issueInvoice(
    input: IssueInvoiceInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    return await this.issueInvoice_(input, sharedContext)
  }

  @InjectTransactionManager()
  protected async issueInvoice_(
    input: IssueInvoiceInput,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ) {
    // Idempotent on order_id: a replayed call must not consume a second
    // number. Read through the same transaction manager so it sees this
    // transaction's own uncommitted writes, not just prior commits.
    const [existing] = await this.listInvoices(
      { order_id: input.order_id },
      {},
      sharedContext
    )
    if (existing) return existing

    // Atomic, gapless increment: the year's counter row is created at 1 on
    // first use, or bumped by 1, in a single statement — never a
    // SEQUENCE/SERIAL (ADR 0002: `nextval` isn't rolled back, so an aborted
    // transaction would burn a number).
    const manager = sharedContext!.transactionManager!
    const counterId = `facture-${input.year}`
    const [{ value: number }] = await manager.execute(
      `insert into invoice_counter (id, value)
       values (?, 1)
       on conflict (id) do update set value = invoice_counter.value + 1, updated_at = now()
       returning value`,
      [counterId]
    )

    const [invoice] = await this.createInvoices(
      [
        {
          order_id: input.order_id,
          year: input.year,
          number,
          formatted_number: formatInvoiceNumber(input.year, number),
          frozen_data: input.frozen_data,
        },
      ],
      sharedContext
    )
    return invoice
  }
}

export default InvoiceModuleService
