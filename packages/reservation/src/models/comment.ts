export type Comment = {
  id: string
  testResultId: string
  comment: string
  attachmentUrls: string[]
  assignedTo?: string
  internal: boolean
  addedBy: string
  replyTo: string
}
