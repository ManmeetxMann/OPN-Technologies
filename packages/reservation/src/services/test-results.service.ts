import moment from 'moment-timezone'
import DataStore from '../../../common/src/data/datastore'

import {TestResultsDTOForEmail, TestResultsDBModel} from '../models/appoinment'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {FaxService} from '../../../common/src/service/messaging/fax-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import template from '../templates/testResult'

import {Config} from '../../../common/src/utils/config'

export class TestResultsService {
  private testResultEmailTemplateId = (Config.get('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 2) as number
  private testResultBccEmail = Config.get('TEST_RESULT_BCC_EMAIL')
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())
  private emailService = new EmailService()
  private pdfService = new PdfService()
  private faxService = new FaxService()

  async sendTestResults(
    testResults: TestResultsDTOForEmail,
    dateFromRequest: Date = null,
  ): Promise<void> {
    const resultDateRaw = dateFromRequest
    const resultDate = moment(resultDateRaw).format('LL')

    const {content, tableLayouts} = template(testResults, resultDate)
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    this.emailService.send({
      templateId: this.testResultEmailTemplateId,
      to: [{email: testResults.email, name: `${testResults.firstName} ${testResults.lastName}`}],
      params: {
        BARCODE: testResults.barCode,
        DATE_OF_RESULT: resultDate,
      },
      attachment: [
        {
          content: pdfContent,
          name: `FHHealth.ca Result - ${testResults.barCode} - ${resultDate}.pdf`,
        },
      ],
      bcc: [
        {
          email: this.testResultBccEmail,
        },
      ],
    })
  }

  async sendFax(testResults: TestResultsDTOForEmail, faxNumber: string): Promise<any> {
    const resultDateRaw = testResults.resultDate
    const resultDate = moment(resultDateRaw).format('LL')
    const name = `${testResults.barCode} - ${new Date()}`

    const {content, tableLayouts} = template(testResults, resultDate)
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    return this.faxService.send(faxNumber, name, pdfContent)
  }

  async saveResults(testResults: TestResultsDBModel): Promise<void> {
    this.testResultsDBRepository.save(testResults)
  }

  async resultAlreadySentMany(barCode: string[]): Promise<string[]> {
    return (await this.testResultsDBRepository.findWhereIdIn(barCode)).map((test) => test.id)
  }

  async resultAlreadySent(barCode: string): Promise<boolean> {
    return this.testResultsDBRepository.get(barCode).then((testResults) => !!testResults)
  }

  async getResults(barCode: string): Promise<TestResultsDBModel> {
    return this.testResultsDBRepository.get(barCode)
  }
}
