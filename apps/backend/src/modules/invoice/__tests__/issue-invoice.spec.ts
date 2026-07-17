import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { INVOICE_MODULE } from "../index"

// Seam 2 of the spec ("Module integration — la garantie sans-trou"): calls
// issueInvoice directly against a real, disposable Postgres. Concurrency
// doesn't test cleanly through a full HTTP checkout, so this seam calls the
// service in parallel instead.

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    const invoiceService = () => getContainer().resolve(INVOICE_MODULE) as any

    describe("InvoiceModuleService.issueInvoice", () => {
      it("issued in parallel for N distinct orders, produces 1..N contiguous, gapless, non-duplicated numbers", async () => {
        const year = 2101
        const n = 20

        const invoices = await Promise.all(
          Array.from({ length: n }, (_, i) =>
            invoiceService().issueInvoice({
              order_id: `order-parallel-${i}`,
              year,
              frozen_data: { index: i },
            })
          )
        )

        const numbers = invoices.map((invoice: any) => invoice.number).sort(
          (a: number, b: number) => a - b
        )
        expect(numbers).toEqual(
          Array.from({ length: n }, (_, i) => i + 1)
        )

        const uniqueNumbers = new Set(numbers)
        expect(uniqueNumbers.size).toEqual(n)
      })

      it("does not consume a number when the transaction fails after the counter increment", async () => {
        const year = 2102

        // order_id: null violates the NOT NULL constraint on the invoice
        // table, forcing the INSERT to fail *after* the counter has already
        // been incremented inside the same transaction. If the increment
        // weren't rolled back with it, the next successful call would be
        // handed number 2 instead of 1 — the exact gap ADR 0002 forbids.
        await expect(
          invoiceService().issueInvoice({
            order_id: null,
            year,
            frozen_data: {},
          })
        ).rejects.toThrow()

        const counters = await invoiceService().listInvoiceCounters({
          id: `facture-${year}`,
        })
        expect(counters).toHaveLength(0)

        const invoice = await invoiceService().issueInvoice({
          order_id: "order-after-failed-attempt",
          year,
          frozen_data: {},
        })
        expect(invoice.number).toEqual(1)
      })

      it("called twice for the same order_id returns a single Invoice and consumes a single number", async () => {
        const year = 2103

        const first = await invoiceService().issueInvoice({
          order_id: "order-idempotent",
          year,
          frozen_data: { attempt: 1 },
        })
        const second = await invoiceService().issueInvoice({
          order_id: "order-idempotent",
          year,
          frozen_data: { attempt: 2 },
        })

        expect(second.id).toEqual(first.id)
        expect(second.number).toEqual(first.number)

        const invoices = await invoiceService().listInvoices({
          order_id: "order-idempotent",
        })
        expect(invoices).toHaveLength(1)

        const counters = await invoiceService().listInvoiceCounters({
          id: `facture-${year}`,
        })
        expect(counters[0].value).toEqual(1)
      })

      it("issuing across two distinct years creates two counter rows, each restarting at 1", async () => {
        const yearA = 2104
        const yearB = 2105

        const invoiceA = await invoiceService().issueInvoice({
          order_id: "order-year-a",
          year: yearA,
          frozen_data: {},
        })
        const invoiceB = await invoiceService().issueInvoice({
          order_id: "order-year-b",
          year: yearB,
          frozen_data: {},
        })

        expect(invoiceA.number).toEqual(1)
        expect(invoiceB.number).toEqual(1)

        const counterA = await invoiceService().listInvoiceCounters({
          id: `facture-${yearA}`,
        })
        const counterB = await invoiceService().listInvoiceCounters({
          id: `facture-${yearB}`,
        })
        expect(counterA).toHaveLength(1)
        expect(counterB).toHaveLength(1)
        expect(counterA[0].value).toEqual(1)
        expect(counterB[0].value).toEqual(1)
      })
    })
  },
})
