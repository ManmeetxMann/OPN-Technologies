import {SpecLabel} from './../../models/pcr-test-results'
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
  lineAsTable: {
    hLineWidth: (): number => 0.5,
    vLineWidth: (): number => 0.5,
    hLineColor: (): string => '#B7B7B7',
    vLineColor: (): string => '#B7B7B7',
  },
  infoTable: {
    hLineWidth: (): number => 0.5,
    vLineWidth: (): number => 0.5,
    hLineColor: (): string => '#B7B7B7',
    vLineColor: (): string => '#B7B7B7',
  },
}

const leftMarginX = 20
const smallFontSize = 8

const getResult = (result: string): {result: string; resultText: string} => {
  if (result && (result.toUpperCase() === 'POSITIVE' || result === '+')) {
    return {result: 'POSITIVE', resultText: 'asd'}
  } else if (result && result.toUpperCase() === 'INDETERMINATE') {
    return {result: 'NEGATIVE', resultText: 'qqwe'}
  }
  return {result: 'idk', resultText: 'hey'}
}

const getFillColorForResultsCell = (result: string): string => {
  if (result && (result.toUpperCase() === 'POSITIVE' || result === '+')) {
    return '#FF0000'
  } else if (result && result.toUpperCase() === 'INDETERMINATE') {
    return '#B7B7B7'
  }
  return '#6AA84F'
}

