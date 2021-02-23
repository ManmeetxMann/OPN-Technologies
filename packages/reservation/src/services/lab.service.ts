import DataStore from '../../../common/src/data/datastore'
import {Lab, LabDBModel} from '../models/lab'
import {LabRepository} from '../respository/lab.repository'
import * as _ from 'lodash'

export class LabService {
  private dataStore = new DataStore()
  private labRepository = new LabRepository(this.dataStore)

  getAll(): Promise<LabDBModel[]> {
    return this.labRepository.fetchAll()
  }

  save(lab: Lab): Promise<LabDBModel> {
    return this.labRepository.add(lab)
  }

  getAllByIds(organizationIds: string[]): Promise<LabDBModel[]> {
    return Promise.all(
      _.chunk(organizationIds, 10).map((chunk) => this.labRepository.findWhereIdIn(chunk)),
    ).then((results) => _.flatten(results as LabDBModel[][]))
  }
}
