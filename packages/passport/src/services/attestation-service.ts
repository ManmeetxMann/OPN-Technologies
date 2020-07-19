import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'
import {Attestation, AttestationModel} from '../models/attestation'
import {PassportStatus, PassportStatuses} from '../models/passport'
import moment from 'moment'

export class AttestationService {
  private dataStore = new DataStore()
  private attestationRepository = new AttestationModel(this.dataStore)

  save(attestation: Attestation): Promise<Attestation> {
    return this.attestationRepository
      .add({
        ...attestation,
        attestationTime: firestore.FieldValue.serverTimestamp(),
      })
      .then(({attestationTime: time, ...attestation}) => ({
        ...attestation,
        // @ts-ignore
        attestationTime: new firestore.Timestamp(time.seconds, time.nanoseconds)
          .toDate()
          .toISOString(),
      }))
  }

  getTodayDeniedAttestationsForLocation(locationId: string): Promise<Attestation[]> {
    return this.getTodayAttestationForLocationAndStatus(
      locationId,
      PassportStatuses.Stop,
    ).then((stops) =>
      this.getTodayAttestationForLocationAndStatus(
        locationId,
        PassportStatuses.Caution,
      ).then((cautions) => [...stops, ...cautions]),
    )
  }

  private getTodayAttestationForLocationAndStatus(
    locationId: string,
    status: PassportStatus,
  ): Promise<Attestation[]> {
    const today = moment().startOf('day').toDate()
    return this.dataStore.firestoreORM
      .collection<Attestation>({path: this.attestationRepository.rootPath})
      .where('locationId', '==', locationId)
      .where('status', '==', status)
      .where('attestationTime', '>=', today)
      .fetch()
  }
}
