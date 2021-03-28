import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import DataStore from '../../../common/src/data/datastore'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import {PulseOxygenRepository} from '../respository/pulse-oxygen.repository'

export class PulseOxygenService {
  private dataStore = new DataStore()
  private pusleOxygenRepository = new PulseOxygenRepository(this.dataStore)

  savePulseOxygenStatus(pulseOxygen: Omit<PulseOxygenDBModel, 'id'>): Promise<PulseOxygenDBModel> {
    return this.pusleOxygenRepository.create(pulseOxygen)
  }

  async getPulseOxygenDetails(
    id: string,
    userId: string,
    organizationId: unknown,
  ): Promise<PulseOxygenDBModel> {
    const pulseOxygen = await this.pusleOxygenRepository.get(id)

    if (!pulseOxygen) {
      throw new ResourceNotFoundException(`Resource not found for given ID: ${id}`)
    }

    if (pulseOxygen.organizationId !== organizationId || pulseOxygen.userId !== userId) {
      throw new BadRequestException(`Not Authorized to view details`)
    }

    return pulseOxygen
  }

  async getAllByUserAndOrgId(
    userId: string,
    organizationId: string,
  ): Promise<PulseOxygenDBModel[]> {
    return this.pusleOxygenRepository.getAllByUserAndOrgId(userId, organizationId)
  }
}
