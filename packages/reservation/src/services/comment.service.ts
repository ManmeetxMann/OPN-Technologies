import DataStore from '../../../common/src/data/datastore'
import {CommentRepository} from '../respository/comment.repository'
import {Comment} from '../models/comment'
import {firestoreTimeStampToUTC} from '../utils/datetime.helper'
import moment from 'moment'

export class CommentService {
  private dataStore = new DataStore()
  private commentRepository = new CommentRepository(this.dataStore)

  getCommentsByTestResultId = (testResultId: string): Promise<Comment[]> => {
    return this.commentRepository.findWhereEqual('testResultId', testResultId)
  }

  getRepliesByCommentId = (commentId: string): Promise<Comment[]> => {
    return this.commentRepository.findWhereEqual('replyTo', commentId)
  }

  addComment = async ({
    testResultId,
    comment,
    attachmentUrls,
    assignedTo,
    internal,
    addedBy,
    replyTo,
  }: {
    testResultId: string
    comment: string
    attachmentUrls: string[]
    assignedTo?: string
    internal: boolean
    addedBy: string
    replyTo?: string
  }): Promise<Comment & {time: moment.Moment}> => {
    const newComment = await this.commentRepository.save({
      testResultId: testResultId,
      comment: comment,
      attachmentUrls: attachmentUrls,
      assignedTo: assignedTo || null,
      internal: internal,
      addedBy: addedBy,
      replyTo: replyTo || null,
    })

    const time = firestoreTimeStampToUTC(newComment.timestamps.createdAt)

    return {...newComment, time}
  }
}
