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
    generateMagicLink: boolean,
  ): Promise<AuthShortCode> {
    const shortCode = nanoid()
    // @TODO without ts-ignore gives typescript error, because this function used in v2
    // @ts-ignore
    const expiresAt = moment().add(1, 'hours').toDate()
    const magicLink = !generateMagicLink
      ? null
      : await this.magicLinkService.generateMagicLink({
          email,
          meta: {organizationId, userId, shortCode},
        })
    const authShortCode = await this.findAuthShortCode(email)

    const data = {
      shortCode,
      expiresAt,
      magicLink,
      organizationId,
      email,
    }

    if (authShortCode) data['id'] = authShortCode.id

    return this.authShortCodeRepository.add(data)
  }

  async findAuthShortCode(email: string): Promise<AuthShortCode> {
    return (await this.authShortCodeRepository.getQueryFindWhereEqual('email', email).fetch())[0]
  }

  async clearShortCode(id: string): Promise<void> {
    await this.authShortCodeRepository.delete(id)
  }
}
