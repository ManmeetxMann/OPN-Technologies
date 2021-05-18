import {Injectable} from '@nestjs/common'
import DataStore from '@opn-common-v1/data/datastore'
import {
  RapidHomeKitCode,
  RapidHomeKitCodeRepository,
} from '../../repository/rapid-home-kit-code.repository'
import {RapidHomeKitCodeToUserAssocRepository} from '../../repository/rapid-home-kit-code-to-user-assoc.repository'
import {RapidHomeKitToUserAssoc} from '../../dto/home-patient'
import {DataModelFieldMapOperatorType} from '@opn-common-v1/data/datamodel.base'
import {BadRequestException} from '@opn-services/common/exception'

@Injectable()
export class RapidHomeKitCodeService {
  private dataStore = new DataStore()
  private homeKitCodeRepository = new RapidHomeKitCodeRepository(this.dataStore)
  private homeKitCodeToUserRepository = new RapidHomeKitCodeToUserAssocRepository(this.dataStore)

  async get(code: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereEqual('code', code)
  }

  async getCodesByUserId(userId: string): Promise<RapidHomeKitToUserAssoc[]> {
    return this.homeKitCodeToUserRepository.getByUserId(userId)
  }

  async assocHomeKitToUser(code: string, userId: string): Promise<RapidHomeKitCode> {
    const homeKitCodeAssociations = await this.homeKitCodeToUserRepository.findWhereEqualInMap([
      {
        map: '/',
        key: 'rapidHomeKitId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: code,
      },
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
    ])
    if (homeKitCodeAssociations.length) {
      throw new BadRequestException('Associations already exists')
    }
    await this.homeKitCodeToUserRepository.save(code, userId)
    const [homeKitCode] = await this.get(code)
    const userIds = homeKitCode.userIds ? [...homeKitCode.userIds, userId] : [userId]
    return this.homeKitCodeRepository.updateProperties(homeKitCode.id, {
      userIds: [...new Set(userIds)],
    })
  }
}
