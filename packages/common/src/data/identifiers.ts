import DataModel from './datamodel.base'
import crypto from 'crypto'
import {IdentifiersSchema} from '../schemas/identifiers'

export class IdentifiersModel extends DataModel<IdentifiersSchema> {
  readonly rootPath = '__identifiers'
  readonly zeroSet = [
    {id: 'status', count: 10000},
    {id: 'access', count: 10000},
    {id: 'attestation', count: 10000},
  ]

  /**
   * For now increments a counter and converts it to hex
   * @param identifierName name of the identifier
   */
  async getUniqueValue(identifierName: string): Promise<string> {
    // Increment by 1
    // Return hashed version
    return this.increment(identifierName, 'count', 1).then(({count}) =>
      crypto.createHash('sha1').update(`${count}_${Date.now()}`).digest('base64'),
    )
  }
}
