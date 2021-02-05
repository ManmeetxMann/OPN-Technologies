import path from 'path'

import {TableLayouts, Content} from '../../../common/src/service/reports/pdf-types'
import {Config} from '../../../common/src/utils/config'
import {ResultTypes} from '../models/appointment'
import {PCRTestResultEmailDTO} from '../models/pcr-test-results'

const tableLayouts: TableLayouts = {
  mainTable: {
    hLineWidth: (): number => 1,
    vLineWidth: (): number => 1,
    hLineColor: (): string => '#CCCCCC',
    vLineColor: (): string => '#CCCCCC',
    paddingTop: (): number => 5,
    paddingBottom: (): number => 5,
  },
  resultTable: {
    hLineWidth: (): number => 1,
    vLineWidth: (): number => 1,
    hLineColor: (): string => '#B7B7B7',
    vLineColor: (): string => '#B7B7B7',
    paddingTop: (): number => 5,
    paddingBottom: (): number => 5,
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

const clientInformation = (params: PCRTestResultEmailDTO, resultDate: string): Content => {
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

  if (params.address) {
    dataPersonal.push(['Address', params.address])
  }

  if (params.addressUnit) {
    dataPersonal.push(['Address Unit', params.addressUnit])
  }

  if (
    params.ohipCard &&
    (params.result === ResultTypes.Positive || params.result === ResultTypes.PresumptivePositive)
  ) {
    dataPersonal.push(['OHIP Card', params.ohipCard])
  }

  if (params.travelID) {
    dataPersonal.push(['Travel ID', params.travelID])
  }

  if (params.travelIDIssuingCountry) {
    dataPersonal.push(['TravelID Issuing Country', params.travelIDIssuingCountry])
  }

  const dataAppointment = [
    [
      'Date of Test (Sample Collection)',
      `${params.dateOfAppointment} at ${params.timeOfAppointment}`,
    ],
    ['Date of Result', resultDate],
    ['Ordering Physician', requisitionDoctor],
    ['Nurse', params.registeredNursePractitioner],
  ]

  if (params.swabMethod) {
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

  return [
    {
      text: 'The following client completed a SARS-CoV-2 screening test at FH Health:',
      margin: [0, 20, 0, 0],
      style: ['gray-text'],
      lineHeight: 1.2,
    },
    {
      layout: 'mainTable',
      table: {
        headerRows: 1,
        widths: [183, 240],
        body: data,
      },
      margin: [0, 5, 0, 0],
    },
  ]
}

const conactDetailsForQuestions = (): Content => {
  return {
    text:
      '\n\nIf you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 484-0042.\n\n',
    style: ['gray-text'],
  }
}

const documentFooter = (): Content => {
  return {
    text:
      'This document contains personal identifiable information that must be treated confidentially. Any unauthorized use or disclosure is prohibited.',
    style: ['footer'],
    margin: [0, 50, 0, 0],
  }
}
const testAnalysisTable = (params: PCRTestResultEmailDTO): Content => {
  return [
    {
      text: 'Detailed Test Analysis Data:',
      margin: [0, 15, 0, 0],
      lineHeight: 1.2,
    },
    {
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
    },
    {
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
    },
  ]
}

export default {
  companyInfoHeader,
  clientInformation,
  documentFooter,
  tableLayouts,
  conactDetailsForQuestions,
  testAnalysisTable,
}
