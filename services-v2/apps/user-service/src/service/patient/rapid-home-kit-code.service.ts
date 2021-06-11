import {Injectable} from '@nestjs/common'
import DataStore from '@opn-common-v1/data/datastore'
import {
  RapidHomeKitCode,
  RapidHomeKitCodeRepository,
} from '../../repository/rapid-home-kit-code.repository'
import {RapidHomeKitCodeToUserAssocRepository} from '../../repository/rapid-home-kit-code-to-user-assoc.repository'
import {RapidHomeKitToUserAssoc} from '../../dto/home-patient'
import {BadRequestException} from '@opn-services/common/exception'
import {OpnConfigService} from '@opn-services/common/services'

@Injectable()
export class RapidHomeKitCodeService {
  constructor(private configService: OpnConfigService) {}

  private dataStore = new DataStore()
  private homeKitCodeRepository = new RapidHomeKitCodeRepository(this.dataStore)
  private homeKitCodeToUserRepository = new RapidHomeKitCodeToUserAssocRepository(
    this.dataStore,
    this.configService.get('RAPID_ANTIGEN_KIT_USE_COUNT'),
  )

  async get(code: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereEqual('code', code)
  }

  async getCodesByUserId(userId: string): Promise<RapidHomeKitToUserAssoc[]> {
    return this.homeKitCodeToUserRepository.getByUserId(userId)
  }

  async assocHomeKitToUser(code: string, userId: string): Promise<RapidHomeKitCode> {
    const kitUseCount = this.configService.get('RAPID_ANTIGEN_KIT_USE_COUNT')
    const homeKitCodeAssociations = await this.homeKitCodeToUserRepository.getUnusedByUserIdAndCode(
      userId,
      code,
    )

    // Check is total used less than N times
    const [homeKitCode] = await this.get(code)
    if (homeKitCode.userForUserId && homeKitCode.userForUserId.length >= kitUseCount) {
      throw new BadRequestException(
        `Error this kit has already recorded ${kitUseCount} test results against it.`,
      )
    }

    // Check is already linked to the user
    if (homeKitCodeAssociations.length) {
      throw new BadRequestException('Kit Already Linked')
    }

    await this.homeKitCodeToUserRepository.addAssociation(code, userId)
    const userIds = homeKitCode.userIds ? [...homeKitCode.userIds, userId] : [userId]
    return this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userIds,
    })
  }

  async markAsUsedHomeKitCode(code: string, userId: string): Promise<RapidHomeKitToUserAssoc> {
    const [
      homeKitCodeAssociations,
    ] = await this.homeKitCodeToUserRepository.getUnusedByUserIdAndCode(userId, code)

    if (!homeKitCodeAssociations) {
      throw new BadRequestException('Kit Already Used')
    }

    // Mark kit used for user
    const [homeKitCode] = await this.get(code)
    const userForUserId = homeKitCode.userForUserId
      ? [...homeKitCode.userForUserId, userId]
      : [userId]
    await this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userForUserId,
    })

    // Increment association used count
    return this.homeKitCodeToUserRepository.markUsed(homeKitCodeAssociations.id)
  }
}
