import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ANNOUNCEMENT_MODULE } from "../../modules/announcement"
import AnnouncementModuleService from "../../modules/announcement/service"

// Publishing an Annonce — a single step with nothing to compensate. No
// overlap check here: this ticket's scope is reduced to "at most a diagnosable
// GET", the refusal-of-overlap behaviour is a later ticket.
export type CreateAnnouncementInput = {
  headline: string
  start_date: string
  end_date: string
}

const createAnnouncementStep = createStep(
  "create-announcement",
  async (input: CreateAnnouncementInput, { container }) => {
    const service: AnnouncementModuleService =
      container.resolve(ANNOUNCEMENT_MODULE)
    const announcement = await service.createAnnouncements(input)
    return new StepResponse(announcement, announcement.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const service: AnnouncementModuleService =
      container.resolve(ANNOUNCEMENT_MODULE)
    await service.deleteAnnouncements(id)
  }
)

export const createAnnouncementWorkflow = createWorkflow(
  "create-announcement",
  function (input: CreateAnnouncementInput) {
    return new WorkflowResponse(createAnnouncementStep(input))
  }
)
