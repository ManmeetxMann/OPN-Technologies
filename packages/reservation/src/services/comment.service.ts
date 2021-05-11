import DataStore from '../../../common/src/data/datastore'
import {CommentRepository} from '../respository/comment.repository'
import {Comment, CommentResponse} from '../models/comment'
import {firestoreTimeStampToUTC} from '../utils/datetime.helper'
import moment from 'moment'
import {AuthUser, User} from '../../../common/src/data/user'
import {UserServiceInterface} from '../../../enterprise/src/interfaces/user-service-interface'

export class CommentService {
  private dataStore = new DataStore()
  private commentRepository = new CommentRepository(this.dataStore)
  private userService: UserServiceInterface

  constructor(userService: UserServiceInterface) {
    this.userService = userService
  }

  getCommentsDetailed = async (testResultId: string): Promise<CommentResponse[]> => {
    const userIds: Set<string> = new Set()
    const userList: Record<string, AuthUser | User> = {}
    const comments = await this.getCommentsByTestResultId(testResultId)
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        userIds.add(comment.addedBy)
        const replies = await this.getRepliesByCommentId(comment.id)
        replies.forEach((replyComment) => userIds.add(replyComment.addedBy))
        return {
          ...comment,
          replies,
        }
      }),
    )
    const users = await this.userService.getAllByIds([...userIds])
    users.forEach((user) => {
      userList[user.id] = user
    })
    return commentsWithReplies.map((comment) => {
      return {
        ...comment,
        addedBy: `${userList[comment.addedBy].firstName} ${userList[comment.addedBy].lastName}`,
        authorPictureUrl:
          (userList[comment.addedBy] as AuthUser).photo ??
          (userList[comment.addedBy] as User).base64Photo,
        replies: comment.replies.map((replyComment) => ({
          ...replyComment,
          addedBy: `${userList[replyComment.addedBy].firstName} ${
            userList[replyComment.addedBy].lastName
          }`,
          authorPictureUrl:
            (userList[comment.addedBy] as AuthUser).photo ??
            (userList[comment.addedBy] as User).base64Photo,
        })),
      }
    })
  }

  getCommentsByTestResultId = (testResultId: string): Promise<Comment[]> => {
    return this.commentRepository
      .getQueryFindWhereEqual('testResultId', testResultId)
      .where('replyTo', '==', null)
      .fetch()
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
