import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'organizations'

import {OrganizationService} from '../../../enterprise/src/services/organization-service'

const orgService = new OrganizationService()

export const createOrganization = async (
  dataOverwrite: {
    id: string
    name: string
    enableTemperatureCheck: boolean
    userIdToAdd?: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    key: 1,
    name: dataOverwrite.name,
    type: 'default',
    allowDependants: true,
    organization_groups: ['TestGroup'],
    hourToSendReport: 10,
    dayShift: 8,
    dailyReminder: {
      enabled: false,
      enabledOnWeekends: false,
      timeOfDayMillis: 10,
    },
    enablePushNotifications: false,
    notificationFormatCaution: '',
    notificationFormatStop: '',
    notificationIconCaution: '',
    notificationIconStop: '',
    enableTemperatureCheck: dataOverwrite.enableTemperatureCheck ?? false,
    enablePulseOxygen: false,
    legacyMode: false,
    enableTesting: true,
    questionnaireId: '',
    testDataCreator,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  await orgService.addGroup(dataOverwrite.id, {
    id: 'TestGroup',
    name: 'TestGroup',
    checkInDisabled: true,
    isPrivate: false,
  })

  if (dataOverwrite.userIdToAdd) {
    await orgService.addUserToGroup(dataOverwrite.id, 'TestGroup', dataOverwrite.userIdToAdd)
  }
}

export const deleteOrgById = async (id: string, testDataCreator: string): Promise<void> => {
  const organizationCollection = database.collection(collectionName)
  const ref = await organizationCollection
    .where('id', '==', id)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
