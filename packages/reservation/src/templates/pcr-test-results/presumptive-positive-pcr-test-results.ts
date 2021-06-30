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
      commonPDFContent.importantInfo(params),
      commonPDFContent.legalNotice(),
      commonPDFContent.placeQRCode(QrService.getQrDataForPDFReport(qr, 200, 200)),
    ],
  }
}
const messageBody = (): Content => {
  const textInfo: Content = [
    'The result of your test was ',
    {
      text: `PRESUMPTIVE POSITIVE `,
      bold: true,
    },
    ' for the presence of SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. ',
    'A presumptive positive test indicates presence of the virus in the sample we collected. \n\n',
    'The result of this test, along with your name and contact information have been forwarded to a Public Health Lab, ',
    'and will be shared with them for confirmatory testing, as required by law. \n\n',
    'While you wait for the results of the confirmatory testing, please follow the Public Health guidelines for "Have COVID-19", which can be found here:\n',
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

const messageBody2Page = (): Content => {
  const textInfo: Content = [
    'The probability of a false positive is low. ',
    'However, due to the variability in testing platforms used both within and outside the public healthcare system, ',
    'the ‘Presumptive Positive’ results you have received from FH Health may not (<5% chance) produce a positive result ',
    'with the Public Health reference laboratory. ',
    'In this case, Public Health will receive a "SARS-Cov-2 Not Detected" report from the reference laboratory, ',
    'and we will similarly notify you of any such change in your status. \n\n',
    'In such a scenario would recommend and offer you complimentary follow-up repeat testing. ',
    'If our Presumptive Positive is detecting early disease, then the re-collected sample will have further increased in viral load, ',
    'allowing for broader detection that should be confirmed by the reference laboratory.\n\n',
    'If you did not provide us with your OHIP information please consider this as a ',
    {
      text: `final positive result. `,
      bold: true,
    },
    'Your confirmatory result, whether negative or positive, will also be posted on the OLIS website. You must use your OHIP number to access the results:\n',
    {
      text: 'https://covid19results.ehealthontario.ca:4443/agree',
      link: 'https://covid19results.ehealthontario.ca:4443/agree',
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
