import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {RapidHomeKitToUserAssoc} from '../dto/home-patient'
import homeKitAssocValidator from '@opn-services/common/schemas/rapid-home-kit-to-user-assoc.schema'
import {JoiValidator} from '@opn-services/common/utils/joi-validator'

export class RapidHomeKitCodeToUserAssocRepository extends DataModel<RapidHomeKitToUserAssoc> {
  public rootPath = 'rapid-home-kit-code-to-user-assoc'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public getByUserId(userId: string): Promise<RapidHomeKitToUserAssoc[]> {
    return this.findWhereEqual('userId', userId)
  }

  public async save(code: string, userId: string): Promise<RapidHomeKitToUserAssoc> {
    const validator = new JoiValidator(homeKitAssocValidator)
    const validKitToUserAssoc = await validator.validate({
      rapidHomeKitId: code,
      userId: userId,
    })

    return this.add(validKitToUserAssoc)
  }
}
