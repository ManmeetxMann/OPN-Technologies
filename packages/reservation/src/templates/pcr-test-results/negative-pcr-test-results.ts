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
      commonPDFContent.companyInfoHeader(params),
      commonPDFContent.clientInformation(params, resultDate),
      commonPDFContent.testAnalysisTable(params),
      commonPDFContent.importantInfo(),
      commonPDFContent.legalNotice(),
      QrService.getQrDataForPDFReport(qr, 200, 200),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    'The result of your test was ',
    {
      text: `NEGATIVE.`,
      bold: true,
      font: 'PTSerif',
    },
    {
      text:
        ' Your results do not detect SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. ' +
        'A negative test means that the virus was not present in the sample we collected. Your results suggest you were negative at the time of testing. ' +
        '\n\nAlthough the possibility is low, a false negative result should be considered if you have had recent exposure to the virus along with symptoms consistent with COVID-19.' +
        '\n\nIf you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: ',
    },
    {
      text: 'https://www.toronto.ca/home/covid-19',
      link: 'https://www.toronto.ca/home/covid-19',
      font: 'PTSerif',
      color: '#1155CC',
      decoration: 'underline',
      lineHeight: 1,
    },
    '\n\n',
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
