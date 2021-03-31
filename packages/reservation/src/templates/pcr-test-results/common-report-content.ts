import path from 'path'

import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {ResultTypes} from '../../models/appointment'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import {groupByChannel} from '../../utils/analysis.helper'

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
            image: path.join(__dirname, '../../static/images/fh-logo.png'),
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

  if (params.gender) {
    // if gender exists add as second field
    dataPersonal.splice(1, 0, [{text: 'Gender', bold: true}, params.gender])
  }

  if (params.address) {
    dataPersonal.push(['Home Address', params.address])
  }

  if (params.addressUnit) {
    dataPersonal.push(['Home Address (unit number, etc)', params.addressUnit])
  }

  if (params.postalCode) {
    dataPersonal.push([{text: 'Postal Code', bold: true}, params.postalCode])
  }

  if (
    params.ohipCard &&
    (params.result === ResultTypes.Positive || params.result === ResultTypes.PresumptivePositive)
  ) {
    dataPersonal.push(['Health / OHIP Card', params.ohipCard])
  }

  if (params.travelID) {
    dataPersonal.push(['Passport / Travel ID', params.travelID])
  }

  if (params.travelIDIssuingCountry) {
    dataPersonal.push(['Passport Travel ID Issuing Country', params.travelIDIssuingCountry])
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
    ['Equipment approved by \n Health Canada', params.labAssay],
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
    {
      text: 'All dates and times shown are displayed in EST',
      margin: [0, 5, 0, 0],
      style: ['disclaimer'],
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
  const groupedAnalysis = groupByChannel(params.resultAnalysis)

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
                widths: [...groupedAnalysis.map((channel) => channel.groups.length * 44)],
                body: [[...groupedAnalysis.map((channel) => channel.channelName)]],
              },
              margin: [3, 0, 0, 0],
              alignment: 'center',
            },
            {
              layout: 'resultTable',
              width: 350,
              table: {
                widths: [40, 39, 40, 39, 40, 39, 40, 39],
                body: [
                  [
                    ...groupedAnalysis
                      .map((channel) => channel.groups.map((group) => group.label))
                      .flat(),
                  ],
                ],
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
            ...groupedAnalysis
              .map((channel) =>
                channel.groups.map((group) => ({
                  text: group.value,
                  alignment: 'center',
                })),
              )
              .flat(),
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
