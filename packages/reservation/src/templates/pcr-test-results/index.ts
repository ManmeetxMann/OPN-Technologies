import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import {PCRResultPDFType, PCRTestResultEmailDTO} from '../../models/pcr-test-results'

import confirmedNegativePCRResultsTemplate from './confirmed-negative-pcr-test-results'
import confirmedPositivePCRResultsTemplate from './confirmed-positive-pcr-test-results'
import positivePCRResultTemplate from './positive-pcr-test-results'
import negativePCRResultTemplate from './negative-pcr-test-results'
import presumptivePositivePCRResultTemplate from './presumptive-positive-pcr-test-results'
import {Stream} from 'stream'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {LogInfo} from '../../../../common/src/utils/logging-setup'

const getPCRTemplate = (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): {content: Content; tableLayouts: TableLayouts} => {
  const resultDateRaw =
    resultData.resultMetaData && resultData.resultMetaData.resultDate
      ? resultData.resultMetaData.resultDate
      : new Date()
  //const resultDate = moment(resultData.resultMetaData.resultDate).format('LL')
  const resultDate = moment(resultDateRaw).format('LL')

  switch (pdfType) {
    case PCRResultPDFType.ConfirmedNegative: {
      return confirmedNegativePCRResultsTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.ConfirmedPositive: {
      return confirmedPositivePCRResultsTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.Positive: {
      return positivePCRResultTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.Negative: {
      return negativePCRResultTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.PresumptivePositive: {
      return presumptivePositivePCRResultTemplate(resultData, resultDate, qr)
    }
    default: {
      LogInfo('getPCRTemplate', 'InavldiPCRResultPDFType', {
        pdfType,
      })
      return
    }
  }
}

export const PCRResultPDFContent = async (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): Promise<string> => {
  const pdfService = new PdfService()
  const data = getPCRTemplate(resultData, pdfType, qr)

  if (!data) {
    return
  }

  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}

export const PCRResultPDFStream = (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): Stream => {
  const pdfService = new PdfService()
  const data = getPCRTemplate(resultData, pdfType, qr)

  if (!data) {
    throw new BadRequestException(`Not supported result ${pdfType}`)
  }

  return pdfService.generatePDFStream(data.content, data.tableLayouts)
}
