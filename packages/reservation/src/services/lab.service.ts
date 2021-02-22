import DataStore from '../../../common/src/data/datastore'
import {Lab, LabDBModel} from '../models/lab'
import {LabRepository} from '../respository/lab.repository'

export class LabService {
  private dataStore = new DataStore()
  private labRepository = new LabRepository(this.dataStore)

  save(lab: Lab): Promise<LabDBModel> {
    return this.labRepository.add(lab)
  }
}
