import path from 'path'

import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'
import {Spec} from '../../models/pcr-test-results'

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

const getFillColorForResultsCell = (result: string): string => {
  if (result.toUpperCase() === 'POSITIVE' || result === '+') {
    return '#FF0000'
  } else if (result.toUpperCase() === 'INDETERMINATE') {
    return '#B7B7B7'
  }
  return '#6AA84F'
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

  if (params.gender) {
    // if gender exists add as second field
    dataPersonal.splice(1, 0, [{text: 'Gender', bold: true}, params.gender])
  }

  if (params.address) {
    dataPersonal.push([{text: 'Home Address', bold: true}, params.address])
  }

  if (params.addressUnit) {
    dataPersonal.push([{text: 'Home Address (unit number, etc)', bold: true}, params.addressUnit])
  }

  if (params.postalCode) {
    dataPersonal.push([{text: 'Postal Code', bold: true}, params.postalCode])
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

  const resultAnalysis = (analysis: Spec[], keyName): Spec => {
    return analysis.find((analys) => analys.label === keyName)
  }

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
        widths: [150, 30, 50, 50, 90],
        body: [
          [
            {text: 'Type', bold: true},
            {text: 'Antibody IgG, IgM Test', bold: true, colSpan: 4},
          ],
          [
            {text: 'Antibody Specimen Type', bold: true},
            {text: 'Serum', colSpan: 4},
          ],
          [
            {text: 'Methodology', bold: true},
            {text: 'Chemiluminescence', colSpan: 4},
          ],
          [
            {text: 'Test Equipment', bold: true},
            {text: 'Approved by Health Canada (IO authorization 312782)', colSpan: 4},
          ],
          [
            {text: 'Indication', bold: true},
            {text: 'Suspected Exposure to COVID-19', colSpan: 4},
          ],
        ],
      },
      margin: [0, 10, 0, 0],
    },
    {
      layout: 'mainTable',
      table: {
        headerRows: 2,
        widths: [150, 90, 150],
        body: [
          [
            {text: 'Antibody Cut-off Index Values', bold: true, rowSpan: 2},
            {text: 'IgG'},
            {
              text: resultAnalysis(params.resultAnalysis, 'IgGResult')?.value,
              bold: true,
              fillColor: getFillColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgGResult')?.value as string,
              ),
              fontSize: 12,
              color: '#ffffff',
            },
          ],
          [
            {},
            {text: 'IgM'},
            {
              text: resultAnalysis(params.resultAnalysis, 'IgMResult')?.value,
              bold: true,
              fillColor: getFillColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgMResult')?.value as string,
              ),
              fontSize: 12,
              color: '#ffffff',
            },
          ],
        ],
      },
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
