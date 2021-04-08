import {Timestamp} from '../../../common/src/types/timestamp'
import {firestoreTimeStampToUTC} from '../utils/datetime.helper'
import moment from 'moment-timezone'

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

export type CommentResponse = Comment & {
  replies?: CommentResponse[]
  authorPictureUrl: string
}

export type CommentReply = {
  id: string
  reply: string
  attachmentUrls: string[]
  addedBy: string
  authorPictureUrl: string
  addedOn: moment.Moment
}

export type CommentsResponse = {
  id: string
  comment: string
  attachmentUrls: string[]
  addedBy: string
  authorPictureUrl: string
  addedOn: moment.Moment
  replies: CommentReply[]
}

export const commentsDTO = (comment: CommentResponse): CommentsResponse => ({
  id: comment.id,
  comment: comment.comment,
  attachmentUrls: comment.attachmentUrls,
  addedBy: comment.addedBy,
  authorPictureUrl: comment.authorPictureUrl,
  addedOn: firestoreTimeStampToUTC(comment.timestamps.createdAt),
  replies: comment.replies.map((replyComment) => ({
    id: replyComment.id,
    reply: replyComment.comment,
    attachmentUrls: replyComment.attachmentUrls,
    addedBy: replyComment.addedBy,
    authorPictureUrl: replyComment.authorPictureUrl,
    addedOn: firestoreTimeStampToUTC(replyComment.timestamps.createdAt),
  })),
})
