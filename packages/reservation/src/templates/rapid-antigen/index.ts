import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import {PCRResultPDFType, PCRTestResultEmailDTO} from '../../models/pcr-test-results'

import positivePCRResultTemplate from './positive'
import negativePCRResultTemplate from './negative'

export const RapidAntigenPDFContent = async (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
): Promise<string> => {
  const pdfService = new PdfService()
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')
  let data: {content: Content; tableLayouts: TableLayouts}
  switch (pdfType) {
    case PCRResultPDFType.Positive: {
      data = positivePCRResultTemplate(resultData, resultDate)
      break
    }
    case PCRResultPDFType.Negative: {
      data = negativePCRResultTemplate(resultData, resultDate)
      break
    }
  }
  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}
