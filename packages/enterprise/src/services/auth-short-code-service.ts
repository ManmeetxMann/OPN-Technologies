import {nanoid} from 'nanoid'
import moment from 'moment'

import DataStore from '../../../common/src/data/datastore'
import {AuthShortCodeRepository} from '../repository/auth-short-code.repository'
import {MagicLinkService} from '../../../common/src/service/messaging/magiclink-service'
import {AuthShortCode} from '../models/auth'

export class AuthShortCodeService {
  private dataStore = new DataStore()
  private readonly authShortCodeRepository = new AuthShortCodeRepository(this.dataStore)
  private readonly magicLinkService = new MagicLinkService()

  async generateAndSaveShortCode(
    email: string,
    organizationId: string,
    userId: string,
  ): Promise<string> {
    const shortCode = nanoid(6)
    const expiresAt = moment().add(1, 'hours').toDate()
    const magicLink = await this.magicLinkService.generateMagicLink({
      email,
      meta: {organizationId, userId, shortCode},
    })

    await this.authShortCodeRepository.add({
      id: `${email}${organizationId}`,
      shortCode,
      expiresAt,
      magicLink,
      organizationId,
      email,
    })

    return shortCode
  }

  async findAuthShortCode(
    shortCode: string,
    email: string,
    organizationId: string,
  ): Promise<AuthShortCode> {
    return (
      await this.authShortCodeRepository
        .getQueryFindWhereEqual('shortCode', shortCode)
        .where('email', '==', email)
        .where('organizationId', '==', organizationId)
        .fetch()
    )[0]
  }

  async clearShortCode(id: string): Promise<void> {
    await this.authShortCodeRepository.delete(id)
  }
}
