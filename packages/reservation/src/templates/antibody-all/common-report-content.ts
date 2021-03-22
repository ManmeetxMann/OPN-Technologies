import path from 'path'

import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'

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

const clientInformation = (params: RapidAntigenEmailResultDTO, resultDate: string): Content => {
  const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')
  const dataPersonal = [
    [
      {text: 'Client Name ', bold: true},
      {
        text: `${params.firstName} ${params.lastName}`,
        bold: true,
      },
    ],
    [{text: 'Date of Birth', bold: true}, params.dateOfBirth],
    [{text: 'Mobile Number', bold: true}, params.phone],
  ]

  if (params.address) {
    dataPersonal.push([{text: 'Home Address', bold: true}, params.address])
  }

  if (params.addressUnit) {
    dataPersonal.push([{text: 'Home Address (unit number, etc)', bold: true}, params.addressUnit])
  }

  if (params.travelID) {
    dataPersonal.push([{text: 'Travel ID', bold: true}, params.travelID])
  }

  if (params.travelIDIssuingCountry) {
    dataPersonal.push([{text: 'Travel Country', bold: true}, params.travelIDIssuingCountry])
  }

  const dataAppointment = [
    [
      {text: 'Date of Test (Sample Collection)', bold: true},
      `${params.dateOfAppointment} at ${params.timeOfAppointment}`,
    ],
    [{text: 'Date of Result', bold: true}, resultDate],
    [{text: 'Registered Practical Nurse', bold: true}, params.registeredNursePractitioner],
    [{text: 'Ordering Physician', bold: true}, requisitionDoctor],
  ]

  const data = [...dataPersonal, ...dataAppointment]

  return [
    {
      text: 'The following client completed a SARS-CoV-2 Antibody screening test:',
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
      margin: [0, 10, 0, 10],
    },
    {
      text: 'Antibody Test Details:',
      decoration: 'underline',
      bold: true,
      lineHeight: 1.2,
      margin: [0, 10, 0, 10],
      style: ['gray-text'],
    },
    {
      layout: 'mainTable',
      table: {
        headerRows: 1,
        widths: [150, 180],
        body: [
          [
            {text: 'Type', bold: true},
            {text: 'Antibody IgA, IgG, IgM Test', bold: true},
          ],
          [{text: 'Antibody Specimen Type', bold: true}, 'Serum'],
          [{text: 'Methodology', bold: true}, 'Chemiluminescence'],
          [{text: 'Indication', bold: true}, 'Suspected Exposure to COVID-19'],
          [{text: 'Antibody Cut-off Index Values', bold: true}, 'values'],
        ],
      },
      margin: [0, 10, 0, 10],
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

export default {
  companyInfoHeader,
  clientInformation,
  documentFooter,
  tableLayouts,
  conactDetailsForQuestions,
}
