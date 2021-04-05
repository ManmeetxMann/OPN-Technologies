import DataStore from '../../../common/src/data/datastore'
import {CommentRepository} from '../respository/comment.repository'
import {Comment} from '../models/comment'

export class CommentService {
  private dataStore = new DataStore()
  private commentRepository = new CommentRepository(this.dataStore)

  getCommentsByTestResultId = (testResultId: string): Promise<Comment[]> => {
    return this.commentRepository.findWhereEqual('testResultId', testResultId)
  }

  getRepliesByCommentId = (commentId: string): Promise<Comment[]> => {
    return this.commentRepository.findWhereEqual('replyTo', commentId)
  }

  addComment = ({
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
  }): Promise<void> => {
    return this.commentRepository.save({
      testResultId: testResultId,
      comment: comment,
      attachmentUrls: attachmentUrls,
      assignedTo: assignedTo || null,
      internal: internal,
      addedBy: addedBy,
      replyTo: replyTo || null,
    })
  }
}
