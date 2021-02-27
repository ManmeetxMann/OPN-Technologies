import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'
import commonPDFContent from './common-report-content'

const pdfContent = (
  params: RapidAntigenEmailResultDTO,
  resultDate: string,
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
          '\n\nThis type of test is considered a screening tool only, and not ‘confirmatory’, or diagnostic.' +
          ' If you wish to undergo confirmatory testing, FH Health uses only Health Canada approved RT-PRC testing.' +
          ' Our test is the gold standard RT-PCR test performed on the Allplex Seegene platform,' +
          ' considered one of the best in the industry, and the same platform used by many Public Health labs.' +
          ' Meanwhile, even with the diagnosis as a ‘presumptive negative’ you should continue to follow' +
          ' the prevailing Public Health guidelines for COVID-19.',
        style: ['gray-text'],
        lineHeight: 1.5,
      },
      commonPDFContent.conactDetailsForQuestions(),
      commonPDFContent.documentFooter(),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    'The result of your test was ',
    {
      text: `NEGATIVE`,
      bold: true,
    },
    {
      text:
        ' for the direct and qualitative detection of SARS-CoV-2 viral nucleoprotein antigens known to cause coronavirus disease' +
        ' (also called COVID-19), a respiratory illness.' +
        ' Antigen from nasal secretions of infected individuals is generally detectable within 6 days of symptom onset,' +
        ' during the acute phase of the infection. A negative result should be treated as presumptive,' +
        ' and does not rule out SARS-CoV-2 infection and should not be used as the sole basis' +
        ' for treatment of patient management decisions,' +
        ' including infection control decisions.' +
        ' Negative results should be considered in the context of a patient’s recent exposures, history,' +
        ' and the presence of clinical signs and symptoms consistent with COVID-19.',
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
        '' +
        ' If you are feeling completely fine, exhibiting no symptoms,' +
        ' and have no identified risk exposure as per above,' +
        ' then you do not need to undergo confirmatory molecular assay (PCR) testing' +
        ' at this time. Be mindful that all point-of-care (POC) ‘rapid tests’ are considered as providing a ‘presumptive’ status.',
    },
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
