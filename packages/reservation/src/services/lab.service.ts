import DataStore from '../../../common/src/data/datastore'
import {Lab} from '../models/lab'
import {LabRepository} from '../respository/lab.repository'
import * as _ from 'lodash'

export class LabService {
  private dataStore = new DataStore()
  private labRepository = new LabRepository(this.dataStore)

  getAll(): Promise<Lab[]> {
    return this.labRepository.fetchAll()
  }

  save(lab: Omit<Lab, 'id'>): Promise<Lab> {
    return this.labRepository.add(lab)
  }

  getAllByIds(organizationIds: string[]): Promise<Lab[]> {
    return Promise.all(
      _.chunk(organizationIds, 10).map((chunk) => this.labRepository.findWhereIdIn(chunk)),
    ).then((results) => _.flatten(results as Lab[][]))
  }

  findOneById(id: string): Promise<Lab> {
    return this.labRepository.get(id)
  }

  async isORMRequestEnabled(labId: string): Promise<boolean> {
    const lab = await this.findOneById(labId)
    return Boolean(lab?.sendORMRequest)
  }
}
