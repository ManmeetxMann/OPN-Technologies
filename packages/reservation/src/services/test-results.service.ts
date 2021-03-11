import {Stream} from 'stream'

import {AppointmentDBModel, TestTypes} from '../models/appointment'
import {PCRTestResultDBModel} from '../models/pcr-test-results'
// services
import {PCRTestResultsService} from './pcr-test-results.service'
import {RapidAntigenTestResultsService} from './rapid-antigen-test-results.service'
// templates
import {PCRResultPDFStream} from '../templates/pcr-test-results'
import {RapidAntigenPDFStream} from '../templates/rapid-antigen'

export class TestResultsService {
  private pcrTestResultsService = new PCRTestResultsService()
  private rapidAntigenTestResultsService = new RapidAntigenTestResultsService()

  // async sendFax(testResults: TestResultsDTOForEmail, faxNumber: string): Promise<string> {
  //   const resultDateRaw = testResults.resultDate
  //   const date = new Date()
  //   const resultDate = moment(resultDateRaw).format('LL')
  //   const name = `${testResults.barCode} - ${date}`

  //   const {content, tableLayouts} = template(testResults, resultDate)
  //   const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

  //   return this.faxService.send(faxNumber, name, pdfContent)
  // }

  async getTestResultPDF(
    testResult: PCRTestResultDBModel,
    appointment: AppointmentDBModel,
  ): Promise<Stream> {
    switch (testResult.testType) {
      case TestTypes.PCR:
        return PCRResultPDFStream(
          {...testResult, ...appointment},
          this.pcrTestResultsService.getPDFType(appointment.id, testResult.result),
        )

      case TestTypes.RapidAntigen:
        return RapidAntigenPDFStream(
          {...testResult, ...appointment},
          this.rapidAntigenTestResultsService.getPDFType(appointment.id, testResult.result),
        )
    }
  }
}
