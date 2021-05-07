import DataStore from '@opn-common-v1/data/datastore'
import {TestResultCreateDto} from '../../dto/test-result'
import {PCRTestResultsRepository} from '../../repository/test-result.repository'
import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {PatientRepository} from '../../repository/patient.repository'
import {PatientUpdateDto} from '../../dto/patient'
import {Injectable} from '@nestjs/common'

@Injectable()
export class TestResultService {
  constructor(private patientRepository: PatientRepository) {}
  private dataStore = new DataStore()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private userRepository = new UserRepository(this.dataStore)

  async createPCRResults(data: TestResultCreateDto): Promise<TestResultCreateDto> {
    return this.pcrTestResultsRepository.add(data)
  }

  async syncUser(data: PatientUpdateDto, idPatient: string): Promise<void> {
    const patientExists = await this.patientRepository.findOne(idPatient)
    if (patientExists) {
      const patientData = {...patientExists, ...data}
      await this.patientRepository.save(patientData)
    }
    const firebaseUser = await this.userRepository.findOneById(patientExists.firebaseKey)
    if (firebaseUser) {
      const firebaseUserData = {...firebaseUser, ...data}
      await this.userRepository.updateProperties(firebaseUser.id, firebaseUserData)
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