const getColorForResultsCell = (result: string): string => {
  if (result && result.toUpperCase() === 'INDETERMINATE') {
    return '#000000'
  }
  return '#FFFFFF'
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
    let address = params.address
    if (params.city) {
      address += ` ${params.city} ${params.province} ${params.country}`
    }
    dataPersonal.push([{text: 'Home Address', bold: true}, address])
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
    return analysis.find((analys) => {
      analys.label === keyName
    })
  }

  return [
    // {
    //   text: 'The following client completed a SARS-CoV-2 Antibody screening test:',
    //   margin: [0, 20, 0, 0],
    //   style: ['gray-text'],
    //   lineHeight: 1.2,
    // },
    // {
    //   layout: 'mainTable',
    //   table: {
    //     headerRows: 1,
    //     widths: [183, 240],
    //     body: data,
    //   },
    //   margin: [0, 10, 0, 10],
    // },
    {
      columns: [
        {
          stack: [
            {
              text: 'FIRST NAME',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
            },
            {
              text: params.firstName,
              bold: true,
              style: ['black'],
              fontSize: 25,
            },
            {
              text: 'LAST NAME',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
            },
            {
              text: params.lastName,
              bold: true,
              style: ['black'],
              fontSize: 25,
            },
          ],
          alignment: 'left',
          width: '100%',
          absolutePosition: {x: leftMarginX, y: 100},
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      layout: 'infoTable',
      table: {
        widths: [90, 90],
        heights: 19.7,
        headerRows: 0,
        body: [
          [
            {
              text: 'ADDRESS',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              border: [true, false, false, false],
            },
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
          [
            {
              text:
                params.address +
                '\n' +
                params.addressUnit +
                '\n' +
                params.city +
                ', ' +
                params.province +
                '\n' +
                params.postalCode,
              colSpan: 2,
              alignment: 'left',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [true, false, true, false],
            },
            {
              text: '',
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: 'COUNTRY',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              alignment: 'left',
              border: [true, false, false, false],
            },
            {
              text: 'PHONE',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              alignment: 'left',
              border: [false, false, true, false],
            },
          ],
          [
            {
              text: params.country,
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              alignment: 'left',
              border: [true, false, false, false],
            },
            {
              text: params.phone,
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              alignment: 'left',
              border: [false, false, true, false],
            },
          ],
          [
            {
              text: 'OHIP',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              alignment: 'left',
              border: [true, false, false, false],
            },
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
          [
            {
              text: params.ohipCard || '',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [true, false, false, false],
            },
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 595 / 2 - 10, y: 84},
      margin: [20, 50, 0, 100],
    },
    {
      layout: 'mainTable',
      table: {
        headerRows: 1,
        widths: [140, 40, 50, 50, 90],
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
          /*[
            {text: 'Test Equipment', bold: true},
            {text: 'Approved by Health Canada (IO authorization 312782)', colSpan: 4},
          ],*/
          [
            {text: 'Indication', bold: true},
            {text: 'Suspected Exposure to COVID-19', colSpan: 4},
          ],
        ],
      },
      margin: [0, 10, 0, 0],
    },
    {
      layout: 'infoTable',
      table: {
        widths: [90, 90],
        headerRows: 0,
        body: [
          [
            {
              text: 'DATE OF BIRTH',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: params.dateOfBirth || '',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: 'PASSPORT NO.',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              // Add passport
              text: ' ',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: 'ISSUING COUNTRY',
              bold: true,
              style: ['grey-text'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: params.travelIDIssuingCountry || ' ',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
          [
            {
              text: ' ',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              border: [false, false, false, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 485, y: 84},
      margin: [0, 50, 0, 100],
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [595],
        body: [
          [
            {
              text: '',
              border: [false, true, false, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 0, y: 595 / 2 - 50},
    },
    {
      layout: 'mainTable',
      table: {
        headerRows: 1,
        widths: [140, 40, 50, 50, 90],
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
          /*[
            {text: 'Test Equipment', bold: true},
            {text: 'Approved by Health Canada (IO authorization 312782)', colSpan: 4},
          ],*/
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
        widths: [140, 25, 30, 70, 105],
        body: [
          [
            {text: 'Antibody Cut-off Index Values', bold: true, rowSpan: 2},
            {text: 'IgG'},
            {text: resultAnalysis(params.resultAnalysis, 'IgG')?.value},
            {
              text: resultAnalysis(params.resultAnalysis, 'IgGResult')?.value,
              fillColor: getFillColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgGResult')?.value as string,
              ),
              color: getColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgGResult')?.value as string,
              ),
            },
            {
              text:
                'Reference Cut-off Index\n' +
                '0.8 - < 1.0 = Indeterminate \n' +
                '≥ 1.0 = Positive\n' +
                '< 0.8 = Negative',
              rowSpan: 2,
            },
          ],
          [
            {},
            {text: 'IgM'},
            {text: resultAnalysis(params.resultAnalysis, 'IgM')?.value},
            {
              text: resultAnalysis(params.resultAnalysis, 'IgMResult')?.value,
              fillColor: getFillColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgMResult')?.value as string,
              ),
              color: getColorForResultsCell(
                resultAnalysis(params.resultAnalysis, 'IgMResult')?.value as string,
              ),
            },
          ],
        ],
      },
    },
  ]
}

const conactDetailsForQuestions = (): Content => {
  return {
    text: '\n\nIf you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 484-0042.\n\n',
    style: ['gray-text'],
  }
}

const documentFooter = (): Content => {
  return {
    text: 'This document contains personal identifiable information that must be treated confidentially. Any unauthorized use or disclosure is prohibited.',
    style: ['footer'],
    margin: [0, 50, 0, 0],
  }
}

const companyInfoHeader = (params: RapidAntigenEmailResultDTO): Content => {
  const resultAnalysis = (analysis: Spec[], keyName): Spec => {
    return analysis.find((analys) => {
      analys.label === keyName
    })
  }
  return [
    {
      image: path.join(__dirname, '../Assets/Banner/Positive_Banner@3x.png'),
      absolutePosition: {x: 0, y: 0},
      width: 595,
      opacity: 1,
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          stack: [
            {
              text: getResult(resultAnalysis(params.resultAnalysis, 'IgGResult')?.value as string)
                .result,
              font: 'BrutalType',
              color: '#FFFFFF',
              fontSize: 20,
              absolutePosition: {x: leftMarginX, y: 20},
            },
            {
              text: 'Tested POSITIVE for SARS-COV-2 (ANTIBODY)',
              color: '#FFFFFF',
              fontSize: 10,
              absolutePosition: {x: leftMarginX, y: 50},
            },
          ],
          // width: '100%',
        },
        {
          stack: [
            {
              image: path.join(__dirname, '../Assets/FH_Logo/FH-Logo_White@3x.png'),
              width: 225,
              height: 225 / 4.2,
              absolutePosition: {x: (595 * 3) / 4 - 100, y: 15},
            },
          ],
          margin: [50, 0, 0, 0],
          style: ['black'],
        },
      ],
      margin: [0, 0, 0, 50],
    },
  ]
}

export default {
  companyInfoHeader,
  clientInformation,
  documentFooter,
  tableLayouts,
  conactDetailsForQuestions,
}
