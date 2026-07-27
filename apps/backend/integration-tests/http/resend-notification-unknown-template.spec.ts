import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

// Ticket 01: an unknown template name used to succeed silently — a generic
// email went out and the notification row still landed as "success", so
// nobody learned a template name was misspelled. Proving the fix means
// proving it at the same seam as kitchen-ticket-notification.spec.ts and
// table-reservation-notifications.spec.ts: the persisted notification row,
// not the render function in isolation.
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("resend-notification: an unknown template fails observably", () => {
      it("rejects and marks the persisted notification row as failed, instead of sending a generic email", async () => {
        const notificationService = getContainer().resolve(Modules.NOTIFICATION)

        await expect(
          notificationService.createNotifications({
            to: "client@example.com",
            channel: "email",
            template: "does-not-exist",
            data: {},
          })
        ).rejects.toThrow()

        const notifications = await notificationService.listNotifications({
          template: "does-not-exist",
        })

        expect(notifications).toHaveLength(1)
        expect(notifications[0].status).toEqual("failure")
      })
    })
  },
})
