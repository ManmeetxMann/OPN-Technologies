export type Organization = {
  id: string
  key: number
  name: string
  type: OrganizationType
  allowDependants: boolean
  registrationQuestions?: RegistrationQuestion[]
  organization_groups?: OrganizationGroup[]
  // the hour (in default timezone) to send out reports
  hourToSendReport?: number
  // The number of days to subtract from today when generating the report (0 or empty for today, 1 for yesterday...)
  dayShift?: number
}

export enum OrganizationType {
  Default = 'default',
  Childcare = 'childcare',
}

export type RegistrationQuestion = {
  id: string
  questionText: string
  locale: 'en-CA' | 'fr-CA'
  questionType: 'text' | 'date' | 'select' | 'radio' | 'checkbox' | 'file' | 'button'
  placeholder: string
  options: {
    code: string
    value: string
  }[]
}

export type OrganizationGroup = {
  id: string
  name: string
  checkInDisabled: boolean
  priority?: number
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
  // true if no location has this location as parentLocationId
  allowAccess: boolean
  // id of location which contains this location
  parentLocationId?: string | null
  zones?: ({
    id: string
    address: string
    title: string
  } & OrganizationConfiguration)[]
} & OrganizationConfiguration

export type OrganizationConfiguration = {
  attestationRequired: boolean
  allowsSelfCheckInOut: boolean
  questionnaireId?: string
}

export type OrganizationKeySequence = {
  id: string
  value: number
}
