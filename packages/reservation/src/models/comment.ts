import {Timestamp} from '../../../common/src/types/timestamp'
import { firestoreTimeStampToUTC } from "../utils/datetime.helper";

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

export const commentsDTO = (comment: Comment & {replies: Comment[]}) => ({
  id: comment.id,
  comment: comment.comment,
  attachmentUrls: comment.attachmentUrls,
  addedBy: comment.addedBy,
  authorPictureUrl: comment.addedBy,
  addedOn: firestoreTimeStampToUTC(comment.timestamps.createdAt),
  replies: comment.replies.map((replyComment) => ({
    id: replyComment.id,
    reply: replyComment.comment,
    attachmentUrls: replyComment.attachmentUrls,
    addedBy: replyComment.addedBy,
    authorPictureUrl: replyComment.addedBy,
    addedOn: firestoreTimeStampToUTC(replyComment.timestamps.createdAt),
  })),
})
