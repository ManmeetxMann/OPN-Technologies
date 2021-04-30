import {Injectable} from '@nestjs/common'
import {Page} from '@opn-services/common/dto'
import {Brackets, SelectQueryBuilder} from 'typeorm'
import {
  DependantCreateDto,
  PatientCreateDto,
  PatientFilter,
  PatientUpdateDto,
} from '../../dto/patient'
import {
  PatientDigitalConsent,
  PatientHealth,
  PatientTravel,
} from '../../model/patient/patient-profile.entity'
import {Patient, PatientAddresses, PatientAuth} from '../../model/patient/patient.entity'
import {PatientToDelegates} from '../../model/patient/patient-relations.entity'
import {
  PatientAddressesRepository,
  PatientAuthRepository,
  PatientDigitalConsentRepository,
  PatientHealthRepository,
  PatientRepository,
  PatientToDelegatesRepository,
  PatientTravelRepository,
} from '../../repository/patient.repository'
import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'
import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import DataStore from '@opn-common-v1/data/datastore'
import {AuthUser} from '@opn-common-v1/data/user'

@Injectable()
export class PatientService {
  // eslint-disable-next-line max-params
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private patientRepository: PatientRepository,
    private patientAuthRepository: PatientAuthRepository,
    private patientAddressesRepository: PatientAddressesRepository,
    private patientHealthRepository: PatientHealthRepository,
    private patientTravelRepository: PatientTravelRepository,
    private patientDigitalConsentRepository: PatientDigitalConsentRepository,
    private patientToDelegatesRepository: PatientToDelegatesRepository,
  ) {}

  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)

  /**
   * Get patient record by id
   */
  async getbyId(patientId: string): Promise<Patient> {
    return this.patientRepository.findOne(patientId)
  }

  /**
   * Get patient profile with relations by id
   * @param patientId
   */
  async getProfilebyId(patientId: string): Promise<Patient> {
    return this.patientRepository.findOne(patientId, {
      relations: ['travel', 'health', 'addresses', 'digitalConsent', 'auth'],
    })
  }

  /**
   * Fetch all patients with pagination
   */
  async getAll({nameOrId, page, perPage}: PatientFilter): Promise<Page<Patient>> {
    let queryBuilder: SelectQueryBuilder<Patient> = this.patientRepository
      .createQueryBuilder('patient')
      .select()

    if (nameOrId) {
      const lower = nameOrId.toLowerCase()
      const matches = (property: Partial<keyof Patient>) =>
        `LOWER(patient.${property}) like '%${lower}%'`
      queryBuilder = queryBuilder.andWhere(
        new Brackets(sqb => {
          sqb.where(matches('firstName'))
          sqb.orWhere(matches('lastName'))
          sqb.orWhere(matches('patientPublicId'))
        }),
      )
    }

    return queryBuilder
      .limit(perPage)
      .offset(page * perPage)
      .getManyAndCount()
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  /**
   * Creates new patient profile with all relations
   * @param data
   */
  async createProfile(data: PatientCreateDto): Promise<Patient> {
    //TODO: For Sync: get firestore id then save firebaseKey
    data.authUserId = await this.firebaseAuthService.createUser(data.email)

    const firebaseUser = await this.userRepository.add({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      registrationId: data.registrationId,
      photo: data.photoUrl,
      phone: {
        diallingCode: 0,
        number: Number(data.phoneNumber),
      },
      authUserId: data.authUserId,
      active: false,
      organizationIds: [],
    } as AuthUser)

    data.firebaseKey = firebaseUser.id

    const patient = await this.createPatient(data)
    data.idPatient = patient.idPatient

    await Promise.all([
      this.saveAuth(data),
      this.saveAddress(data),
      this.saveHealth(data),
      this.saveTravel(data),
      this.saveConsent(data),
    ])

    return patient
  }

  /**
   * Update patient records
   * @param id
   * @param data
   */
  async updateProfile(patientId: string, data: PatientUpdateDto): Promise<Patient> {
    const patient = await this.getProfilebyId(patientId)
    data.idPatient = patientId
    patient.firstName = data.firstName
    patient.lastName = data.lastName
    patient.dateOfBirth = data.dateOfBirth
    patient.phoneNumber = data.phoneNumber
    patient.photoUrl = data.photoUrl
    patient.consentFileUrl = data.consentFileUrl

    const {travel, health, addresses, digitalConsent, auth} = patient

    if (data.email && auth?.email !== data.email) {
      this.firebaseAuthService.updateUser(auth.authUserId, data.email)
      auth.email = data.email
      await this.patientAuthRepository.save(auth)
    }

    await this.userRepository.updateProperties(patient.firebaseKey, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      registrationId: data.registrationId,
      photo: data.photoUrl,
      phone: {
        diallingCode: 0,
        number: Number(data.phoneNumber),
      },
    })

    const promises = await Promise.all([
      this.patientRepository.save(patient),
      this.saveTravel(data, travel?.idPatientTravel),
      this.saveHealth(data, health?.idPatientTravel),
      this.saveAddress(data, addresses?.idPatientAddresses),
      this.saveConsent(data, digitalConsent?.idPatientDigitalConsent),
    ])
    return promises[0]
  }

  async createPatient(data: PatientCreateDto | DependantCreateDto): Promise<Patient> {
    const entity = new Patient()
    entity.firebaseKey = data.firebaseKey
    entity.firstName = data.firstName
    entity.lastName = data.lastName
    entity.dateOfBirth = data.dateOfBirth
    entity.phoneNumber = data.phoneNumber
    entity.photoUrl = data.photoUrl
    entity.registrationId = data.registrationId
    entity.consentFileUrl = data.consentFileUrl
    return this.patientRepository.save(entity)
  }

  /**
   * Create dependant user (child) for delegate (parent)
   * @param delegateId parentId
   * @param data child user data
   */
  async createDependant(delegateId: string, data: DependantCreateDto): Promise<Patient> {
    //TODO: For Sync: get firestore id then save firebaseKey
    data.firebaseKey = 'TempKey' + Math.random().toString(36)

    const dependant = await this.createPatient(data)
    data.idPatient = dependant.idPatient

    await Promise.all([
      this.saveAddress(data),
      this.saveHealth(data),
      this.saveTravel(data),
      this.saveConsent(data),
      this.saveDependantOrDelegate(delegateId, dependant.idPatient),
    ])

    return dependant
  }

  private async saveAuth(data: PatientUpdateDto, idPatientAuth?: string): Promise<PatientAuth> {
    const auth = new PatientAuth()
    auth.idPatientAuth = idPatientAuth
    auth.patientId = data.idPatient
    auth.email = data.email
    auth.authUserId = data.authUserId
    return this.patientAuthRepository.save(auth)
  }

  private async saveAddress(
    data: PatientUpdateDto,
    idPatientAddresses?: string,
  ): Promise<PatientAddresses> {
    const address = new PatientAddresses()
    address.idPatientAddresses = idPatientAddresses
    address.patientId = data.idPatient
    address.homeAddress = data.homeAddress
    address.homeAddressUnit = data.homeAddressUnit
    address.postalCode = data.postalCode
    address.city = data.city
    address.country = data.country
    address.province = data.province
    return this.patientAddressesRepository.save(address)
  }

  private async saveHealth(
    data: PatientUpdateDto,
    idPatientTravel?: string,
  ): Promise<PatientHealth> {
    const health = new PatientHealth()
    health.idPatientTravel = idPatientTravel
    health.patientId = data.idPatient
    health.healthType = data.healthCardType ?? 'health card'
    health.healthCard = data.healthCardNumber
    return this.patientHealthRepository.save(health)
  }

  private async saveTravel(data: PatientUpdateDto, travelId?: string): Promise<PatientTravel> {
    const travel = new PatientTravel()
    travel.patientId = data.idPatient
    travel.idPatientTravel = travelId
    travel.travelCountry = data.travelCountry
    travel.travelPassport = data.travelPassport
    return this.patientTravelRepository.save(travel)
  }

  private async saveConsent(
    data: PatientUpdateDto,
    idPatientDigitalConsent?: string,
  ): Promise<PatientDigitalConsent> {
    const consent = new PatientDigitalConsent()
    consent.idPatientDigitalConsent = idPatientDigitalConsent
    consent.patientId = data.idPatient
    consent.agreeToConductFHHealthAssessment = data.agreeToConductFHHealthAssessment
    consent.readTermsAndConditions = data.readTermsAndConditions
    consent.receiveNotificationsFromGov = data.receiveNotificationsFromGov
    consent.receiveResultsViaEmail = data.receiveResultsViaEmail
    consent.shareTestResultWithEmployer = data.shareTestResultWithEmployer
    return this.patientDigitalConsentRepository.save(consent)
  }

  private async saveDependantOrDelegate(
    delegateId: string,
    dependantId: string,
    idPatientToDelegates?: string,
  ) {
    const patientToDelegates = new PatientToDelegates()
    patientToDelegates.idPatientToDelegates = idPatientToDelegates
    patientToDelegates.delegateId = delegateId
    patientToDelegates.dependantId = dependantId
    return this.patientToDelegatesRepository.save(patientToDelegates)
  }

  /**
   * Validate ownership on patientId sent by client
   */
  async isResourceOwner(patientId: string, authUserId: string): Promise<boolean> {
    const patient = await this.patientRepository.findOne(patientId, {
      relations: ['auth'],
    })

    return patient.auth.authUserId === authUserId
  }
}
