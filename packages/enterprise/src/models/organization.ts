export type OrganizationReminderSchedule = {
  enabled: boolean
  enabledOnWeekends: boolean
  timeOfDayMillis: number
}

export type Organization = {
  id: string
  key: number
  name: string
  type: OrganizationType
  allowDependants: boolean
  organization_groups?: OrganizationGroup[]
  // the hour (in default timezone) to send out reports
  hourToSendReport?: number
  // The number of days to subtract from today when generating the report (0 or empty for today, 1 for yesterday...)
  dayShift?: number
  // The reminder schedule for the apps to prompt for attestations
  dailyReminder: OrganizationReminderSchedule
  // Whether or not this organization sends pushes
  enablePushNotifications?: boolean
  // The format for push notifications to use
  notificationFormatCaution?: string
  notificationFormatStop?: string
  // The icon for push notifications to use
  notificationIconCaution?: string
  notificationIconStop?: string
  enableTemperatureCheck: boolean
  enablePulseOxygen: boolean
  legacyMode: boolean
  enableTesting: boolean
  questionnaireId: string
  enablePaymentForBooking: boolean
}

export type OrganizationListDTO = {
  id: string
  //key: number
  name: string
}

export enum OrganizationType {
  Default = 'default',
  Childcare = 'childcare',
}

export enum OrganizationLocationType {
  Default = 'default',
  Event = 'event',
}

export type OrganizationGroup = {
  id: string
  name: string
  checkInDisabled: boolean
  priority?: number
  isPrivate: boolean
}

// A many-to-x representation of Users belonging to a group
export type OrganizationUsersGroup = {
  id: string
  userId: string
  groupId: string
  parentUserId?: string
}

export type OrganizationLocation = {
  id: string
  title: string
  address: string
  city: string
  zip: string
  state: string
  country: string
  type?: OrganizationLocationType
  // true if no location has this location as parentLocationId
  allowAccess: boolean
  // id of location which contains this location
  parentLocationId?: string | null
  zones?: ({
    id: string
    address: string
    title: string
  } & OrganizationConfiguration)[]
  validFrom?: string
  validUntil?: string
  nfcGateOnly?: boolean
  questionnaireId?: string
} & OrganizationConfiguration

export type OrganizationConfiguration = {
  attestationRequired: boolean
  allowsSelfCheckInOut: boolean
}

export type OrganizationKeySequence = {
  id: string
  value: number
}

export type OrganizationUsersGroupMoveData = {
  userId: string
  newGroupId: string
  oldGroupId: string
  parentUserId?: string
}

export type OrganizationUsersGroupMoveOperation = {
  data: OrganizationUsersGroupMoveData[]
  dryRun: boolean
}

export type OrganizationGroupDTO = {
  id: string
  name: string
  checkInDisabled: boolean
  isPrivate: boolean
}

export const organizationGroupDTOResponse = (group: OrganizationGroup): OrganizationGroupDTO => ({
  id: group.id,
  name: group.name,
  checkInDisabled: group.checkInDisabled,
  isPrivate: group.isPrivate,
})

export const organizationSummaryDTOResponse = (
  organizations: Organization[],
): OrganizationListDTO[] => {
  return organizations.map((organization) => ({
    id: organization.id,
    //key: organization.key,
    name: organization.name,
  }))
}

export const organizationDTOResponse = (organization: Organization): Omit<Organization, 'key'> => {
  return {
    id: organization.id,
    name: organization.name,
    type: organization.type,
    allowDependants: organization.allowDependants,
    hourToSendReport: organization.hourToSendReport,
    dayShift: organization.dayShift,
    dailyReminder: organization.dailyReminder,
    enableTesting: organization.enableTesting,
    enableTemperatureCheck: organization.enableTemperatureCheck,
    enablePulseOxygen: organization.enablePulseOxygen,
    enablePushNotifications: organization.enablePushNotifications,
    legacyMode: organization.legacyMode,
    notificationIconCaution: organization.notificationIconCaution,
    notificationIconStop: organization.notificationIconStop,
    notificationFormatCaution: organization.notificationFormatCaution,
    notificationFormatStop: organization.notificationFormatStop,
    questionnaireId: organization.questionnaireId,
    enablePaymentForBooking: organization.enablePaymentForBooking,
  }
}
