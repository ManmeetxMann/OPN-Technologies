import path from 'path'

import {TableLayouts, Content} from '../../../common/src/service/reports/pdf-types'
import {Config} from '../../../common/src/utils/config'
import {ResultTypes} from '../models/appointment'
import {PCRTestResultEmailDTO} from '../models/pcr-test-results'

const tableLayouts: TableLayouts = {
  mainTable: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#CCCCCC',
    vLineColor: () => '#CCCCCC',
    paddingTop: () => 5,
    paddingBottom: () => 5,
  },
  resultTable: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#B7B7B7',
    vLineColor: () => '#B7B7B7',
    paddingTop: () => 5,
    paddingBottom: () => 5,
  },
}

const resultText = (result: ResultTypes): string => {
  if (result === ResultTypes.PresumptivePositive) {
    return 'Presumptive Positive'
  } else if (result === ResultTypes.Positive) {
    return '2019-nCoV Detected'
  }
  return 'NEGATIVE'
}

const getFillColorForResultsCell = (result: ResultTypes): string => {
  if (result === ResultTypes.PresumptivePositive) {
    return '#FF0000'
  } else if (result === ResultTypes.Positive) {
    return '#FF0000'
  }
  return '#6AA84F'
}

const pdfContent = (
  params: PCRTestResultEmailDTO,
  resultDate: string,
): {content: Content[]; tableLayouts: TableLayouts} => {
  return {
    tableLayouts,
    content: [
      companyInfoHeader(),
      {text: resultDate, margin: [0, 30, 0, 0]},
      clientInformation().heading(),
      clientInformation().dataTable(params, resultDate),
      messageBody(params),
      {text: '', pageBreak: 'before'},
      companyInfoHeader(),
      testAnalysisTable().heading(),
      testAnalysisTable().headerRow(),
      testAnalysisTable().dataRow(params),
      documentFooter(),
    ],
  }
}

const companyInfoHeader = (): Content => {
  return {
    columns: [
      {
        stack: [
          {
            image: path.join(__dirname, '../static/images/fh-logo.png'),
            width: 96,
            height: 88,
            style: 'logo',
          },
        ],
        width: '50%',
      },
      {
        stack: [
          {
            text: 'FH Health',
            bold: true,
            fontSize: 11,
            lineHeight: 1.2,
          },
          {
            text: 'COVID-19 Screening Test Centre',
            fontSize: 11,
            lineHeight: 1.2,
          },
          {
            text: '413 Spadina Road',
            margin: [0, 12, 0, 0],
            fontSize: 10,
            lineHeight: 1.1,
          },
          {
            text: 'info@fhhealth.ca',
            fontSize: 10,
            lineHeight: 1.1,
          },
          {
            text: 'www.FHHealth.ca',
            fontSize: 10,
            lineHeight: 1.1,
          },
        ],
        alignment: 'right',
        margin: [0, 5, 0, 0],
        style: ['black'],
      },
    ],
  }
}

const clientInformation = () => {
  const heading = (): Content => {
    return {
      text: 'The following client completed a SARS-CoV-2 screening test at FH Health:',
      margin: [0, 20, 0, 0],
      style: ['gray-text'],
      lineHeight: 1.2,
    }
  }

  const dataTable = (params: PCRTestResultEmailDTO, resultDate: string): Content => {
    const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')
    const dataPersonal = [
      [
        'Patient Name ',
        {
          text: `${params.firstName} ${params.lastName}`,
          bold: true,
        },
      ],
      ['Date of Birth', params.dateOfBirth],
      ['Mobile Number', params.phone],
    ]
    
    if(params.travelID){
      dataPersonal.push(['Travel ID', params.travelID])
    }
    
    if(params.travelIDIssuingCountry){
      dataPersonal.push(['TravelID Issuing Country', params.travelIDIssuingCountry])
    }

    const dataAppointment = [
      [
        'Date of Test (Sample Collection)',
        `${params.dateOfAppointment} at ${params.timeOfAppointment}`,
      ],
      ['Date of Result', resultDate],
      ['Ordering Physician', requisitionDoctor],
      ['Nurse', params.registeredNursePractitioner]
    ]

    if(params.swabMethod){
      dataAppointment.push(['Swab Method', params.swabMethod])
    }
    
    const dataTestDetails = [
      ['Test', 'RT-PCR (Reverse Transcription Polymerase Chain Reaction)'],
      [
        'Equipment approved by \n Health Canada',
        'Allplex 2019-nCoV Assay manufactured by Seegene, Inc.',
      ],
    ]
    
    const data = dataPersonal.concat(dataAppointment, dataTestDetails)

    return {
      layout: 'mainTable',
      table: {
        headerRows: 1,
        widths: [183, 240],
        body: data,
      },
      margin: [0, 5, 0, 0],
    }
  }

  return Object.freeze({
    dataTable,
    heading,
  })
}

