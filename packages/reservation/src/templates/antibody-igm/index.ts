import moment from 'moment'
import {Content, TableLayouts} from '../../../../common/src/service/reports/pdf-types'
import {LogInfo} from '../../../../common/src/utils/logging-setup'
import {PdfService} from '../../../../common/src/service/reports/pdf'
import positiveTemplate from './positive'
import negativeTemplate from './negative'
import intermediateTemplate from './intermediate'
import {PCRResultPDFType, PCRTestResultEmailDTO} from '../../models/pcr-test-results'

export const AntibodyIgmPDFContent = async (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
): Promise<string> => {
  const pdfService = new PdfService()
  const data = getAntibodyIgmTemplate(resultData, pdfType)

  if (!data) {
    return
  }

  return await pdfService.generatePDFBase64(data.content, data.tableLayouts)
}

const getAntibodyIgmTemplate = (
  resultData: PCRTestResultEmailDTO,
  pdfType: PCRResultPDFType,
): {content: Content; tableLayouts: TableLayouts} => {
  const resultDate = moment(resultData.dateTime.toDate()).format('LL')

  switch (pdfType) {
    case PCRResultPDFType.Positive: {
      return positiveTemplate(resultData, resultDate)
    }
    case PCRResultPDFType.Negative: {
      return negativeTemplate(resultData, resultDate)
    }
    case PCRResultPDFType.Intermediate: {
      return intermediateTemplate(resultData, resultDate)
    }
    default: {
      LogInfo('getAntibodyIgmTemplate', 'InavalidAntibodyIgmResultPDFType', {
        pdfType,
      })
      return
    }
  }
}
