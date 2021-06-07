import DataStore from '@opn-common-v1/data/datastore'
import {TestResultCreateDto} from '../../dto/test-result'
import {PCRTestResultsRepository} from '../../repository/test-result.repository'
import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {
  PatientRepository,
  PatientToOrganizationRepository,
} from '../../repository/patient.repository'
import {PatientUpdateDto} from '../../dto/patient'
import {Injectable} from '@nestjs/common'
import {JoiValidator} from '@opn-services/common/utils/joi-validator'
import {pcrTestResultSchema} from '@opn-services/common/schemas'
import {TestTypes} from '@opn-reservation-v1/models/appointment'
import {TestTypes as TestResultTestTypes} from '@opn-services/user/dto/test-result'
import {BadRequestException} from '@opn-services/common/exception'
import {firestore} from 'firebase-admin'

@Injectable()
export class TestResultService {
  constructor(
    private patientRepository: PatientRepository,
    private patientToOrganizationRepository: PatientToOrganizationRepository,
  ) {}
  private dataStore = new DataStore()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private userRepository = new UserRepository(this.dataStore)

  findPCRResultById(id: string): Promise<TestResultCreateDto> {
    return this.pcrTestResultsRepository.findOneById(id)
  }

  async addCouponCodePCRResultById(
    id: string,
    generatedCouponCode: string,
  ): Promise<TestResultCreateDto> {
    return await this.pcrTestResultsRepository.updateProperties(id, {generatedCouponCode})
  }

  async createPCRResults(data: TestResultCreateDto, userId: string): Promise<TestResultCreateDto> {
    const pcrTestResultTypesValidator = new JoiValidator(pcrTestResultSchema)
    const isRunByJest = process.env.JEST_WORKER_ID
    const pcrTestResultTypes = await pcrTestResultTypesValidator.validate({
      testType: TestTypes.RapidAntigenAtHome,
      userId,
      displayInResult: true,
      dateTime: isRunByJest ? new Date() : firestore.Timestamp.fromDate(new Date()),
      ...data,
    })

    return this.pcrTestResultsRepository.add(pcrTestResultTypes)
  }

  async validateOrganization(
    firebaseOrganizationId: string,
    firebaseKey: string,
  ): Promise<boolean> {
    const patient = await this.patientRepository.findOne({firebaseKey})
    if (!patient) {
      return false
    }

    const patientToOrg = await this.patientToOrganizationRepository.findOne({
      patientId: patient.idPatient,
      firebaseOrganizationId,
    })
    return !!patientToOrg
  }

  async syncUser(data: PatientUpdateDto, id: string): Promise<void> {
    const firebaseUser = await this.userRepository.findOneById(id)

    if (firebaseUser) {
      const firebaseUserData = {...firebaseUser, ...data}
      await this.userRepository.updateProperties(firebaseUser.id, firebaseUserData)
    }

    const patientExists = await this.patientRepository.findOne({firebaseKey: id})
    if (patientExists) {
      const patientData = {...patientExists, ...data}
      await this.patientRepository.save(patientData)
    }
  }

  validateUserData(data: Omit<PatientUpdateDto, 'id'>): PatientUpdateDto {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth || null,
      postalCode: data.postalCode || null,
    }
  }

  validatePayload(testResult: TestResultCreateDto): void {
    // Only test result positive needs postalCode and dateOfBirth fields
    if (
      testResult.result === TestResultTestTypes.Positive &&
      !testResult.postalCode &&
      !testResult.dateOfBirth
    ) {
      throw new BadRequestException('postalCode and dateOfBirth are required for result Positive')
    }
  }
}
