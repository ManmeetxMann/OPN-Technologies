import DataStore from '@opn-common-v1/data/datastore'
import {TestResultCreateDto} from '../../dto/test-result'
import {PCRTestResultsRepository} from '../../repository/test-result.repository'
import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {PatientRepository} from '../../repository/patient.repository'
import {PatientUpdateDto} from '../../dto/patient'
import {Injectable} from '@nestjs/common'
import {JoiValidator} from '@opn-services/common/utils/joi-validator'
import {pcrTestResultSchema} from '@opn-services/common/schemas'
import {TestTypes} from '@opn-reservation-v1/models/appointment'
import {firestore} from 'firebase-admin'

@Injectable()
export class TestResultService {
  constructor(private patientRepository: PatientRepository) {}
  private dataStore = new DataStore()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private userRepository = new UserRepository(this.dataStore)

  async createPCRResults(data: TestResultCreateDto, userId: string): Promise<TestResultCreateDto> {
    const pcrTestResultTypesValidator = new JoiValidator(pcrTestResultSchema)
    const pcrTestResultTypes = await pcrTestResultTypesValidator.validate({
      testType: TestTypes.RapidAntigenAtHome,
      userId,
      displayInResult: true,
      dateTime: firestore.Timestamp.fromDate(new Date()),
      ...data,
    })

    return this.pcrTestResultsRepository.add(pcrTestResultTypes)
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

  validateUserData(data: PatientUpdateDto): PatientUpdateDto {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      postalCode: data.postalCode,
    }
  }
}
