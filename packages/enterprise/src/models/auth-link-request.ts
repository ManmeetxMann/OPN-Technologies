export type AuthLinkRequestRequest = {
    email: string
    connectedId: string
}

export type AuthLinkProcessRequest = {
    authToken: string
    connectedId: string
}