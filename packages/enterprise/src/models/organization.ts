export type Organization = {
  id: string
  key: number
  name: string
  logoUrl: string
  type: OrganizationType
  allowDependants: boolean
  registrationQuestions?: RegistrationQuestion[]
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
