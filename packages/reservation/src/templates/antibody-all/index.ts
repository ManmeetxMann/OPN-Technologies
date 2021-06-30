import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {LogInfo} from '../../../../common/src/utils/logging-setup'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import positiveTemplate from './positive'
import negativeTemplate from './negative'
import intermediateTemplate from './intermediate'
import {PCRResultPDFType, PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {Stream} from 'stream'

export const AntibodyAllPDFContent = async (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): Promise<string> => {
  const pdfService = new PdfService()
  const data = getAntibodyAllTemplate(resultData, pdfType, qr)

  if (!data) {
    return
  }

  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}

export const AntibodyAllPDFStream = (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): Stream => {
  const pdfService = new PdfService()
  const data = getAntibodyAllTemplate(resultData, pdfType, qr)

  if (!data) {
    throw new BadRequestException(`Not supported result ${pdfType}`)
  }

  return pdfService.generatePDFStream(data.content, data.tableLayouts)
}

const getAntibodyAllTemplate = (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
  qr: string,
): {content: Content; tableLayouts: TableLayouts} => {
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')

  switch (pdfType) {
    case PCRResultPDFType.Positive: {
      return positiveTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.Negative: {
      return negativeTemplate(resultData, resultDate, qr)
    }
    case PCRResultPDFType.Intermediate: {
      return intermediateTemplate(resultData, resultDate, qr)
    }
    default: {
      LogInfo('getAntibodyAllTemplate', 'InavalidAntibodyAllResultPDFType', {
        pdfType,
      })
      return
    }
  }
}
