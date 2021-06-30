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
      commonPDFContent.testAnalysisTable(params),
      commonPDFContent.importantInfo(),
      commonPDFContent.legalNotice(),
    ],
  }
}

const messageBody = (): Content => {
  const textInfo: Content = [
    'The result of your Public Health Lab confirmatory testing was ',
    {
      text: 'NEGATIVE. ',
      bold: true,
    },
    {
      text: [
        'This means that a Public Health Lab did not detect SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness.\n\n',
        'This means that you may now legally revert to following the recommended Public Health guidelines for COVID-19 negative individuals.\n\n',
        'However, it is possible that our Presumptive Positive was detecting very early disease, ',
        'and this could account for the difference in results due to the variability in testing platforms used both within and outside of the healthcare system.\n\n',
        'Out of an abundance of caution, we are recommending and offering you a complimentary follow-up repeat test. ',
        'Again, if our Presumptive Positive was detecting early disease, ',
        'then the re-collected sample will have further increased in viral load, ',
        'allowing for broader detection that should be confirmed by Public Health. ',
        'If there is no change with subsequent testing, your status will remain NEGATIVE by the Public Health Lab’s determination.\n\n',
      ],
    },
    {
      text: 'If you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: ',
    },
    {
      text: 'https://www.toronto.ca/home/covid-19',
      link: 'https://www.toronto.ca/home/covid-19',
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
