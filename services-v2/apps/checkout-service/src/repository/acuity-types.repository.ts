// Libs
import {Injectable} from '@nestjs/common'

// V1 common
import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'

// Models
import {AcuityDBModel} from '../model/cart'

@Injectable()
export class AcuityTypesRepository extends DataModel<AcuityDBModel> {
  public rootPath = 'acuity-types'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
