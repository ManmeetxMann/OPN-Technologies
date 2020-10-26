import moment from 'moment'
import DataStore from '../../../common/src/data/datastore'

import {TestResultsDTOForEmail, TestResultsDBModel} from '../models/appoinment'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import template from '../../templates/testResult'

import {Config} from '../../../common/src/utils/config'

export class TestResultsService {
  private testResultEmailTemplateId = (Config.get('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 2) as number
  private testResultBccEmail = Config.get('TEST_RESULT_BCC_EMAIL')
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())
  private emailService = new EmailService()
  private pdfService = new PdfService()

  async sendTestResults(testResults: TestResultsDTOForEmail): Promise<void> {
    const todaysDate = moment().utcOffset('-0400').format('LL')
    // @ts-ignore
    const {content, tableLayouts} = template({...testResults, createTime: todaysDate})
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    this.emailService.send({
      templateId: this.testResultEmailTemplateId,
      to: [{email: testResults.email, name: `${testResults.firstName} ${testResults.lastName}`}],
      params: {
        BARCODE: testResults.barCode,
        DATE_OF_RESULT: todaysDate,
      },
      attachment: [
        {
          content: pdfContent,
          name: `FHHealth.ca Result - ${testResults.barCode} - ${todaysDate}.pdf`,
        },
      ],
      bcc: [
        {
          email: this.testResultBccEmail,
        },
      ],
    })
  }

  async saveResults(testResults: TestResultsDBModel): Promise<void> {
    this.testResultsDBRepository.save(testResults)
  }

  async resultAlreadySent(barCode: string): Promise<boolean> {
    return this.testResultsDBRepository.get(barCode).then((testResults) => !!testResults)
  }

  async getResults(barCode: string): Promise<TestResultsDBModel> {
    return this.testResultsDBRepository.get(barCode)
  }
}
