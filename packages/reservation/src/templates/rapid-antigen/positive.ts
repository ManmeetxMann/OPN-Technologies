import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import commonPDFContent from './common-report-content'
import path from 'path'

const pdfContent = (
  params: PCRTestResultEmailDTO,
  resultDate: string,
): {content: Content[]; background: Content; tableLayouts: TableLayouts} => {
  return {
    tableLayouts: commonPDFContent.tableLayouts,
    background: [
      {
        image: path.join(__dirname, '../Assets/Overlay/FH_Forge_Overlay@3x.png'),
        width: 1224,
        height: 1816,
      },
    ],
    content: [
      commonPDFContent.companyInfoHeader(params),
      commonPDFContent.clientInformation(params, resultDate),
      commonPDFContent.importantInfo(),
      commonPDFContent.legalNotice(),
    ],
  }
}

export default pdfContent
