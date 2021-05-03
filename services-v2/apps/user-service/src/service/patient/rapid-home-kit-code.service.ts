import {Injectable} from '@nestjs/common'
import DataStore from '@opn-common-v1/data/datastore'
import {
  RapidHomeKitCode,
  RapidHomeKitCodeRepository,
} from '../../repository/rapid-home-kit-code.repository'
import {RapidHomeKitCodeToUserAssocRepository} from '../../repository/rapid-home-kit-code-to-user-assoc.repository'

@Injectable()
export class RapidHomeKitCodeService {
  private dataStore = new DataStore()
  private homeKitCodeRepository = new RapidHomeKitCodeRepository(this.dataStore)
  private homeKitCodeToUserRepository = new RapidHomeKitCodeToUserAssocRepository(this.dataStore)

  async get(code: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereEqual('code', code)
  }

  async assocHomeKitToUser(code: string, userId: string): Promise<RapidHomeKitCode> {
    await this.homeKitCodeToUserRepository.save(code, userId)
    const [homeKitCode] = await this.get(code)
    const userIds = homeKitCode.userIds ? [...homeKitCode.userIds, userId] : [userId]
    return this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userIds: [...new Set(userIds)],
    })
  }
}
