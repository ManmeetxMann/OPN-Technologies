import {TokenSource} from '@opn-common-v1/data/registration'
import {OpnSources} from '../types/authorization'

export const mapOpnSourceHeader = (opnSource: OpnSources): TokenSource => {
  switch (opnSource) {
    case OpnSources.FH_Android:
      return TokenSource.FH
    case OpnSources.FH_IOS:
      return TokenSource.FH
    case OpnSources.OPN_Android:
      return TokenSource.OPN
    case OpnSources.OPN_IOS:
      return TokenSource.OPN
    default:
      return TokenSource.OPN
  }
}
