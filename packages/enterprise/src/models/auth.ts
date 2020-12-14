export type AuthShortCode = {
  id: string
  shortCode: string
  expiresAt: Date
  magicLink: string
  email: string
  organizationId: string
}

export type AuthLinkRequestRequest = {
  email: string
  connectedId: string
}

export type AuthLinkProcessRequest = {
  idToken: string
  connectedId: string
}
