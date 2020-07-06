

export enum RegistrationType
{
    User = "User",
    Admin = "Admin"
}

export interface RegistrationSchema
{
    id: string,
    type: RegistrationType,
    pushToken: string
}