const documentFooter = (): Content => {
  return {
    text:
      'This document contains personal identifiable information that must be treated confidentially. Any unauthorized use or disclosure is prohibited.',
    style: ['footer'],
    margin: [0, 50, 0, 0],
  }
}

const testAnalysisTable = () => {
  const heading = (): Content => {
    return [
      {
        text:
          '\n\nIf you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 484-0042.\n\n',
      },
      {
        text: 'Detailed Test Analysis Data:',
        margin: [0, 15, 0, 0],
        lineHeight: 1.2,
      },
    ]
  }

  const headerRow = (): Content => {
    return {
      columns: [
        {
          layout: 'resultTable',
          width: 58,
          table: {
            widths: [52],
            heights: [46],
            body: [['Result']],
          },
        },
        {
          stack: [
            {
              layout: 'resultTable',
              width: 350,
              table: {
                widths: [88, 88, 88, 88],
                body: [['FAM', 'Cal Red 61', 'Quasar 670', 'HEX']],
              },
              margin: [3, 0, 0, 0],
              alignment: 'center',
            },
            {
              layout: 'resultTable',
              width: 350,
              table: {
                widths: [40, 39, 40, 39, 40, 39, 40, 39],
                body: [['E gene', 'C(t)', 'RdRP gene', 'C(t)', 'N gene', 'C(t)', 'IC', 'C(t)']],
              },
              margin: [3, -1, 0, 0],
              alignment: 'center',
            },
          ],
        },
      ],
      margin: [0, 15, 0, 0],
      fontSize: 10,
    }
  }

  const dataRow = (params: PCRTestResultEmailDTO): Content => {
    return {
      layout: 'resultTable',
      table: {
        widths: [52, 40, 39, 40, 39, 40, 39, 40, 39],
        body: [
          [
            {
              text: resultText(params.result),
              fillColor: getFillColorForResultsCell(params.result),
              color: '#FFFFFF',
            },
            {
              text: params.resultSpecs.famEGene,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.famCt,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.calRed61RdRpGene,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.calRed61Ct,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.quasar670NGene,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.quasar670Ct,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.hexIC,
              alignment: 'center',
            },
            {
              text: params.resultSpecs.hexCt,
              alignment: 'center',
            },
          ],
        ],
      },
      margin: [0, -1, 0, 0],
      fontSize: 10,
    }
  }

  return Object.freeze({
    dataRow,
    heading,
    headerRow,
  })
}

const messageBody = (params: PCRTestResultEmailDTO): Content => {
  const messageForPositiveTest = [
    'The result of your test was ',
    {
      text: resultText(params.result),
      bold: true,
    },
    {
      text:
        " for the presence of SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness.  A positive test means that the virus was likely present in the sample we collected. The probability of a false positive is low.\n\n This result, along with your name and contact information have been forwarded to Public Health as per requirement by law, and you may be contacted. You should follow the Public Health guidelines for '‘Have COVID-19’', which can be found here: ",
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
  ]

  const messageForPresumptivePositiveTest = [
    'The result of your test was ',
    {
      text: resultText(params.result),
      bold: true,
    },
    {
      text:
        ' for the presence of SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. ' +
        'A presumptive positive test indicates presence of the virus in the sample we collected. ' +
        'The probability of a false positive is low, however, all presumptive positives go through confirmatory testing at a Public Health affiliated Lab. ' +
        'Your confirmatory result will be posted on the OLIS website. ' +
        'You must use your OHIP number to access the results: ',
    },
    {
      text: 'https://covid19results.ehealthontario.ca:4443/agree',
      link: 'https://covid19results.ehealthontario.ca:4443/agree',
      color: '#1155CC',
      decoration: 'underline',
      lineHeight: 1,
    },
    {
      text:
        '\n\nThe result of this confirmatory test, along with your name and contact information have been forwarded to the Public Health Lab, and will be shared with them as required by law. ' +
        'While you wait for the results of the confirmatory testing, please follow the Public Health guidelines for "Have COVID-19", which can be found here: \n',
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
  ]

  const messageForNegativeTest = [
    'The result of your test was ',
    {
      text: `${resultText(params.result)}.`,
      bold: true,
    },
    {
      text:
        ' Your results do not detect SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. ' +
        'A negative test means that the virus was not present in the sample we collected. Your results suggest you were negative at the time of testing. ' +
        '*\n\n* Although the possibility is low, a false negative result should be considered if you have had recent exposure to the virus along with symptoms consistent with COVID-19.' +
        '\n\nIf you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: https://www.toronto.ca/home/covid-19 \n\n',
    },
  ]

  const messageBasedOnResultType = (result: ResultTypes) => {
    if (result === ResultTypes.PresumptivePositive) {
      return messageForPresumptivePositiveTest
    } else if (result === ResultTypes.Positive) {
      return messageForPositiveTest
    } else {
      return messageForNegativeTest
    }
  }

  return {
    text: messageBasedOnResultType(params.result),
    margin: [0, 20, 0, 0],
    lineHeight: 1.5,
  }
}

export default pdfContent
