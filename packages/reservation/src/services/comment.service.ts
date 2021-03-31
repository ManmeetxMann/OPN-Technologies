import DataStore from '../../../common/src/data/datastore'
import {CommentRepository} from '../respository/comment.repository'
import { Comment } from "../models/comment";

export class CommentService {
  private dataStore = new DataStore()
  private commentRepository = new CommentRepository(this.dataStore)

  getCommentsByTestResultId = (testResultId: string): Promise<Comment[]> => {
    return this.commentRepository.findWhereEqual('testResultId', testResultId)
  }

  addComment = ({
    testResultId,
    comment,
    attachmentUrls,
    assignedTo,
    internal,
    addedBy,
  }: {
    testResultId: string
    comment: string
    attachmentUrls: string[]
    assignedTo?: string
    internal: boolean
    addedBy: string
  }): Promise<void> => {
    return this.commentRepository.save({
      testResultId: testResultId,
      comment: comment,
      attachmentUrls: attachmentUrls,
      assignedTo: assignedTo,
      internal: internal,
      addedBy: addedBy,
    })
  }
}
