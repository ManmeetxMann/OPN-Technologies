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
      QrService.getQrDataForPDFReport(qr, 200, 200),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    'After re-testing of your sample with the Public Health reference laboratory, the result of your test is now',
    {
      text: ' CONFIRMATORY POSITIVE ',
      bold: true,
    },
    'for the presence of SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. ',
    {
      text: 'This result may also be viewed by logging on to the OLIS website using ',
      background: '#FFFF33',
    },
    {
      text: 'this link here',
      background: 'yellow',
      link: 'https://covid19results.ehealthontario.ca:4443/login',
      color: '#1155CC',
      decoration: 'underline',
      lineHeight: 1,
    },
    {
      text: ' and entering your OHIP number. \n\n',
      background: '#FFFF33',
    },
    {
      text: 'You should continue to  follow the Public Health guidelines for "Have COVID-19", which can be found here:\n',
    },
    {
      text: 'https://www.toronto.ca/home/covid-19/covid-19-what-you-should-do/covid-19-have symptoms-or-been-exposed/',
      link: 'https://www.toronto.ca/home/covid-19/covid-19-what-you-should-do/covid-19-have symptoms-or-been-exposed/',
      color: '#1155CC',
      decoration: 'underline',
      lineHeight: 1,
    },
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
