/* eslint-disable max-lines */
import {Injectable, NotFoundException} from '@nestjs/common'
import {Page} from '@opn-services/common/dto'
import {Brackets, SelectQueryBuilder} from 'typeorm'
import {
  DependantCreateAdminDto,
  DependantCreateDto,
  Migration,
  migrationActions,
  PatientCreateAdminDto,
  PatientCreateDto,
  PatientFilter,
  PatientUpdateDto,
} from '../../dto/patient'
import {HomeTestPatientDto} from '../../dto/home-patient'
import {
  PatientDigitalConsent,
  PatientHealth,
  PatientTravel,
} from '../../model/patient/patient-profile.entity'
import {Patient, PatientAddresses, PatientAuth} from '../../model/patient/patient.entity'
import {
  PatientToDelegates,
  PatientToOrganization,
} from '../../model/patient/patient-relations.entity'
import {
  PatientAddressesRepository,
  PatientAuthRepository,
  PatientDigitalConsentRepository,
  PatientHealthRepository,
  PatientRepository,
  PatientToDelegatesRepository,
  PatientTravelRepository,
  PatientToOrganizationRepository,
} from '../../repository/patient.repository'

import {FirebaseAuthService} from '@opn-services/common/services/firebase/firebase-auth.service'
import {OpnConfigService} from '@opn-services/common/services'
import {BadRequestException} from '@opn-services/common/exception'
import {LogError} from '@opn-services/common/utils/logging'
import {PubSubEvents, PubSubFunctions} from '@opn-services/common/types/activity-logs'

