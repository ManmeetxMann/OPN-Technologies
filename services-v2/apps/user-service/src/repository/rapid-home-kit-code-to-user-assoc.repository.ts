import DataModel, {DataModelFieldMapOperatorType} from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {RapidHomeKitToUserAssoc} from '../dto/home-patient'
import {rapidHomeKitToUserAssocSchema} from '@opn-services/common/schemas'
import {JoiValidator} from '@opn-services/common/utils/joi-validator'

export class RapidHomeKitCodeToUserAssocRepository extends DataModel<RapidHomeKitToUserAssoc> {
  public rootPath = 'rapid-home-kit-code-to-user-assoc'
  readonly zeroSet = []
  private kitUseCount = null
  constructor(dataStore: DataStore, kitUseCount: number) {
    super(dataStore)
    this.kitUseCount = kitUseCount
  }

  public getByUserId(userId: string): Promise<RapidHomeKitToUserAssoc[]> {
    return this.findWhereEqualInMap([
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'usedCount',
        operator: DataModelFieldMapOperatorType.Less,
        value: this.kitUseCount,
      },
    ])
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
        key: 'usedCount',
        operator: DataModelFieldMapOperatorType.Less,
        value: this.kitUseCount,
      },
    ])
  }

  public async addAssociation(code: string, userId: string): Promise<RapidHomeKitToUserAssoc> {
    const validator = new JoiValidator(rapidHomeKitToUserAssocSchema)
    const validKitToUserAssoc = await validator.validate({
      rapidHomeKitId: code,
      userId: userId,
      usedCount: 0,
    })

    return this.add(validKitToUserAssoc as RapidHomeKitToUserAssoc)
  }

  public async markUsed(homeKitCodeAssociationsId: string): Promise<RapidHomeKitToUserAssoc> {
    return this.increment(homeKitCodeAssociationsId, 'usedCount', 1)
  }
}
