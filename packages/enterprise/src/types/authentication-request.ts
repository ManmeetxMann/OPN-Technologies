export type AuthenticationRequest = {
  email: string
  organizationId: string
  userId?: string //TODO: to be removed once mobile stops storing `userId`
}
