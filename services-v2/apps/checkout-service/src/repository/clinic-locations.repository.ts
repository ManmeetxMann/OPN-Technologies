// Libs
import {Injectable} from '@nestjs/common'

// V1 common
import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {ClinicLocations} from '@opn-services/checkout/model/clinic-locations'

@Injectable()
export class ClinicLocationsRepository extends DataModel<ClinicLocations> {
  public rootPath = 'clinic-locations'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
