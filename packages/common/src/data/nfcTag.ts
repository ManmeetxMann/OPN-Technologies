export type NfcTag = {
  id: string
  userId: string
  organizationId: string
  legacyId?: string
}

export type NfcTagIdentifier = {
  tagId: string
  legacyTagId: string
}
