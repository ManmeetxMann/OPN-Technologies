import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {RapidHomeKitToUserAssoc} from '../dto/home-patient'

export class RapidHomeKitCodeToUserAssocRepository extends DataModel<RapidHomeKitToUserAssoc> {
  public rootPath = 'rapid-home-kit-code-to-user-assoc'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
  public save(code: string, userId: string): Promise<RapidHomeKitToUserAssoc> {
    return this.add({
      rapidHomeKitId: code,
      userId: userId,
    })
  }
}
