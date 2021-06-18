import {getRepository} from 'typeorm'
import {deleteUserById} from '@opn-services/test/utils'
import {Patient, PatientAddresses, PatientAuth} from '../../src/model/patient/patient.entity'
import {
  PatientAddressesRepository,
  PatientAuthRepository,
  PatientDigitalConsentRepository,
  PatientHealthRepository,
  PatientRepository,
  PatientToOrganizationRepository,
  PatientTravelRepository,
} from '../../src/repository/patient.repository'
import {PatientToOrganization} from '@opn-services/user/model/patient/patient-relations.entity'
import {
  PatientDigitalConsent,
  PatientHealth,
  PatientTravel,
} from '../../src/model/patient/patient-profile.entity'

export class PatientTestUtility {
  patientRepository: PatientRepository
  authRepository: PatientAuthRepository
  addressesRepository: PatientAddressesRepository
  healthRepository: PatientHealthRepository
  travelRepository: PatientTravelRepository
  consentRepository: PatientDigitalConsentRepository
  patientToOrgRepository: PatientToOrganizationRepository

  constructor() {
    this.patientRepository = getRepository(Patient)
    this.authRepository = getRepository(PatientAuth)
    this.addressesRepository = getRepository(PatientAddresses)
    this.healthRepository = getRepository(PatientHealth)
    this.travelRepository = getRepository(PatientTravel)
    this.consentRepository = getRepository(PatientDigitalConsent)
    this.patientToOrgRepository = getRepository(PatientToOrganization)
  }

  createPatient(data: {email: string}): Promise<Patient> {
    return this.patientRepository.save({
      firebaseKey:
        'TestFirebaseKey' +
        Math.random()
          .toString(36)
          .substring(7),
      email: data.email,
      firstName: 'PATIENT_TEST_NAME',
      lastName: 'PATIENT_LNAME',
      phoneNumber: '111222333',
      isEmailVerified: true,
    })
  }

  async findAndRemoveProfile(criteria: unknown): Promise<void> {
    const patient = await this.patientRepository.findOne(criteria)

    if (patient?.firebaseKey) {
      await deleteUserById(patient?.firebaseKey)
    }

    const deleteCriteria = {patientId: patient?.idPatient}
    await Promise.all([
      this.authRepository.delete(deleteCriteria),
      this.addressesRepository.delete(deleteCriteria),
      this.healthRepository.delete(deleteCriteria),
      this.travelRepository.delete(deleteCriteria),
      this.consentRepository.delete(deleteCriteria),
      this.patientToOrgRepository.delete(deleteCriteria),
    ])
  }

  async removeProfileByAuth(authCriteria: unknown): Promise<void> {
    const patients = await this.authRepository.find(authCriteria)
    const removedProfiles = patients.map(patient => this.findAndRemoveProfile(patient.patientId))
    await Promise.all(removedProfiles)

    const removedPatients = patients.map(patient =>
      this.patientRepository.delete(patient.patientId),
    )
    await Promise.all(removedPatients)
  }

  getProfilePayload(data: {email: string; firstName?: string; lastName?: string}): unknown {
    return {
      email: data.email,
      firstName: data.firstName ?? 'TestFirstName',
      lastName: data.lastName ?? 'TestLastName',
      registrationId: 'T_111',
      photoUrl: 'TEST_PHOTO_URL',
      phoneNumber: '111222333',
      consentFileUrl: 'TEST_PHOTO_URL',
      dateOfBirth: '2021-01-01',
      homeAddress: 'PATIENT_TEST_HOME',
      homeAddressUnit: 'PATIENT_TEST_UNIT',
      city: 'PATIENT_TEST_CITY',
      province: 'PATIENT_TEST_PROVINCE',
      country: 'PATIENT_TEST_COUTRY',
      postalCode: '10200',
      healthCardType: 'health card',
      healthCardNumber: '111222333',
      travelPassport: 'A1234',
      travelCountry: 'PATIENT_TEST_TRAVEL_COUNTRY',
      agreeToConductFHHealthAssessment: true,
      shareTestResultWithEmployer: true,
      readTermsAndConditions: true,
      receiveResultsViaEmail: true,
      receiveNotificationsFromGov: true,
      isEmailVerified: true,
    }
  }
}
