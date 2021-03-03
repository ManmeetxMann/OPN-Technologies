import DataStore from '../../../common/src/data/datastore'
import {Clinic} from '../models/clinic'
import {ClinicRepository} from '../respository/clinic.repository'

export class ClinicService {
  private dataStore = new DataStore()
  private clinicRepository = new ClinicRepository(this.dataStore)

  getAll(): Promise<Clinic[]> {
    return this.clinicRepository.fetchAll()
  }

  save(Clinic: Omit<Clinic, 'id'>): Promise<Clinic> {
    return this.clinicRepository.add(Clinic)
  }
}
