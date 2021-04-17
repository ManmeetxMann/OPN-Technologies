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
        ' \n\nA positive test result indicates that antibodies to SARS-CoV-2 were detected, and the individual has potentially been exposed to SARS-CoV-2.',
      lineHeight: 1.1,
    } /*KEPT FOR BACKUP. BUSINESS MIGHT WANT IT BACK SOON.Can be removed after April 30
    {
      text:
        ' \n\nThe human immune system antibody response has been studied for decades. In general, IgM' +
        ' isotype antibodies develop in 5 to 7 days and  usually remain in circulation for 2 to 4 months.' +
        ' IgG isotype antibodies develop after 10 days and remain in circulation longer. The onset and' +
        ' persistence of IgA isotype antibodies is variable.',
      lineHeight: 1.1,
    },
    {
      text:
        ' \n\nStudies of the antibody response to SARS-CoV-2 also known as COVID-19 are limited as the first' +
        ' cases were only reported toward the end of  2019. Antibody levels in these patients have been' +
        ' monitored for less than 6 months. In the first COVID-19 studies published, antibody isotype' +
        ' occurrence varies widely, likely impacted by lack of standardization. Guo et al reported that IgM' +
        ' and IgA antibodies were detected in COVID' +
        ' 19 infected patients 5 days after onset of symptoms and IgG at 14 days. In this study the' +
        ' antibody positive rate in clinical COVID-19 cases was  85.4% for IgM, 92.7% for IgA and 77.9%' +
        ' for IgG. Another study reported that IgM antibodies started increasing around day 9 and peaked' +
        ' at  day 18. IgG began increasing from day 9 to 15 and slowly increased from day 15 to 39. The' +
        ' positive rate for IgG reached 100% 20 days after  onset of symptoms (Zheng, 2020). Long et al.,' +
        ' reported that the median day of seroconversion for both IgG and IgM was 13 days after' +
        ' symptoms onset. Seroconversion of IgM occurred at the same time, or earlier, or later than that ' +
        ' of IgG. IgG levels were seen in 100% of  patients (19/19) and reached a plateau within 6 days' +
        ' after seroconversion.',
      lineHeight: 1.1,
    },
    {
      text:
        ' \n\n Positive results for IgG, IgA and IgM antibodies against SARS-CoV-2 are generally indicative of an ' +
        ' individual’s current or prior infection with  the COVID-19 virus, however, the duration these' +
        ' antibodies remain in circulation is not yet established, however, these test results should  always ' +
        ' be considered in the context of a patient’s clinical history, physical examination, and ' +
        ' epidemiologic exposures when making the final  diagnosis.' +
        ' Measurement Uncertainty for SARS-CoV-2 IgA is 0.12 with an average control value of 1.57.' +
        ' Measurement Uncertainty for SARS-CoV-2 IgG is 2.82 with an average control value of 43.70.' +
        ' Measurement Uncertainty for SARS-CoV-2 IgM is 0.83 with an average control value of 6.90. ' +
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
        '\n\n Guo, L., Ren, L., Yang, S., Xiao, M., Chang, D., Yang, F., ... & Zhang, L. (2020). Profiling early humoral' +
        ' Guo, L., Ren, L., Yang, S., Xiao, M., Chang, D., Yang, F., ... & Zhang, L. (2020). Profiling early humoral' +
        ' response to diagnose novel  coronavirus disease (COVID-19). Clinical Infectious Diseases.' +
        ' Long, Q et al. (2020). Antibody responses to SARS-CoV-2 in COVID-19 patients: the perspective' +
        ' application of serological tests in clinical  practice. 10.1101/2020.03.18.20038018.',
      lineHeight: 1.1,
    },*/,
  ]

  return {
    text: textInfo,
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}
export default pdfContent
