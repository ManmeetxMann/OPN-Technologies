export type AuthenticationRequest = {
  email: string
  organizationId?: string //This optional for Admin Login
  userId?: string //TODO: to be removed once mobile stops storing `userId`
}
