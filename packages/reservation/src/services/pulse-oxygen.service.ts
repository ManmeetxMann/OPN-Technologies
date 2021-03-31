import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import DataStore from '../../../common/src/data/datastore'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import {PulseOxygenRepository} from '../respository/pulse-oxygen.repository'
import {Enterprise} from '../adapter/enterprise'

export class PulseOxygenService {
  private dataStore = new DataStore()
  private pusleOxygenRepository = new PulseOxygenRepository(this.dataStore)
  private enterpriseAdapter = new Enterprise()

  private async postPubsub(pulseResult: PulseOxygenDBModel): Promise<void> {
    await this.enterpriseAdapter.pubsubPulse({
      id: pulseResult.id,
      status: pulseResult.status,
      userId: pulseResult.userId,
      pulse: pulseResult.pulse,
      oxygen: pulseResult.oxygen,
      organizationId: pulseResult.organizationId,
    })
  }

  async savePulseOxygenStatus(
    pulseOxygen: Omit<PulseOxygenDBModel, 'id'>,
  ): Promise<PulseOxygenDBModel> {
    const saved = await this.pusleOxygenRepository.create(pulseOxygen)
    await this.postPubsub(saved)
    return saved
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
