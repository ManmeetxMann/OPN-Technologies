import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import commonPDFContent from './common-report-content'
import path from 'path'
import {QrService} from '../../../../common/src/service/qr/qr-service'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'

const pdfContent = (
  params: RapidAntigenEmailResultDTO,
  resultDate: string,
  qr: string,
): {content: Content[]; background: Content; tableLayouts: TableLayouts} => {
  return {
    tableLayouts: commonPDFContent.tableLayouts,
    background: [
      {
        image: path.join(__dirname, '../../static/images/FH_Forge_Overlay@3x.png'),
        width: 1224,
        height: 1816,
      },
    ],
    content: [
      commonPDFContent.doctorSignature(),
      commonPDFContent.companyInfoHeader(params),
      commonPDFContent.clientInformation(params, resultDate),
      commonPDFContent.importantInfo(params),
      commonPDFContent.legalNotice(),
      commonPDFContent.placeQRCode(QrService.getQrDataForPDFReport(qr, 200, 200)),
    ],
  }
}

export default pdfContent
