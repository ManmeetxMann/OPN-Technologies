import DataStore from '../../../common/src/data/datastore'
import {FaxService} from '../../../common/src/service/messaging/fax-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import { TestTypes } from '../models/appointment'
import { PCRResultPDFType } from '../models/pcr-test-results'
// import template from '../templates/testResult'
//repository
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'
import {PCRResultPDFContent} from '../templates/pcr-test-results'
import { RapidAntigenPDFContent } from '../templates/rapid-antigen'
import { RapidAntigenTestResultsService } from './rapid-antigen-test-results.service'

export class TestResultsService {
  private datastore = new DataStore()
  private rapidAntigenTestResultsService = new RapidAntigenTestResultsService()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentsRepository = new AppointmentsRepository(this.datastore)

  private pdfService = new PdfService()

  // async sendFax(testResults: TestResultsDTOForEmail, faxNumber: string): Promise<string> {
  //   const resultDateRaw = testResults.resultDate
  //   const date = new Date()
  //   const resultDate = moment(resultDateRaw).format('LL')
  //   const name = `${testResults.barCode} - ${date}`

  //   const {content, tableLayouts} = template(testResults, resultDate)
  //   const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

  //   return this.faxService.send(faxNumber, name, pdfContent)
  // }


  async getTestResultPDF(id: string) {
    const testResult = await this.pcrTestResultsRepository.findOneById(id)
    const appointment = await this.appointmentsRepository.findOneById(testResult.appointmentId)

    switch (testResult.testType) {
      case TestTypes.PCR:
        return PCRResultPDFContent({...testResult, ...appointment}, PCRResultPDFType.)
      
      case TestTypes.RapidAntigen:
        return RapidAntigenPDFContent(
          {...testResult, ...appointment},
          this.rapidAntigenTestResultsService.getPDFType(
            appointment.id,
            testResult.result
          )   
        )

      default:
        break;
    }

  }
}
