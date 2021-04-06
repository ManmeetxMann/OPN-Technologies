import {Timestamp} from '../../../common/src/types/timestamp'

export type Comment = {
  id: string
  testResultId: string
  comment: string
  attachmentUrls: string[]
  assignedTo?: string
  internal: boolean
  addedBy: string
  timestamps?: Timestamp
  replyTo: string
}
