import {EntitySubscriberInterface, EventSubscriber, InsertEvent} from 'typeorm'
import {Patient} from '../model/patient/patient.entity'
const publicPatientIdPrefix = process.env.PATIENT_ID_PREFIX || 'FH'

@EventSubscriber()
export class PatientSubscriber implements EntitySubscriberInterface {
  listenTo(): typeof Patient {
    return Patient
  }

  afterInsert(event: InsertEvent<Patient>): void {
    const repo = event.manager.connection.getRepository(Patient)
    event.entity.patientPublicId = `${publicPatientIdPrefix}${String(
      event.entity.idPatient,
    ).padStart(6, '0')}`
    repo.save(event.entity)
  }
}
