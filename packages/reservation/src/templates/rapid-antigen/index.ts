import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import { LogInfo } from '../../../../common/src/utils/logging-setup'

//Models
import {
  RapidAlergenResultPDFType,
  RapidAntigenEmailResultDTO,
} from '../../models/rapid-antigen-test-results'

import positivePCRResultTemplate from './positive'
import negativePCRResultTemplate from './negative'

export const RapidAntigenPDFContent = async (
  resultData: RapidAntigenEmailResultDTO,
  pdfType: RapidAlergenResultPDFType,
): Promise<string> => {
  const pdfService = new PdfService()
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')
  let data: {content: Content; tableLayouts: TableLayouts}
  switch (pdfType) {
    case RapidAlergenResultPDFType.Positive: {
      data = positivePCRResultTemplate(resultData, resultDate)
      break
    }
    case RapidAlergenResultPDFType.Negative: {
      data = negativePCRResultTemplate(resultData, resultDate)
      break
    }
    default: {
      LogInfo('RapidAntigenPDFContent','InavldiRapidAlergenResultPDFType',{
        pdfType
      })
    }
  }
  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}
