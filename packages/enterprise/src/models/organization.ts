export type Organization = {
  id: string
  key: number
  name: string
  logoUrl: string
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
  questionnaireId?: string
}

export type OrganizationKeySequence = {
  id: string
  value: number
}
