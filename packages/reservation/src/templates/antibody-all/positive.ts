import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import commonPDFContent from './common-report-content'
import path from 'path'
import {QrService} from '../../../../common/src/service/qr/qr-service'

const pdfContent = (
  params: PCRTestResultEmailDTO,
  resultDate: string,
  qr: string,
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
      commonPDFContent.doctorSignature(),
      commonPDFContent.companyInfoHeader(params),
      commonPDFContent.clientInformation(params, resultDate),
      commonPDFContent.testAnalysisTable(params),
      commonPDFContent.importantInfo(),
      commonPDFContent.legalNotice(),
      commonPDFContent.doctorSignature(),
      commonPDFContent.placeQRCode(QrService.getQrDataForPDFReport(qr, 200, 200)),
    ],
  }
}

export default pdfContent
