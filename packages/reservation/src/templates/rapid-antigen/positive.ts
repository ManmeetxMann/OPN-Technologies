import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'
import commonPDFContent from './common-report-content'
import {QrService} from '../../../../common/src/service/qr/qr-service'

const pdfContent = (
  params: RapidAntigenEmailResultDTO,
  resultDate: string,
  qr: string,
): {content: Content[]; tableLayouts: TableLayouts} => {
  return {
    tableLayouts: commonPDFContent.tableLayouts,
    content: [
      commonPDFContent.companyInfoHeader(),
      {text: resultDate, margin: [0, 30, 0, 0]},
      commonPDFContent.clientInformation(params, resultDate),
      messageBody(),
      {text: '', pageBreak: 'before'},
      commonPDFContent.companyInfoHeader(),
      {
        text:
          '\n\nMeanwhile, even with the diagnosis as a ‘presumptive positive’' +
          ' you should follow the Public Health guidelines for ‘Have COVID-19’, which can be found here:\n',
        style: ['gray-text'],
        lineHeight: 1.5,
      },
      {
        text:
          'https://www.toronto.ca/home/covid-19/covid-19-what-you-should-do/covid-19-have-symptoms-or-been-exposed/',
        link:
          'https://www.toronto.ca/home/covid-19/covid-19-what-you-should-do/covid-19-have-symptoms-or-been-exposed/',
        color: '#1155CC',
        decoration: 'underline',
        lineHeight: 1,
      },
      commonPDFContent.conactDetailsForQuestions(),
      QrService.getQrDataForPDFReport(qr, 200, 200),
      commonPDFContent.documentFooter(),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    'The result of your test was ',
    {
      text: `POSITIVE`,
      bold: true,
      color: '#FF0000',
    },
    {
      text:
        ' for the direct and qualitative detection of SARS-CoV-2 viral nucleoprotein antigens' +
        ' known to cause coronavirus disease (also called COVID-19), a respiratory illness.' +
        ' Antigen from nasal secretions of infected individuals is generally detectable within 6 days of symptom onset,' +
        ' during the acute phase of the infection. A positive result indicates the presence of viral antigens,' +
        ' but clinical correlation with your history and confirmatory diagnostic PCR testing is necessary to determine infection status.',
    },
    {
      text: `\n\nFAQ\n`,
      bold: true,
    },
    {
      text: `Q: `,
      bold: true,
    },
    {
      text: `Should I now undergo a confirmatory PCR test?\n`,
    },
    {
      text: `A:`,
      bold: true,
    },
    {
      text:
        'Yes. It is currently the recommendation by Toronto Public Health officials' +
        ' that all point-of-care (POC) ‘rapid tests’ are considered as providing a ‘presumptive’ status.' +
        ' This type of test is considered a screening tool only, and not ‘confirmatory’, or diagnostic.' +
        ' As such all POC testing is subject to confirmatory molecular assay (PCR) testing.',
    },
    {
      text:
        '\n\nIf you wish to undergo confirmatory testing, FH Health uses only Health Canada approved RT-PRC testing.' +
        ' Our test is the gold standard RT-PCR test performed on the Allplex Seegene platform,' +
        ' considered one of the best in the industry, and the same platform used by many Public Health labs.',
    },
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
