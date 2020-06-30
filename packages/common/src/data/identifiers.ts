import DataModel from "./datamodel.base"
import crypto from "crypto"

export interface IdentifiersSchema
{
    id: string,
    count: number
}

export class IdentifiersModel extends DataModel<IdentifiersSchema>
{
    readonly rootPath = "__identifiers"
    readonly zeroSet = [
        {id: "status", count: 10000},
        {id: "access", count: 10000},
        {id: "attestation", count: 10000}
    ]

    /**
     * For now increments a counter and converts it to hex
     * @param identifierName name of the identifier
     */
    async getUniqueValue(identifierName : string) : Promise<string>
    {
        // Increment by 1
        await this.increment(identifierName, "count", 1)

        // Get result
        const result = await this.get(identifierName)
        const idValue = result.count

        // Return hashed version
        const idValueHashed = crypto.createHash('sha1').update(idValue.toString()).digest('base64');
        return idValueHashed
    }
}