import DataStore from '../../../common/src/data/datastore'
import {Lab} from '../models/lab'
import {LabRepository} from '../respository/lab.repository'

export class LabService {
  private dataStore = new DataStore()
  private labRepository = new LabRepository(this.dataStore)

  getAll(): Promise<Lab[]> {
    return this.labRepository.fetchAll()
  }

  save(lab: Omit<Lab, 'id'>): Promise<Lab> {
    return this.labRepository.add(lab)
  }
}
