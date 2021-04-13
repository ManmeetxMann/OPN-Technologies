import {EntityRepository, Repository} from 'typeorm'
import * as patient from '../model/patient/patient.entity'
import * as patientProfile from '../model/patient/patient-profile'
import * as patientRelations from '../model/patient/patient-relations.entity'

/**
 * Patient
 */
@EntityRepository(patient.Patient)
export class PatientRepository extends Repository<patient.Patient> {}

@EntityRepository(patient.PatientAdmin)
export class PatientAdminRepository extends Repository<patient.PatientAdmin> {}

@EntityRepository(patient.PatientAuth)
export class PatientAuthRepository extends Repository<patient.PatientAuth> {}

@EntityRepository(patient.PatientAddresses)
export class PatientAddressesRepository extends Repository<patient.PatientAddresses> {}

/**
 * Patient profile data
 */
@EntityRepository(patientProfile.PatientHealth)
export class PatientHealthRepository extends Repository<patientProfile.PatientHealth> {}

@EntityRepository(patientProfile.PatientTravel)
export class PatientTravelRepository extends Repository<patientProfile.PatientTravel> {}

@EntityRepository(patientProfile.PatientDigitalConsent)
export class PatientDigitalConsentRepository extends Repository<
  patientProfile.PatientDigitalConsent
> {}

/**
 * Patient relation to other tables
 */
@EntityRepository(patientRelations.PatientToDelegates)
export class PatientToDelegatesRepository extends Repository<patientRelations.PatientToDelegates> {}

@EntityRepository(patientRelations.PatientToOrganization)
export class PatientToOrganizationRepository extends Repository<
  patientRelations.PatientToOrganization
> {}
