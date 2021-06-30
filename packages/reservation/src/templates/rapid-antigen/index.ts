import moment from 'moment'
import {Stream} from 'stream'
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

import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

const pageSize = {
  height: 1816,
  width: 1224,
}

const pageMargin = 0

const getRapidAntigenTemplate = (
  resultData: RapidAntigenEmailResultDTO,
  pdfType: RapidAntigenResultPDFType,
): {content: Content; background: Content; tableLayouts: TableLayouts} => {
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')

  switch (pdfType) {
    case RapidAntigenResultPDFType.Positive: {
      return positivePCRResultTemplate(resultData, resultDate)
    }
    case RapidAntigenResultPDFType.Negative: {
      return negativePCRResultTemplate(resultData, resultDate)
    }
    default: {
      LogInfo('getRapidAntigenTemplate', 'InavldiRapidAntigenResultPDFType', {
        pdfType,
      })
      return
    }
  }
}

export const RapidAntigenPDFContent = async (
  resultData: RapidAntigenEmailResultDTO,
  pdfType: RapidAntigenResultPDFType,
): Promise<string> => {
  const pdfService = new PdfService()

  const data = getRapidAntigenTemplate(resultData, pdfType)

  if (!data) {
    return
  }

  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}

export const RapidAntigenPDFStream = (
  resultData: RapidAntigenEmailResultDTO,
  pdfType: RapidAntigenResultPDFType,
): Stream => {
  const pdfService = new PdfService()
  const data = getRapidAntigenTemplate(resultData, pdfType)

  if (!data) {
    throw new BadRequestException(`Not supported result ${pdfType}`)
  }

  return pdfService.generatePDFStream(
    data.content,
    data.tableLayouts,
    undefined,
    pageSize,
    pageMargin,
    data.background,
  )
}
