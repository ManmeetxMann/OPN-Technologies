import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {ActionItem} from '../models/action-items'

export class UserActionsRepository extends DataModel<ActionItem> {
  public rootPath: string
  readonly zeroSet = []
  constructor(dataStore: DataStore, userId: string) {
    super(dataStore)
    this.rootPath = `action-items/${userId}/organizations`
  }
}
