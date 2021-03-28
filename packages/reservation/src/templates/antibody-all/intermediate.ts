import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import commonPDFContent from './common-report-content'

const pdfContent = (
  params: PCRTestResultEmailDTO,
  resultDate: string,
): {content: Content[]; tableLayouts: TableLayouts} => {
  return {
    tableLayouts: commonPDFContent.tableLayouts,
    content: [
      commonPDFContent.companyInfoHeader(),
      {text: resultDate, margin: [0, 30, 0, 0]},
      commonPDFContent.clientInformation(params, resultDate),
      {text: 'Interpretation comments follow on the next page.', margin: [0, 5, 0, 0]},
      commonPDFContent.documentFooter(),
      {text: '', pageBreak: 'before'},
      commonPDFContent.companyInfoHeader(),
      messageBody(),
      commonPDFContent.documentFooter(),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    {
      text: `Comments:`,
      bold: true,
      decoration: 'underline',
    },
    {
      text:
        ' \n\nAn indeterminate result indicates that the antibody levels was detected at a level close to the' +
        ' threshold of the limit of detection for the test.  Indeterminate results may represent an early' +
        ' infection, detection of antibody generated from a past infection or, in some cases, an underlyingIgG isotype antibodies develop after 10 days and remain in circulation longer. The onset and' +
        ' immune disorder, immunosuppression, or other reasons. A retest could be considered if ' +
        ' necessary, and indicated.' +
        '\n\n',
      lineHeight: 1.1,
    },
    {
      text: `References:`,
      bold: true,
      decoration: 'underline',
    },
    {
      text:
        ' \n\n Guo, L., Ren, L., Yang, S., Xiao, M., Chang, D., Yang, F., ... & Zhang, L. (2020). Profiling early humoral' +
        ' response to diagnose novel  coronavirus disease (COVID-19). Clinical Infectious Diseases.' +
        ' Long, Q et al. (2020). Antibody responses to SARS-CoV-2 in COVID-19 patients: the perspective' +
        ' application of serological tests in clinical  practice. 10.1101/2020.03.18.20038018.',
      lineHeight: 1.1,
    },
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
