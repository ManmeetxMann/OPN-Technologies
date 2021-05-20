import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import DataStore from '../../../common/src/data/datastore'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import {PulseOxygenRepository} from '../respository/pulse-oxygen.repository'
import {Enterprise} from '../adapter/enterprise'
import {UserService} from '../../../common/src/service/user/user-service'

export class PulseOxygenService {
  private dataStore = new DataStore()
  private pulseOxygenRepository = new PulseOxygenRepository(this.dataStore)
  private enterpriseAdapter = new Enterprise()
  private userService = new UserService()

  private async postPulse(pulseResult: PulseOxygenDBModel): Promise<void> {
    await this.enterpriseAdapter.postPulse({
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
    const saved = await this.pulseOxygenRepository.create(pulseOxygen)
    await this.postPulse(saved)
    return saved
  }

  async getPulseOxygenDetails(
    id: string,
    userId: string,
    organizationId: unknown,
  ): Promise<PulseOxygenDBModel> {
    const pulseOxygen = await this.pulseOxygenRepository.get(id)

    if (!pulseOxygen) {
      throw new ResourceNotFoundException(`Resource not found for given ID: ${id}`)
    }

    const isParent = await this.userService.isParentForChild(userId, pulseOxygen.userId)
    const isNotParentAndAuthUser = pulseOxygen.userId !== userId && !isParent

    if (pulseOxygen.organizationId !== organizationId || isNotParentAndAuthUser) {
      throw new BadRequestException(`Not Authorized to view details`)
    }

    return pulseOxygen
  }

  async getAllByUserAndOrgId(
    userId: string,
    organizationId: string,
  ): Promise<PulseOxygenDBModel[]> {
    return this.pulseOxygenRepository.getAllByUserAndOrgId(userId, organizationId)
  }

  async getAllByUserId(userId: string): Promise<PulseOxygenDBModel[]> {
    return this.pulseOxygenRepository.getAllByUser(userId)
  }
}
