import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { MedusaResponse } from "@medusajs/framework/http"
import { ANNOUNCEMENT_MODULE } from "../../modules/announcement"
import AnnouncementModuleService from "../../modules/announcement/service"

// Une seule Annonce à la fois: overlap is refused at write time, not
// discovered later on the storefront — a published Annonce that never shows
// is not diagnosable there. Two periods [a, b] and [c, d] overlap iff
// a <= d && c <= b, compared as "YYYY-MM-DD" strings, never a constructed
// Date — same rule and same reason as createPickupClosureWorkflow.
//
// The overlap is RETURNED as an outcome rather than thrown as a MedusaError:
// the framework's error handler hardcodes the body of every
// MedusaError.Types.CONFLICT to a generic idempotency-key message (see
// error-handler.js), leaving no room to name the conflicting period — the
// same reason reserve-table.ts returns "party_size_too_large" instead of
// throwing.

type Period = { start_date: string; end_date: string }

// The corps and the lien: both nullable, and the label/url pair is
// enforced (both present or both absent) by the zod schemas — the create
// schema checks it outright, the update schema only when both are given on
// the same request; updateAnnouncementStep below re-checks the merge for
// the case where only one of the two is touched.
type LinkFields = {
  body?: string | null
  link_label?: string | null
  link_url?: string | null
}

// An internal path ("/carte") or an absolute http(s) URL — never a
// protocol-relative "//host", which is neither. Exported so the zod schemas
// (which run before this workflow, and need the exact same shape) don't
// carry their own copy that could drift from it.
export const LINK_URL_PATTERN = /^(\/(?!\/)|https?:\/\/)/

// Both present or both absent — a link without a label isn't renderable, a
// label without a link is a dead button. Shared between the zod schemas'
// refine() calls and updateAnnouncementStep's merge-onto-current check below,
// so the rule is written once.
export function hasConsistentLink(
  label: string | null | undefined,
  url: string | null | undefined
): boolean {
  return !!label === !!url
}

export type CreateAnnouncementInput = {
  headline: string
} & Period &
  LinkFields

export type UpdateAnnouncementInput = {
  id: string
  headline?: string
  start_date?: string
  end_date?: string
} & LinkFields

type Announcement = {
  id: string
  headline: string
  body: string | null
  link_label: string | null
  link_url: string | null
} & Period

type OverlapOutcome = {
  outcome: "overlap"
  overlapping: Period
}

export type CreateAnnouncementResult =
  | { outcome: "created"; announcement: Announcement }
  | OverlapOutcome

export type UpdateAnnouncementResult =
  | { outcome: "updated"; announcement: Announcement }
  | OverlapOutcome

// Shared by both admin routes: the 409 body naming the conflicting period.
// See the file-level comment for why this is written directly rather than
// thrown as a MedusaError.
export function respondToOverlap(
  outcome: OverlapOutcome,
  res: MedusaResponse
) {
  res.status(409).json({
    type: "conflict",
    message: `An Annonce already covers that period (${outcome.overlapping.start_date} – ${outcome.overlapping.end_date}).`,
  })
}

async function findOverlap(
  service: AnnouncementModuleService,
  period: Period,
  excludeId?: string
) {
  const existing = await service.listAnnouncements({})
  return existing.find(
    (a) =>
      a.id !== excludeId &&
      a.start_date <= period.end_date &&
      period.start_date <= a.end_date
  )
}

// Compensate input wrapped in an object rather than a bare `string | undefined`:
// TypeScript distributes a conditional type over a naked union type parameter,
// which (given how createStep's InvokeFn is declared) makes the compensate
// type balloon to `string | CreateAnnouncementResult` when the two branches
// pass `string` vs `undefined`. Wrapping it as one object type sidesteps that.
type CreateCompensateInput = { id: string | undefined }

const createAnnouncementStep = createStep<
  CreateAnnouncementInput,
  CreateAnnouncementResult,
  CreateCompensateInput
