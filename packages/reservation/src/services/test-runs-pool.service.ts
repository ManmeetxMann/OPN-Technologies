import DataStore from '../../../common/src/data/datastore'
import {TestRunsPoolRepository} from '../respository/test-runs-pool.repository'
import {TestRunsPool, TestRunsPoolCreate, TestRunsPoolUpdate} from '../models/test-runs-pool'
import {cleanUndefinedKeys} from '../../../common/src/utils/utils'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {AppointmentStatus} from '../models/appointment-enums'
import {PCRTestResultsService} from './pcr-test-results.service'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {AppoinmentService} from './appoinment.service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

export class TestRunsPoolService {
  private dataStore = new DataStore()
  private pcrTestResultsService = new PCRTestResultsService()
  private appointmentService = new AppoinmentService()
  private testRunPoolRepository = new TestRunsPoolRepository(this.dataStore)
  private identifier = new IdentifiersModel(new DataStore())

  async create(testRunPool: TestRunsPoolCreate): Promise<TestRunsPool> {
    testRunPool.poolBarCode = await this.getNextPoolBarcode()
    return this.testRunPoolRepository.save(testRunPool)
  }

  async update(id: string, data: TestRunsPoolUpdate): Promise<TestRunsPool> {
    const cleanData = cleanUndefinedKeys(data) as TestRunsPoolUpdate

    return this.testRunPoolRepository.updateProperties(id, cleanData as TestRunsPoolUpdate)
  }

  getById(id: string): Promise<TestRunsPool> {
    return this.testRunPoolRepository.findOneById(id)
  }

  async addTestResultInPool(id: string, testResultId: string): Promise<TestRunsPool> {
    const testResult = await this.pcrTestResultsService.getPCRResultsById(id)

    if (!testResult) {
      throw new ResourceNotFoundException('Test result with given id not found')
    }

    const allowedStatusToBeMarkedAsInProgress = [
      AppointmentStatus.Received,
      AppointmentStatus.ReRunRequired,
      AppointmentStatus.InProgress,
    ]

    const appointment = await this.appointmentService.getAppointmentDBById(testResult.appointmentId)

    if (!allowedStatusToBeMarkedAsInProgress.includes(appointment.appointmentStatus)) {
      throw new BadRequestException(
        `Don't allowed to add testRunId if appointment status is not ${AppointmentStatus.Received} or ${AppointmentStatus.ReRunRequired} or ${AppointmentStatus.InProgress}`,
      )
    }

    const {testResultIds} = await this.getById(id)
    return this.update(id, {testResultIds: [...testResultIds, testResultId]})
  }

  async getNextPoolBarcode(): Promise<string> {
    const poolBarCodeNumber = await this.identifier.getUniqueId('testRunsPool')
    const newBarCode = 1000000000
    return `P${newBarCode + Number(poolBarCodeNumber)}`
  }
}
