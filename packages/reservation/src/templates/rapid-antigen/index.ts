import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import {LogInfo} from '../../../../common/src/utils/logging-setup'

//Models
import {
  RapidAntigenResultPDFType,
  RapidAntigenEmailResultDTO,
} from '../../models/rapid-antigen-test-results'

import positivePCRResultTemplate from './positive'
import negativePCRResultTemplate from './negative'

export const RapidAntigenPDFContent = async (
  resultData: RapidAntigenEmailResultDTO,
  pdfType: RapidAntigenResultPDFType,
): Promise<string> => {
  const pdfService = new PdfService()
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')
  let data: {content: Content; tableLayouts: TableLayouts}
  switch (pdfType) {
    case RapidAntigenResultPDFType.Positive: {
      data = positivePCRResultTemplate(resultData, resultDate)
      break
    }
    case RapidAntigenResultPDFType.Negative: {
      data = negativePCRResultTemplate(resultData, resultDate)
      break
    }
    default: {
      LogInfo('RapidAntigenPDFContent', 'InavldiRapidAntigenResultPDFType', {
        pdfType,
      })
      return
    }
  }
  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}
