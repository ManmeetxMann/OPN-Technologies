import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Comment} from '../models/comment'

export class CommentRepository extends DataModel<Comment> {
  public rootPath = 'comment'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public save(comment: Omit<Comment, 'id'>): Promise<Comment> {
    return this.add(comment)
  }
}
