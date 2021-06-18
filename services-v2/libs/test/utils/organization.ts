import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'organizations'

FirebaseManager.getInstance()
const database = firestore()

export const createOrganization = async (
  dataOverwrite: {
    id: string
    name?: string
    key?: number
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    key: dataOverwrite.key || 1,
    name: dataOverwrite.name || testDataCreator + 'ORG',
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
    enableTemperatureCheck: false,
    enablePulseOxygen: false,
    legacyMode: false,
    enableTesting: true,
    questionnaireId: '',
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const deleteOrganization = async (organizationId: string): Promise<void> => {
  await database
    .collection(collectionName)
    .doc(organizationId)
    .delete()
}
