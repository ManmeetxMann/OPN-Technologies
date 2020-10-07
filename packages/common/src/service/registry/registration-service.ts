import DataStore from '../../data/datastore'
import {Registration, RegistrationModel} from '../../data/registration'

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
