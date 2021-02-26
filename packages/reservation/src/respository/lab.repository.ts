import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Lab} from '../models/lab'

export class LabRepository extends DataModel<Lab> {
  public rootPath = 'labs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(lab: Lab): Promise<void> {
    await this.add(lab)
  }
}
