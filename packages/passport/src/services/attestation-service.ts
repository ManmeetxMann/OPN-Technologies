import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'
import {Attestation, AttestationModel} from '../models/attestation'
import {serverTimestamp} from '../../../common/src/utils/times'

export class AttestationService {
  private dataStore = new DataStore()
  private attestationRepository = new AttestationModel(this.dataStore)

  save(attestation: Attestation): Promise<Attestation> {
    return this.attestationRepository
      .add({
        ...attestation,
        attestationTime: serverTimestamp(),
      })
      .then(({attestationTime: time, ...attestation}) => ({
        ...attestation,
        // @ts-ignore
        attestationTime: new firestore.Timestamp(time.seconds, time.nanoseconds)
          .toDate()
          .toISOString(),
      }))
  }
}
