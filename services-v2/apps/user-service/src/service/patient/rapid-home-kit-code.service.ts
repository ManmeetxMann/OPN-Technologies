import {Injectable} from '@nestjs/common'
import DataStore from '@opn-common-v1/data/datastore'
import {
  RapidHomeKitCode,
  RapidHomeKitCodeRepository,
} from '../../repository/rapid-home-kit-code.repository'
import {BadRequestException} from '@opn-services/common/exception'
import {OpnConfigService} from '@opn-services/common/services'
import {now} from '@opn-common-v1/utils/times'
import {ResourceNotFoundException} from '@opn-common-v1/exceptions/resource-not-found-exception'

@Injectable()
export class RapidHomeKitCodeService {
  constructor(private configService: OpnConfigService) {}

  private dataStore = new DataStore()
  private homeKitCodeRepository = new RapidHomeKitCodeRepository(this.dataStore)

  async get(code: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereEqual('code', code)
  }

  async getCodesByUserId(userId: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereArrayContains('filterUserIds', userId)
  }

  getAvailableCodes(codes: RapidHomeKitCode[]): RapidHomeKitCode[] {
    const kitUseCount = this.configService.get('RAPID_ANTIGEN_KIT_USE_COUNT')
    return codes.filter(code => code.userForUserId && code.userForUserId.length < kitUseCount)
  }

  async assocHomeKitToUser(code: string, userId: string): Promise<RapidHomeKitCode> {
    const kitUseCount = this.configService.get('RAPID_ANTIGEN_KIT_USE_COUNT')

    // Check is total used less than N times
    const [homeKitCode] = await this.get(code)
    if (!homeKitCode) {
      throw new ResourceNotFoundException('Kit not found!')
    }

    // Check is already linked to the user
    if (homeKitCode.filterUserIds && homeKitCode.filterUserIds.includes(userId)) {
      throw new BadRequestException('Kit Already Linked')
    }

    if (homeKitCode.userForUserId && homeKitCode.userForUserId.length >= kitUseCount) {
      throw new BadRequestException(
        `Error this kit has already recorded ${kitUseCount} test results against it.`,
      )
    }

    const addedDate = now()
    const userIds = homeKitCode.userIds
      ? [...homeKitCode.userIds, {userId, addedDate}]
      : [{userId, addedDate}]

    return this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userIds,
      filterUserIds: [...homeKitCode.filterUserIds, userId],
    })
  }

  async markAsUsedHomeKitCode(code: string, userId: string): Promise<RapidHomeKitCode> {
    const kitUseCount = this.configService.get('RAPID_ANTIGEN_KIT_USE_COUNT')
    const [homeKitCode] = await this.get(code)

    if (!homeKitCode || homeKitCode.userForUserId.length >= kitUseCount) {
      throw new BadRequestException(
        `Error this kit has already recorded ${kitUseCount} test results against it.`,
      )
    }

    if (!homeKitCode.filterUserIds.includes(userId)) {
      throw new BadRequestException(`User are not associated with kit ${code}`)
    }

    // Mark kit used for user
    return await this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userForUserId: [...homeKitCode.userForUserId, userId],
    })
  }
}
