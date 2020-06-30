import DataModel from "./datamodel.base"

export interface IdentifiersSchema
{
    id: string,
    count: number
}

export class IdentifiersModel extends DataModel<IdentifiersSchema>
{
    readonly rootPath = "identifiers"
    readonly zeroSet = [
        {id: "status", count: 0},
        {id: "access", count: 0},
        {id: "attestation", count: 0}
    ]
}
