import type { NotificationTypes } from "@medusajs/framework/types"
import type { Attachment as ResendAttachment } from "resend"

// Resend infers `contentType` from the filename when it's absent — exactly
// the silent behaviour the spec rejects (§"Le mapping Resend"). An explicit
// default keeps the outcome deterministic regardless of what Resend's own
// inference would have guessed.
const DEFAULT_CONTENT_TYPE = "application/octet-stream"

// Field-by-field, never a spread: Medusa's `Attachment` and Resend's use
// different names for the same two fields (`content_type`/`contentType`,
// `id`/`contentId`). A spread would carry over the snake_case keys and leave
// `contentType` unset, which is the exact failure this function exists to
// prevent (User Story 18).
export function mapAttachmentsForResend(
  attachments: NotificationTypes.Attachment[]
): ResendAttachment[] {
  return attachments.map((attachment) => ({
    content: attachment.content,
    filename: attachment.filename,
    contentType: attachment.content_type ?? DEFAULT_CONTENT_TYPE,
    contentId: attachment.id,
  }))
}
