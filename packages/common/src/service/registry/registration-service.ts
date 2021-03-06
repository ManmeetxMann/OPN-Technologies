import {LogInfo} from '../../utils/logging-setup'
import DataStore from '../../data/datastore'
import {OpnSources, Registration, RegistrationModel} from '../../data/registration'

export class RegistrationService {
  private repository = new RegistrationModel(new DataStore())

  create(registration: Omit<Registration, 'id'>): Promise<Registration> {
    return this.repository.add(registration)
  }

  findOneByToken(token: string): Promise<Registration> {
    return this.repository
      .findWhereEqual('pushToken', token)
      .then((results) => (results.length > 0 ? results[0] : null))
  }

  findOne(registrationId: string): Promise<Registration> {
    return this.repository.get(registrationId)
  }

  findForUserIds(userIds: string[]): Promise<Registration[]> {
    return this.repository.findWhereArrayContainsAny('userIds', userIds)
  }

  async findLastForUserId(userId: string, tokenSource: OpnSources[]): Promise<Registration> {
    const [registration] = await this.repository
      .getQueryFindWhereArrayContains('userIds', userId)
      .where('tokenSource', 'in', tokenSource)
      //@ts-ignore
      .orderBy('timestamps.createdAt', 'desc')
      .limit(1)
      .fetch()
    return registration
  }

  update(registration: Registration): Promise<Registration> {
    return this.repository.update(registration)
  }

  updateProperty(
    registrationId: string,
    fieldName: string,
    fieldValue: unknown,
  ): Promise<Registration> {
    return this.repository.updateProperty(registrationId, fieldName, fieldValue)
  }

  async upsert(userId: string, registration: Omit<Registration, 'id'>): Promise<Registration> {
    const {platform, osVersion, pushToken, tokenSource} = registration
    const registrationFromDb = await this.findLastForUserId(userId, [tokenSource])
    const registrationExists =
      pushToken && registrationFromDb?.id && registrationFromDb.tokenSource === tokenSource

    LogInfo('upsert', 'UpsertPushToken', {
      registrationExists,
      registration,
    })

    if (registrationExists) {
      return this.updateProperty(registrationFromDb.id, 'pushToken', pushToken)
    } else {
      return this.create({
        platform,
        osVersion,
        pushToken: pushToken ?? null,
        userIds: [userId],
        tokenSource,
      })
    }
  }

  async linkUser(registrationId: string, userId: string): Promise<void> {
    const registration = await this.findOne(registrationId)
    if (!registration) {
      console.warn(
        `Registration with id ${registrationId} does not exist, and will not be linked to user ${userId}`,
      )
      return
    }
    if (!registration.userIds) {
      registration.userIds = []
    }
    if (!registration.userIds.includes(userId)) {
      registration.userIds.push(userId)
    }
    await this.update(registration)
  }
}
