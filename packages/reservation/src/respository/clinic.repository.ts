import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Clinic} from '../models/clinic'

export class ClinicRepository extends DataModel<Clinic> {
  public rootPath = 'clinics'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async getAll(): Promise<Clinic[]> {
    return this.fetchAll()
  }

  public async save(clinic: Omit<Clinic, 'id'>): Promise<void> {
    await this.add(clinic)
  }
}
