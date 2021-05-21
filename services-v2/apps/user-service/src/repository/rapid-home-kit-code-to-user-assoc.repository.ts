import DataModel, {DataModelFieldMapOperatorType} from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {RapidHomeKitToUserAssoc} from '../dto/home-patient'
import {rapidHomeKitToUserAssocSchema} from '@opn-services/common/schemas'
import {JoiValidator} from '@opn-services/common/utils/joi-validator'

export class RapidHomeKitCodeToUserAssocRepository extends DataModel<RapidHomeKitToUserAssoc> {
  public rootPath = 'rapid-home-kit-code-to-user-assoc'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public getByUserId(userId: string): Promise<RapidHomeKitToUserAssoc[]> {
    return this.getQueryFindWhereEqual('userId', userId)
      .where('used', '==', false)
      .fetch()
  }

  public getUnusedByUserIdAndCode(
    userId: string,
    code: string,
  ): Promise<RapidHomeKitToUserAssoc[]> {
    return this.findWhereEqualInMap([
      {
        map: '/',
        key: 'rapidHomeKitId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: code,
      },
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'used',
        operator: DataModelFieldMapOperatorType.Equals,
        value: false,
      },
    ])
  }

  public async save(code: string, userId: string): Promise<RapidHomeKitToUserAssoc> {
    const validator = new JoiValidator(rapidHomeKitToUserAssocSchema)
    const validKitToUserAssoc = await validator.validate({
      rapidHomeKitId: code,
      userId: userId,
      used: false,
    })

    return this.add(validKitToUserAssoc)
  }
}
