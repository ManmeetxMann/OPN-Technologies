import {Content} from '../models/content'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export class ContentRepository extends DataModel<Content> {
  public readonly rootPath = 'content'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
