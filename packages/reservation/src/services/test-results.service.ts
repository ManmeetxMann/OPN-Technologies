import moment from 'moment-timezone'

import {FaxService} from '../../../common/src/service/messaging/fax-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import template from '../templates/testResult'
import {TestResultsDTOForEmail} from '../models/test-result'

export class TestResultsService {
  private pdfService = new PdfService()
  private faxService = new FaxService()

  async sendFax(testResults: TestResultsDTOForEmail, faxNumber: string): Promise<string> {
    const resultDateRaw = testResults.resultDate
    const date = new Date()
    const resultDate = moment(resultDateRaw).format('LL')
    const name = `${testResults.barCode} - ${date}`

    const {content, tableLayouts} = template(testResults, resultDate)
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    return this.faxService.send(faxNumber, name, pdfContent)
  }
}
