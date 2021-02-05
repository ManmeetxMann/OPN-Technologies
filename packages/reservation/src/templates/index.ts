import moment from "moment"
import { Content, TableLayouts } from "../../../common/src/service/reports/pdf-types"
import {PdfService} from '../../../common/src/service/reports/pdf'
import { PCRResultPDFType, PCRTestResultEmailDTO } from "../models/pcr-test-results"

import confirmedNegativePCRResultsTemplate from './confirmed-negative-pcr-test-results'
import confirmedPositivePCRResultsTemplate from './confirmed-positive-pcr-test-results'
import positivePCRResultTemplate from './positive-pcr-test-results'
import negativePCRResultTemplate from './negative-pcr-test-results'
import presumptivePositivePCRResultTemplate from './presumptive-positive-pcr-test-results'

export const PCRResultPDFContent = async (resultData: PCRTestResultEmailDTO, pdfType: PCRResultPDFType): Promise<string> => {
  const pdfService = new PdfService()
    const resultDate = moment(resultData.dateTime.toDate()).format('LL')
    let data:{content: Content, tableLayouts: TableLayouts}
    switch (pdfType) {
      case PCRResultPDFType.ConfirmedNegative: {
        data = confirmedNegativePCRResultsTemplate(resultData, resultDate)
        break
      }
      case PCRResultPDFType.ConfirmedPositive: {
        data = confirmedPositivePCRResultsTemplate(resultData, resultDate)
        break
      }
      case PCRResultPDFType.Positive: {
        data = positivePCRResultTemplate(resultData, resultDate)
        break
      }
      case PCRResultPDFType.Negative: {
        data = negativePCRResultTemplate(resultData, resultDate)
        break
      }
      case PCRResultPDFType.PresumptivePositive: {
        data = presumptivePositivePCRResultTemplate(resultData, resultDate)
        break
      }
    }
    return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}