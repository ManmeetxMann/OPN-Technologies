import {customAlphabet} from 'nanoid'
import moment from 'moment'

import DataStore from '../../../common/src/data/datastore'
import {AuthShortCodeRepository} from '../repository/auth-short-code.repository'
import {MagicLinkService} from '../../../common/src/service/messaging/magiclink-service'
import {AuthShortCode} from '../models/auth'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', 6)

export class AuthShortCodeService {
  private dataStore = new DataStore()
  private readonly authShortCodeRepository = new AuthShortCodeRepository(this.dataStore)
  private readonly magicLinkService = new MagicLinkService()

  async generateAndSaveShortCode(
    email: string,
    organizationId: string,
    userId: string,
  ): Promise<string> {
    const shortCode = nanoid()
    const expiresAt = moment().add(1, 'hours').toDate()
    const magicLink = await this.magicLinkService.generateMagicLink({
      email,
      meta: {organizationId, userId, shortCode},
    })

    const authShortCode = await this.findAuthShortCode(email, organizationId)

    const data = {
      shortCode,
      expiresAt,
      magicLink,
      organizationId,
      email,
    }

    if (authShortCode) data['id'] = authShortCode.id

    await this.authShortCodeRepository.add(data)

    return shortCode
  }

  async findAuthShortCode(email: string, organizationId: string): Promise<AuthShortCode> {
    return (
      await this.authShortCodeRepository
        .getQueryFindWhereEqual('email', email)
        .where('organizationId', '==', organizationId)
        .fetch()
    )[0]
  }

  async clearShortCode(id: string): Promise<void> {
    await this.authShortCodeRepository.delete(id)
  }
}