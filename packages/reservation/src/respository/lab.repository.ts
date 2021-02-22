import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Lab, LabDBModel} from '../models/lab'

export class LabRepository extends DataModel<LabDBModel> {
  public rootPath = 'labs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(lab: Omit<Lab, 'id'>): Promise<void> {
    await this.add(lab)
  }
}
