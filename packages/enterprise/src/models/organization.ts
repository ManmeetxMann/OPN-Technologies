export type Organization = {
  id: string
  key: number
  name: string
  type: OrganizationType
  allowDependants: boolean
}

export enum OrganizationType {
  Default = 'default',
  Childcare = 'childcare',
}

export type OrganizationGroup = {
  id: string
  name: string
  key: number
  isDefault: boolean
}

// A many-to-x representation of Users belonging to a group
export type OrganizationUsersGroup = {
  id: string
  userId: string
  groupId: string
}

export type OrganizationLocation = {
  id: string
  title: string
  address: string
  city: string
  zip: string
  state: string
  country: string
  zones?: OrganizationLocationZone[]
} & OrganizationConfiguration

export type OrganizationLocationZone = {
  id: string
  title: string
  address: string
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