>(
  "create-announcement",
  async (input, { container }) => {
    const service: AnnouncementModuleService =
      container.resolve(ANNOUNCEMENT_MODULE)
    // Check-then-insert, not a database constraint: the admin is
    // single-operator, so the race window is not a real risk here.
    const overlapping = await findOverlap(service, input)
    if (overlapping) {
      return new StepResponse<CreateAnnouncementResult, CreateCompensateInput>(
        {
          outcome: "overlap",
          overlapping: {
            start_date: overlapping.start_date,
            end_date: overlapping.end_date,
          },
        },
        { id: undefined }
      )
    }

    const announcement = await service.createAnnouncements(input)
    return new StepResponse<CreateAnnouncementResult, CreateCompensateInput>(
      { outcome: "created", announcement },
      { id: announcement.id }
    )
  },
  async (compensateInput, { container }) => {
    if (!compensateInput?.id) return
    const service: AnnouncementModuleService =
      container.resolve(ANNOUNCEMENT_MODULE)
    await service.deleteAnnouncements(compensateInput.id)
  }
)

export const createAnnouncementWorkflow = createWorkflow(
  "create-announcement",
  function (input: CreateAnnouncementInput) {
    return new WorkflowResponse(createAnnouncementStep(input))
  }
)

const updateAnnouncementStep = createStep<
  UpdateAnnouncementInput,
  UpdateAnnouncementResult,
  UpdateAnnouncementResult
>("update-announcement", async (input, { container }) => {
  const service: AnnouncementModuleService =
    container.resolve(ANNOUNCEMENT_MODULE)

  const current = await service.retrieveAnnouncement(input.id)
  // The candidate period merges what's changing onto what's already
  // there: editing only the headline re-checks the Annonce's own
  // unchanged period, which the exclusion below always lets through.
  const candidate: Period = {
    start_date: input.start_date ?? current.start_date,
    end_date: input.end_date ?? current.end_date,
  }
  // The create path's zod schema rejects end_date < start_date up front, but
  // the update schema can only see the fields present on THIS request — it
  // has no view of the row being merged onto. A request moving only
  // start_date past the row's existing end_date (or vice-versa) would
  // otherwise slip through as a valid-looking partial update.
  if (candidate.end_date < candidate.start_date) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "end_date must be on or after start_date"
    )
  }

  // Same reasoning as the date check above, for the label/url pair: the
  // update schema only refuses a mismatch when both fields are present on
  // THIS request, so a request touching just one of the two — say, editing
  // link_label while link_url stays whatever it already was — is re-checked
  // here against the merged row.
  const candidateLinkLabel =
    input.link_label !== undefined ? input.link_label : current.link_label
  const candidateLinkUrl =
    input.link_url !== undefined ? input.link_url : current.link_url
  if (!hasConsistentLink(candidateLinkLabel, candidateLinkUrl)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "link_label and link_url must both be present or both be absent"
    )
  }

  const overlapping = await findOverlap(service, candidate, input.id)
  if (overlapping) {
    return new StepResponse<UpdateAnnouncementResult, UpdateAnnouncementResult>({
      outcome: "overlap",
      overlapping: {
        start_date: overlapping.start_date,
        end_date: overlapping.end_date,
      },
    })
  }

  const announcement = await service.updateAnnouncements(input)
  return new StepResponse<UpdateAnnouncementResult, UpdateAnnouncementResult>({
    outcome: "updated",
    announcement,
  })
})

export const updateAnnouncementWorkflow = createWorkflow(
  "update-announcement",
  function (input: UpdateAnnouncementInput) {
    return new WorkflowResponse(updateAnnouncementStep(input))
  }
)

const deleteAnnouncementStep = createStep(
  "delete-announcement",
  async (id: string, { container }) => {
    const service: AnnouncementModuleService =
      container.resolve(ANNOUNCEMENT_MODULE)
    await service.deleteAnnouncements(id)
    return new StepResponse(id)
  }
)

export const deleteAnnouncementWorkflow = createWorkflow(
  "delete-announcement",
  function (input: { id: string }) {
    return new WorkflowResponse(deleteAnnouncementStep(input.id))
  }
)
