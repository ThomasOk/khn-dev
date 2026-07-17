import type { NotificationTypes } from "@medusajs/framework/types"
import { mapAttachmentsForResend } from "../map-attachments-for-resend"

describe("mapAttachmentsForResend", () => {
  it("translates content_type and id to contentType and contentId, never the original snake_case keys", () => {
    const attachment: NotificationTypes.Attachment = {
      content: "base64content",
      filename: "kitchen-ticket.pdf",
      content_type: "application/pdf",
      id: "kitchen-ticket",
      disposition: "attachment",
    }

    const [mapped] = mapAttachmentsForResend([attachment])

    expect(mapped).toEqual({
      content: "base64content",
      filename: "kitchen-ticket.pdf",
      contentType: "application/pdf",
      contentId: "kitchen-ticket",
    })
    expect(mapped).not.toHaveProperty("content_type")
    expect(mapped).not.toHaveProperty("id")
  })

  it("falls back to an explicit default content type when content_type is absent", () => {
    const attachment: NotificationTypes.Attachment = {
      content: "base64content",
      filename: "kitchen-ticket.pdf",
    }

    const [mapped] = mapAttachmentsForResend([attachment])

    expect(mapped.contentType).toBe("application/octet-stream")
  })
})
