import moment from 'moment'
import DataStore from '../../../common/src/data/datastore'

import {TestResultsDTOForEmail, TestResultsDBModel} from '../models/appoinment'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfExportService} from './pdf-export.service'
import {Config} from '../../../common/src/utils/config'

export class TestResultsService {
  private testResultEmailTemplateId = (Config.get('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 1) as number
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())
  private emailService = new EmailService()
  private pdfExportService = new PdfExportService()

  async sendTestResults(testResults: TestResultsDTOForEmail): Promise<void> {
    const pdfContent = await this.pdfExportService.generateTestResultPdf(testResults)

    this.emailService.send({
      templateId: this.testResultEmailTemplateId,
      to: [{email: testResults.email, name: `${testResults.firstName} ${testResults.lastName}`}],
      params: {},
      attachment: [
        {
          content: pdfContent,
          name: `PHHealth_${moment().format('YYYYMMDDHHmmss')}.pdf`,
        },
      ],
    })
  }

  async saveResults(testResults: TestResultsDBModel): Promise<void> {
    this.testResultsDBRepository.save(testResults)
  }

  async resultAlreadySent(barCode: string): Promise<boolean> {
    const testResultExists = this.testResultsDBRepository.get(barCode).then((testResults) => {
      return !!testResults
    })
    return testResultExists
  }

  async getResults(barCode: string): Promise<TestResultsDBModel> {
    return this.testResultsDBRepository.get(barCode)
  }
}
