export type AuthLinkRequestRequest = {
    email: string
    connectedId: string
}

export type AuthLinkProcessRequest = {
    idToken: string
    connectedId: string
}