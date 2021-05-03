import {Injectable} from '@nestjs/common'
import DataStore from '@opn-common-v1/data/datastore'
import {
  RapidHomeKitCode,
  RapidHomeKitCodeRepository,
} from '../../repository/rapid-home-kit-code.repository'

@Injectable()
export class RapidHomeKitCodeService {
  private dataStore = new DataStore()
  private homeKitCodeRepository = new RapidHomeKitCodeRepository(this.dataStore)

  async get(code: string): Promise<RapidHomeKitCode[]> {
    return this.homeKitCodeRepository.findWhereEqual('code', code)
  }
}