import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {OrganizationModel} from '@opn-enterprise-v1/repository/organization.repository'
import DataStore from '@opn-common-v1/data/datastore'
import {AuthUser, UserStatus} from '@opn-common-v1/data/user'
import {Registration} from '@opn-common-v1/data/registration'
import {RegistrationService} from '@opn-common-v1/service/registry/registration-service'
import {MessagingFactory} from '@opn-common-v1/service/messaging/messaging-service'
import {safeTimestamp} from '@opn-common-v1/utils/datetime-util'
import {AuthShortCodeRepository} from '@opn-enterprise-v1/repository/auth-short-code.repository'
import {AuthShortCode} from '@opn-enterprise-v1/models/auth'
import * as _ from 'lodash'
import {ResourceNotFoundException} from '@opn-services/common/exception'
import {PCRTestResultsRepository} from '@opn-services/user/repository/test-result.repository'
import {AppointmentsRepository} from '@opn-reservation-v1/respository/appointments-repository'
import {AppointmentDBModel} from '@opn-reservation-v1/models/appointment'
import {AppointmentActivityAction} from '@opn-reservation-v1/models/appointment'
import {ActionStatus} from '@opn-services/common/model'

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
    private patientToOrganizationRepository: PatientToOrganizationRepository,
    private configService: OpnConfigService,
  ) {}

  private dataStore = new DataStore()
  private userRepository = new UserRepository(this.dataStore)
  private organizationModel = new OrganizationModel(this.dataStore)
  private authShortCodeRepository = new AuthShortCodeRepository(this.dataStore)
  private appointmentRepository = new AppointmentsRepository(this.dataStore)
  private testResultRepository = new PCRTestResultsRepository(this.dataStore)
  private messaging = MessagingFactory.getPushableMessagingService()
  private registrationService = new RegistrationService()

  /**
   * Get patient record by id
   */
  async getbyId(patientId: number): Promise<Patient> {
    return this.patientRepository.findOne(patientId)
  }

  /**
   * Get patient profile with relations by id
   * @param patientId
   */
  async getProfilebyId(patientId: number): Promise<Patient> {
    return this.patientRepository.findOne(patientId, {
      relations: ['travel', 'health', 'addresses', 'digitalConsent', 'auth', 'organizations'],
    })
  }

  async getPatientByDependantId(dependantId: number): Promise<Patient> {
    return this.patientRepository.findOne({
      where: {idPatient: dependantId},
      relations: ['dependants'],
    })
  }

  async getAuthByEmail(email: string): Promise<PatientAuth> {
    return this.patientAuthRepository.findOne({where: {email}})
  }

  async getAuthByAuthUserId(authUserId: string): Promise<PatientAuth> {
    return this.patientAuthRepository.findOne({where: {authUserId}})
  }

  async getProfileByFirebaseKey(firebaseKey: string): Promise<Patient> {
    return this.patientRepository.findOne(
      {firebaseKey},
      {
        relations: ['travel', 'health', 'addresses', 'digitalConsent', 'auth', 'organizations'],
      },
    )
  }

  async getProfilesByIds(patientIds: number[]): Promise<Patient[]> {
    return this.patientRepository.findByIds(patientIds, {
      relations: ['travel', 'health', 'addresses', 'digitalConsent', 'auth', 'organizations'],
    })
  }
  /**
   * Fetch all patients with pagination
   */
  async getAll({nameOrId, organizationId, page, perPage}: PatientFilter): Promise<Page<Patient>> {
    let queryBuilder: SelectQueryBuilder<Patient> = this.patientRepository.createQueryBuilder(
      'patient',
    )

    if (organizationId) {
      queryBuilder = queryBuilder.innerJoinAndSelect(
        'patient.organizations',
        'organization',
        'organization.firebaseOrganizationId = :firebaseOrganizationId',
        {firebaseOrganizationId: organizationId},
      )
    }

    if (nameOrId) {
      const lower = nameOrId.toLowerCase()
      const matches = (property: Partial<keyof Patient>, value: string | number) =>
        `LOWER(patient.${property}) like '%${value}%'`
      queryBuilder = queryBuilder.andWhere(
        new Brackets(sqb => {
          sqb.where(matches('firstName', lower))
          sqb.orWhere(matches('lastName', lower))
          sqb.orWhere(matches('idPatient', Number(lower.slice(2))))
        }),
      )
    }

    return queryBuilder
      .select()
      .limit(perPage)
      .offset((page - 1) * perPage)
      .getManyAndCount()
      .then(([data, totalItems]) => Page.of(data, page, perPage, totalItems))
  }

  async createHomePatientProfile(data: HomeTestPatientDto): Promise<Patient> {
    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      isEmailVerified: false,
      authUserId: data.authUserId,
      active: false,
      organizationIds: [],
    } as AuthUser

    if (data.organizationId) {
      userData.organizationIds.push(data.organizationId)
    }

    const firebaseUser = await this.userRepository.add(userData)
    data.firebaseKey = firebaseUser.id
    data.isEmailVerified = false
    const patient = await this.createPatient(data as PatientCreateDto)
    data.idPatient = patient.idPatient

    await Promise.all([this.saveAuth(data), this.saveAddress(data), this.saveOrganization(data)])

    return patient
  }

  /**
   * Creates new patient profile with all relations
   * @param data
   */
  async createProfile(
    data: PatientCreateDto | PatientCreateAdminDto,
    hasPublicOrg = false,
  ): Promise<Patient> {
    const organizationIds = []
    if (hasPublicOrg) {
      organizationIds.push(this.configService.get('PUBLIC_ORG_ID'))
    }

    if (data.organizationId) {
      organizationIds.push(data.organizationId)
    }

    const userData = {
      firstName: data.firstName,
      isEmailVerified: false,
      lastName: data.lastName,
      registrationId: data.registrationId ?? null,
      photo: data.photoUrl ?? null,
      phoneNumber: data.phoneNumber ?? null,
      authUserId: data.authUserId,
      active: false,
      organizationIds,
    } as AuthUser

    if (data.email) {
      userData.email = data.email

      // user is being created by Admin
      if (!data.authUserId) {
        userData.authUserId = await this.firebaseAuthService.createUser(data.email)
        data.authUserId = userData.authUserId
      }
    }

    const firebaseUser = await this.userRepository.add(userData)
    data.firebaseKey = firebaseUser.id
    data.isEmailVerified = false

    const patient = await this.createPatient(data)
    data.idPatient = patient.idPatient

    await Promise.all([
      this.saveAuth(data),
      this.saveAddress(data),
      this.saveHealth(data),
      this.saveTravel(data),
      this.saveConsent(data),
      this.saveOrganization(data),
    ])

    return patient
  }

  async findNewUsersByEmail(email: string): Promise<Patient[]> {
    return this.patientRepository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.auth', 'auth')
      .where('status = :status', {status: UserStatus.NEW})
      .andWhere('auth.email = :email', {
        email,
      })
      .getMany()
  }

  async findShortCodeByPatientEmail(email: string): Promise<AuthShortCode> {
    const shortCodes = await this.authShortCodeRepository.findWhereEqual('email', email)
    return shortCodes[0]
  }

  async findAndRemoveShortCodes(email: string): Promise<void> {
    const shortCodes = await this.authShortCodeRepository.findWhereEqual('email', email)
    if (shortCodes.length) {
      await this.authShortCodeRepository.deleteBulk(shortCodes.map(code => code.id))
    }
  }

  verifyCodeOrThrowError(code: string, userCode: string): void {
    if (code !== userCode) {
      throw new NotFoundException('ShortCode not found')
    }
  }

  /**
   * Update patient records
   * @param id
   * @param data
   */
  async updateProfile(patientId: number, data: PatientUpdateDto): Promise<Patient> {
    const patient = await this.getProfilebyId(patientId)
    data.idPatient = patientId
    patient.firstName = data.firstName
    patient.lastName = data.lastName
    patient.dateOfBirth = data.dateOfBirth
    patient.phoneNumber = data.phoneNumber
    patient.isEmailVerified = data.isEmailVerified
    patient.photoUrl = data.photoUrl
    patient.consentFileUrl = data.consentFileUrl

    if (data?.lastAppointment) {
      patient.lastAppointment = safeTimestamp(data.lastAppointment)
    }

    if (data.trainingCompletedOn) {
      patient.trainingCompletedOn = new Date()
    }

    const {travel, health, addresses, digitalConsent, auth} = patient

    if (auth && data.email && auth?.email !== data.email) {
      this.firebaseAuthService.updateUser(auth.authUserId, data.email)
      auth.email = data.email
      await this.patientAuthRepository.save(auth)
    }

    const userSync = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isEmailVerified: data.isEmailVerified,
      ...(data.registrationId && {registrationId: data.registrationId}),
      ...(data.photoUrl && {photo: data.photoUrl}),
      phone: {
        diallingCode: 0,
      },
    }

    if (data.phoneNumber) {
      userSync.phone['number'] = Number(data.phoneNumber)
    }

    // clear payload from undefined values before update sync
    Object.keys(userSync).forEach(key => userSync[key] === undefined && delete userSync[key])
    await this.userRepository.updateProperties(patient.firebaseKey, userSync)

    const promises = await Promise.all([
      this.patientRepository.save(patient),
      this.saveTravel(data, travel?.idPatientTravel),
      this.saveHealth(data, health?.idPatientTravel),
      this.saveAddress(data, addresses?.idPatientAddresses),
      this.saveConsent(data, digitalConsent?.idPatientDigitalConsent),
    ])
    return promises[0]
  }

  async connectOrganization(patientId: number, firebaseOrganizationId: string): Promise<void> {
    const patient = await this.getProfilebyId(patientId)
    if (!patient) {
      throw new NotFoundException('User with given id not found')
    }

    await this.patientToOrganizationRepository.save({
      patientId,
      firebaseOrganizationId,
    })

    const organization = this.organizationModel.findOneById(firebaseOrganizationId)
    if (!organization) {
      throw new NotFoundException('Organization with given id not found')
    }
    const firebaseUser = await this.userRepository.findOneById(patient.firebaseKey)
    if (!firebaseUser) {
      throw new NotFoundException('User with given id not found')
    }

    await this.userRepository.updateProperty(
      firebaseUser.id,
      'organizationIds',
      _.uniq([...(firebaseUser.organizationIds ?? []), firebaseOrganizationId]),
    )
  }

  async createPatient(
    data: PatientCreateDto | DependantCreateDto | PatientCreateAdminDto,
  ): Promise<Patient> {
    const entity = new Patient()
    entity.firebaseKey = data.firebaseKey
    entity.firstName = data.firstName
    entity.lastName = data.lastName
    entity.phoneNumber = data.phoneNumber
    entity.dateOfBirth = data.dateOfBirth
    entity.photoUrl = data.photoUrl
    entity.registrationId = data.registrationId
    entity.consentFileUrl = data.consentFileUrl
    entity.isEmailVerified = true

    return this.patientRepository.save(entity)
  }

  /**
   * Create dependant user (child) for delegate (parent)
   * @param delegateId parentId
   * @param data child user data
   */
  async createDependant(
    delegateId: number,
    data: DependantCreateDto | DependantCreateAdminDto,
  ): Promise<Patient> {
    const firebaseUser = await this.userRepository.add({
      firstName: data.firstName,
      lastName: data.lastName,
      registrationId: data.registrationId ?? null,
      photo: data.photoUrl ?? null,
      phone: {
        diallingCode: 0,
        number: Number(data.phoneNumber ?? 0),
      },
      active: false,
      organizationIds: [],
    } as AuthUser)

    data.firebaseKey = firebaseUser.id

    if (data.organizationId) {
      firebaseUser.organizationIds.push(data.organizationId)
    }

    const dependant = await this.createPatient(data)
    data.idPatient = dependant.idPatient

    await Promise.all([
      this.saveAddress(data),
      this.saveHealth(data),
      this.saveTravel(data),
      this.saveConsent(data),
      this.saveOrganization(data),
      this.saveDependantOrDelegate(delegateId, dependant.idPatient),
    ])

    return dependant
  }

  private async saveAuth(data: PatientUpdateDto, idPatientAuth?: string): Promise<PatientAuth> {
    const auth = new PatientAuth()
    auth.idPatientAuth = idPatientAuth
    auth.patientId = data.idPatient
    auth.email = data.email
    auth.phoneNumber = data.phoneNumber
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

  private async saveOrganization(data: PatientUpdateDto, idPatientToOrganization?: string) {
    const publicOrg = this.configService.get<string>('PUBLIC_ORG_ID')
    const organization = new PatientToOrganization()
    organization.idPatientToOrganization = idPatientToOrganization
    organization.patientId = data.idPatient
    organization.firebaseOrganizationId = data.organizationId ?? publicOrg
    return this.patientToOrganizationRepository.save(organization)
  }

  async getUnconfirmedPatients(
    phoneNumber: string,
    email: string,
    authUserId: string,
  ): Promise<(Patient & {resultsCount: number})[]> {
    const patientQuery = this.patientRepository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.auth', 'auth')
      .where('status = :status', {status: UserStatus.NEW})
      .andWhere('auth.phoneNumber = :phoneNumber', {
        phoneNumber,
      })

    const patient = await this.patientRepository.findOne({firebaseKey: authUserId})

    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    if (email && patient.isEmailVerified) {
      patientQuery.orWhere('auth.email = :email AND status = :status', {email})
    }

    const patients = await patientQuery.getMany()

    const patientKeys = patients.map(patient => patient.firebaseKey)

    const testResults = await this.testResultRepository.findWhereIn('userId', patientKeys)

    return patients.map(patient => ({
      ...patient,
      resultsCount: testResults.reduce((previousValue, currentValue) => {
        if (currentValue.userId === patient.firebaseKey) {
          return previousValue + 1
        }
        return previousValue
      }, 0),
    }))
  }

  async migratePatient(currentUserId: string, migration: Migration): Promise<ActionStatus> {
    try {
      const currentPatient = await this.patientRepository.findOne({
        where: {
          firebaseKey: currentUserId,
        },
      })
      const patient = await this.patientRepository.findOne(migration.notConfirmedPatientId)
      if (!patient) {
        throw new ResourceNotFoundException('Patient was not found')
      }
      if (migration.action === migrationActions.New) {
        await this.patientRepository.update(migration.notConfirmedPatientId, {
          status: UserStatus.CONFIRMED,
        })
        await this.userRepository.updateProperties(patient.firebaseKey, {
          status: UserStatus.CONFIRMED,
        })

        await this.saveDependantOrDelegate(currentPatient.idPatient, patient.idPatient)
        await this.patientRepository.save(currentPatient)
      } else if (migration.action === migrationActions.Merge) {
        const providedPatient = await this.patientRepository.findOne(migration.patientId)
        const appointments = await this.appointmentRepository.findWhereEqual(
          'userId',
          patient.firebaseKey,
        )
        const testResults = await this.testResultRepository.findWhereEqual(
          'userId',
          patient.firebaseKey,
        )
        await Promise.all(
          appointments.map(async appointment => {
            await this.appointmentRepository.updateAppointment({
              id: appointment.id,
              updates: {
                userId: providedPatient.firebaseKey,
              },
              action: AppointmentActivityAction.MigrationFromUnconfirmed,
              actionBy: currentPatient.firebaseKey,
            })
          }),
        )
        await Promise.all(
          testResults.map(async testResult => {
            await this.testResultRepository.updateProperties(testResult.id, {
              userId: providedPatient.firebaseKey,
            })
          }),
        )
        const providedFirebasePatient = await this.userRepository.findOneById(
          providedPatient.firebaseKey,
        )
        const firebasePatient = await this.userRepository.findOneById(providedFirebasePatient.id)
        await this.userRepository.updateProperties(providedPatient.firebaseKey, {
          organizationIds: _.uniq([
            ...(providedFirebasePatient.organizationIds ?? []),
            ...(firebasePatient.organizationIds ?? []),
          ]),
        })
        await this.userRepository.delete(firebasePatient.id)
        await this.patientRepository.remove(patient)
      }
      return ActionStatus.success
    } catch (e) {
      return ActionStatus.fail
    }
  }

  async getDirectDependents(patientId: number): Promise<Patient> {
    return await this.patientRepository.findOne(patientId, {
      relations: ['dependants'],
    })
  }

  private async saveDependantOrDelegate(
    delegateId: number,
    dependantId: number,
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
  async isResourceOwner(patientId: number, authUserId: string): Promise<boolean> {
    const patient = await this.patientRepository.findOne(patientId, {
      relations: ['auth'],
    })

    return patient.auth.authUserId === authUserId
  }

  /**
   * Update or insert push token
   */
  async upsertPushToken(
    patientId: number,
    registrationId: string,
    registration: Omit<Registration, 'id'>,
  ): Promise<void> {
    const {pushToken, osVersion, platform} = registration

    // validate if we get token
    if (pushToken) {
      await this.messaging.validatePushToken(pushToken)
    }

    // create or update token
    const {id} = await this.registrationService.upsert(registrationId, {
      osVersion,
      platform,
      pushToken,
    })

    await this.patientRepository.update({idPatient: patientId}, {registrationId: id})
  }

  async updateProfileWithPubSub(data: AppointmentDBModel): Promise<void> {
    if (!data?.userId) {
      const errorMessage = `User/Patient id is missing`
      LogError(PubSubFunctions.updateProfileWithPubSub, PubSubEvents.profileUpdateFailed, {
        errorMessage,
      })
      throw new BadRequestException(errorMessage)
    }

    const {userId} = data
    const patient = await this.patientRepository.findOne({
      where: [{idPatient: userId}, {firebaseKey: userId}],
    })

    if (!patient) {
      const errorMessage = `Profile with ${userId} not exists`
      LogError(PubSubFunctions.updateProfileWithPubSub, PubSubEvents.profileUpdateFailed, {
        errorMessage,
      })
      throw new BadRequestException(errorMessage)
    }

    const updateDto = new PatientUpdateDto()
    updateDto.phoneNumber = data?.phone
    updateDto.dateOfBirth = data?.dateOfBirth
    updateDto.healthCardType = data?.ohipCard
    updateDto.travelPassport = data?.travelID
    updateDto.travelCountry = data?.travelIDIssuingCountry
    updateDto.homeAddress = data?.address
    updateDto.homeAddressUnit = data?.addressUnit
    updateDto.city = data?.city
    updateDto.country = data?.country
    updateDto.province = data?.province
    updateDto.agreeToConductFHHealthAssessment = data?.agreeToConductFHHealthAssessment
    updateDto.readTermsAndConditions = data?.readTermsAndConditions
    updateDto.receiveNotificationsFromGov = data?.receiveNotificationsFromGov
    updateDto.receiveResultsViaEmail = data?.receiveResultsViaEmail
    updateDto.shareTestResultWithEmployer = data?.shareTestResultWithEmployer

    if (data?.dateOfAppointment) {
      updateDto.lastAppointment = safeTimestamp(data.dateOfAppointment)
    }

    await this.updateProfile(patient.idPatient, updateDto)
  }
}
