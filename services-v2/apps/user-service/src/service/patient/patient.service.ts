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
  PatientOrganizationsDto,
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
  PatientToOrganizationRepository,
  PatientTravelRepository,
} from '../../repository/patient.repository'

import {FirebaseAuthService} from '@opn-services/common/services/firebase/firebase-auth.service'
import {OpnConfigService} from '@opn-services/common/services'
import {BadRequestException, ResourceNotFoundException} from '@opn-services/common/exception'
import {LogError} from '@opn-services/common/utils/logging'
import * as activityLogs from '@opn-services/common/types/activity-logs'
import {DefaultHttpException} from '@opn-services/common/exception'

import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {OrganizationModel} from '@opn-enterprise-v1/repository/organization.repository'
import DataStore from '@opn-common-v1/data/datastore'
import {AuthUser, UserStatus, UserCreator} from '@opn-common-v1/data/user'
import {Registration} from '@opn-common-v1/data/registration'
import {RegistrationService} from '@opn-common-v1/service/registry/registration-service'
import {MessagingFactory} from '@opn-common-v1/service/messaging/messaging-service'
import {safeTimestamp} from '@opn-common-v1/utils/datetime-util'
import {AuthShortCodeRepository} from '@opn-enterprise-v1/repository/auth-short-code.repository'
import {AuthShortCode} from '@opn-enterprise-v1/models/auth'
import * as _ from 'lodash'
import {PCRTestResultsRepository} from '@opn-services/user/repository/test-result.repository'
import {AppointmentsRepository} from '@opn-reservation-v1/respository/appointments-repository'
import {AppointmentActivityAction, AppointmentDBModel} from '@opn-reservation-v1/models/appointment'
import {ActionStatus} from '@opn-services/common/model'
import {OrganizationService} from '@opn-enterprise-v1/services/organization-service'
import {Organization} from '@opn-enterprise-v1/models/organization'
import {Platforms} from '@opn-common-v1/types/platform'
import {OpnSources} from '@opn-services/common/types/authorization'

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
  private organizationService = new OrganizationService()
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

  async getUserOrganizations(
    patientToOrganization: PatientToOrganization[],
  ): Promise<PatientOrganizationsDto[]> {
    const organizations = await this.organizationModel.findWhereIdIn(
      patientToOrganization.map(org => org.firebaseOrganizationId),
    )
    return organizations.map(organization => ({
      key: organization.key,
      name: organization.name,
    }))
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

  async createAuthUserInFirestore(user: AuthUser): Promise<AuthUser> {
    try {
      return await this.userRepository.add(user)
    } catch (error) {
      this.logUserSyncFailure(error)
      throw new DefaultHttpException(error)
    }
  }

  async createHomePatientProfile(
    data: HomeTestPatientDto,
    tokenSource: OpnSources,
  ): Promise<Patient> {
    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      isEmailVerified: false,
      authUserId: data.authUserId,
      active: false,
      photo: data.photoUrl ?? this.configService.get('DEFAULT_USER_PHOTO'),
      organizationIds: [this.configService.get('PUBLIC_ORG_ID')],
      creator: UserCreator.syncFromSQL,
    } as AuthUser

    if (data.organizationId) {
      userData.organizationIds.push(data.organizationId)
    }

    // Check if user already exist
    const firestoreUsers = await this.userRepository
      .getQueryFindWhereEqual('authUserId', data.authUserId)
      .fetch()

    if (firestoreUsers.length > 1) {
      LogError(
        activityLogs.PatientServiceFunctions.createHomePatientProfile,
        activityLogs.PatientServiceEvents.duplicatedUserFound,
        {
          errorMessage: `Found duplicated authUserId: ${data.authUserId}`,
        },
      )
    }

    let firebaseUser = null
    if (firestoreUsers.length === 0) {
      firebaseUser = await this.createAuthUserInFirestore(userData)
    } else {
      firebaseUser = firestoreUsers[0]
    }

    await this.addInPublicGroup(firebaseUser.id)
    data.firebaseKey = firebaseUser.id
    data.isEmailVerified = false
    data.photoUrl = data.photoUrl ?? this.configService.get('DEFAULT_USER_PHOTO')
    const patient = await this.createPatient(data as PatientCreateDto, tokenSource)
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
    tokenSource: OpnSources,
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
      registrationId: await this.getRegistrationId(data, tokenSource),
      photo: data.photoUrl ?? null,
      phoneNumber: data.phoneNumber ?? null,
      authUserId: data.authUserId,
      active: false,
      organizationIds,
      creator: UserCreator.syncFromSQL,
    } as AuthUser

    if (data.email) {
      userData.email = data.email

      // user is being created by Admin
      if (!data.authUserId) {
        userData.authUserId = await this.firebaseAuthService.createUser(data.email)
        data.authUserId = userData.authUserId
      }
    }

    // Check if user already exist
    const firestoreUsers = await this.userRepository
      .getQueryFindWhereEqual('authUserId', data.authUserId)
      .fetch()

    if (firestoreUsers.length > 1) {
      LogError(
        activityLogs.PatientServiceFunctions.createProfile,
        activityLogs.PatientServiceEvents.duplicatedUserFound,
        {
          errorMessage: `Found duplicated authUserId: ${data.authUserId}`,
        },
      )
    }

    let firebaseUser = null
    if (firestoreUsers.length === 0) {
      firebaseUser = await this.createAuthUserInFirestore(userData)
    } else {
      firebaseUser = firestoreUsers[0]
    }

    data.firebaseKey = firebaseUser.id
    data.isEmailVerified = false
    if (hasPublicOrg) {
      await this.addInPublicGroup(firebaseUser.id)
    }

    const patient = await this.createPatient(data, tokenSource)
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
  async updateProfile(
    patientId: number,
    data: PatientUpdateDto,
    tokenSource: OpnSources,
  ): Promise<Patient> {
    const patient = await this.getProfilebyId(patientId)
    data.idPatient = patientId
    patient.firstName = data.firstName || patient.firstName
    patient.lastName = data.lastName || patient.lastName
    patient.gender = data.gender || patient.gender
    patient.dateOfBirth = data.dateOfBirth || patient.dateOfBirth
    patient.phoneNumber = data.phoneNumber || patient.phoneNumber
    patient.isEmailVerified = data.isEmailVerified || patient.isEmailVerified
    patient.photoUrl = data.photoUrl || patient.photoUrl
    patient.consentFileUrl = data.consentFileUrl || patient.consentFileUrl

    if (data?.lastAppointment) {
      patient.lastAppointment = safeTimestamp(data.lastAppointment)
    }

    if (data.trainingCompletedOn) {
      patient.trainingCompletedOn = new Date()
    }

    const {travel, health, addresses, digitalConsent, auth} = patient

    if (auth && data.email && auth?.email !== data.email) {
      await this.firebaseAuthService.updateUser(auth.authUserId, {email: data.email})
      auth.email = data.email
      await this.patientAuthRepository.save(auth)
    }

    const userSync = {
      firstName: patient.firstName,
      lastName: patient.lastName,
      isEmailVerified: patient.isEmailVerified,
      registrationId: await this.getRegistrationId(
        {...data, firebaseKey: patient.firebaseKey},
        tokenSource,
      ),
      ...(patient.photoUrl && {photo: patient.photoUrl}),
      phone: {
        diallingCode: 0,
      },
    }

    if (auth?.email) {
      userSync['email'] = auth.email
    }

    if (data.phoneNumber) {
      userSync.phone['number'] = Number(data.phoneNumber)
    }

    // clear payload from undefined values before update sync
    Object.keys(userSync).forEach(key => userSync[key] === undefined && delete userSync[key])
    await this.userRepository.updateProperties(patient.firebaseKey, userSync)

    await Promise.all([
      this.saveTravel(data, travel?.idPatientTravel),
      this.saveHealth(data, health?.idPatientTravel),
      this.saveAddress(data, addresses?.idPatientAddresses),
      this.saveConsent(data, digitalConsent?.idPatientDigitalConsent),
    ])
    delete patient.travel
    delete patient.health
    delete patient.addresses
    delete patient.digitalConsent
    return this.patientRepository.save(patient)
  }

  async setPatientAndUserEmail(patientId: number, data: PatientUpdateDto): Promise<void> {
    const patient = await this.getProfilebyId(patientId)
    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }
    const auth = patient.auth

    if (auth && data.email && auth?.email !== data.email) {
      auth.email = data.email
      await this.patientAuthRepository.save(auth)
    }

    await this.userRepository.updateProperties(patient.firebaseKey, {email: data.email})
  }

  async connectOrganization(patientId: number, firebaseOrganizationId: string): Promise<void> {
    const patient = await this.getProfilebyId(patientId)
    if (!patient) {
      throw new NotFoundException('User with given id not found')
    }

    const organization = await this.organizationModel.findOneById(firebaseOrganizationId)
    if (!organization) {
      throw new NotFoundException('Organization with given id not found')
    }
    await this.connectOrganizationWithInstances(patient, organization)
  }

  private async connectOrganizationWithInstances(
    patient: Patient,
    organization: Organization,
  ): Promise<void> {
    await this.patientToOrganizationRepository.save({
      patientId: patient.idPatient,
      firebaseOrganizationId: organization.id,
    })

    const firebaseUser = await this.userRepository.findOneById(patient.firebaseKey)
    if (!firebaseUser) {
      throw new NotFoundException('User with given id not found')
    }

    await this.userRepository.updateProperty(
      firebaseUser.id,
      'organizationIds',
      _.uniq([...(firebaseUser.organizationIds ?? []), organization.id]),
    )
  }

  async createPatient(
    data: PatientCreateDto | DependantCreateDto | PatientCreateAdminDto,
    tokenSource: OpnSources,
  ): Promise<Patient> {
    const entity = new Patient()
    entity.firebaseKey = data.firebaseKey
    entity.firstName = data.firstName
    entity.lastName = data.lastName
    entity.gender = data.gender
    entity.phoneNumber = data.phoneNumber
    entity.dateOfBirth = data.dateOfBirth
    entity.photoUrl = data.photoUrl
    entity.registrationId = await this.getRegistrationId(data, tokenSource)
    entity.consentFileUrl = data.consentFileUrl
    entity.isEmailVerified = data.isEmailVerified || false

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
    tokenSource: OpnSources,
  ): Promise<Patient> {
    const delegate = await this.getbyId(delegateId)

    const authUserSync = {
      firstName: data.firstName,
      lastName: data.lastName,
      registrationId: await this.getRegistrationId(data, tokenSource),
      photo: data.photoUrl ?? null,
      phone: {
        diallingCode: 0,
        number: Number(data.phoneNumber ?? 0),
      },
      active: false,
      organizationIds: [this.configService.get('PUBLIC_ORG_ID')],
      creator: UserCreator.syncFromSQL,
      delegates: [delegate.firebaseKey],
    } as AuthUser

    const firebaseUser = await this.createAuthUserInFirestore(authUserSync)

    await this.addInPublicGroup(firebaseUser.id, delegate.firebaseKey)

    data.firebaseKey = firebaseUser.id

    if (data.organizationId) {
      firebaseUser.organizationIds.push(data.organizationId)
    }

    const dependant = await this.createPatient(data, tokenSource)
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

  async addInPublicGroup(firebaseKey: string, parentUserId?: string): Promise<void> {
    try {
      await this.organizationService.addUserToGroup(
        this.configService.get('PUBLIC_ORG_ID'),
        this.configService.get('PUBLIC_GROUP_ID'),
        firebaseKey,
        parentUserId,
      )
    } catch (e) {
      const errorMessage = e.message
      LogError(
        activityLogs.PatientServiceFunctions.createHomePatientProfile,
        activityLogs.PatientServiceEvents.errorAddingUserToOrg,
        {
          errorMessage,
        },
      )
    }
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
      patientQuery.orWhere('auth.email = :email AND status = :status', {
        email,
        status: UserStatus.NEW,
      })
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

  async attachOrganization(organizationCode: string, authUserId: string): Promise<string> {
    const organization = await this.organizationService.findOrganizationByKey(
      parseInt(organizationCode),
    )

    const currentPatient = await this.patientRepository.findOne({
      where: {
        firebaseKey: authUserId,
      },
    })

    await this.connectOrganizationWithInstances(currentPatient, organization)
    return organization.name
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
  async upsertPushToken(patientId: number, registration: Omit<Registration, 'id'>): Promise<void> {
    const {pushToken, osVersion, platform, tokenSource} = registration

    // validate if we get token
    if (pushToken) {
      await this.messaging.validatePushToken(pushToken)
    }
    const patient = await this.patientRepository.findOne(patientId)
    // create or update token
    const {id} = await this.registrationService.upsert(patient.firebaseKey, {
      osVersion,
      platform,
      pushToken,
      tokenSource,
    })

    await this.patientRepository.update({idPatient: patientId}, {registrationId: id})
  }

  async updateProfileWithPubSub(data: AppointmentDBModel, tokenSource: OpnSources): Promise<void> {
    // fallback to userId if appointment is from web
    const userId = data?.patientId ?? data?.userId

    if (!userId) {
      const errorMessage = `User/Patient id is missing`
      LogError(
        activityLogs.PubSubFunctions.updateProfileWithPubSub,
        activityLogs.PubSubEvents.profileUpdateFailed,
        {
          errorMessage,
        },
      )
      throw new BadRequestException(errorMessage)
    }

    const patient = await this.patientRepository.findOne({
      where: [{idPatient: userId}, {firebaseKey: userId}],
    })

    if (!patient) {
      const errorMessage = `Profile with ${userId} not exists`
      LogError(
        activityLogs.PubSubFunctions.updateProfileWithPubSub,
        activityLogs.PubSubEvents.profileUpdateFailed,
        {
          errorMessage,
        },
      )
      throw new BadRequestException(errorMessage)
    }

    const updateDto = new PatientUpdateDto()
    updateDto.gender = data?.gender
    updateDto.phoneNumber = data?.phone
    updateDto.dateOfBirth = data?.dateOfBirth
    updateDto.healthCardType = data?.ohipCard
    updateDto.travelPassport = data?.travelID
    updateDto.travelCountry = data?.travelIDIssuingCountry
    updateDto.homeAddress = data?.address
    updateDto.homeAddressUnit = data?.addressUnit
    updateDto.postalCode = data?.postalCode
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

    await this.updateProfile(patient.idPatient, updateDto, tokenSource)
  }

  async getRegistrationId(userData: PatientUpdateDto, tokenSource: OpnSources): Promise<string> {
    let registrationDb: Registration

    if (
      userData?.registration?.pushToken ||
      userData?.registration?.osVersion ||
      userData?.registration?.platform
    ) {
      registrationDb = await this.registrationService.upsert(userData.firebaseKey, {
        platform: userData?.registration?.platform as Platforms,
        osVersion: userData?.registration?.osVersion,
        pushToken: userData?.registration?.pushToken,
        tokenSource,
      })
    }

    return registrationDb?.id || null
  }

  private logUserSyncFailure(error: Error) {
    LogError(
      activityLogs.PatientServiceFunctions.logUserSyncFailure,
      activityLogs.PatientServiceEvents.syncV2ToV1Failed,
      {
        errorMessage: `User v2 to v1 sync failed: ${error}`,
      },
    )
  }
}
