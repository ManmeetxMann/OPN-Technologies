import path from 'path'
import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {ResultTypes, TestTypes} from '../../models/appointment'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'
import {groupByChannel} from '../../utils/analysis.helper'
import {Spec} from '../../models/pcr-test-results'
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

// const resultText = (result: ResultTypes): string => {
//   if (result === ResultTypes.PresumptivePositive) {
//     return 'Presumptive Positive'
//   } else if (result === ResultTypes.Positive) {
//     return '2019-nCoV Detected'
//   }
//   return 'NEGATIVE'
// }

const resultText = (result: ResultTypes): string => {
  if (result === ResultTypes.PresumptivePositive) {
    return 'Positive'
  } else if (result === ResultTypes.Positive) {
    return 'Positive'
  } else if (result === ResultTypes.Negative) {
    return 'Negative'
  } else if (result === ResultTypes.Inconclusive) {
    return 'Inconclusive'
  }
  return 'Indeterminate'
}

const testType = (result: TestTypes): string => {
  if (result === TestTypes.ExpressPCR) return 'Express PCR'
  else if (result === TestTypes.PCR) return 'RT-PCR'
}

const companyInfoHeader = (params: RapidAntigenEmailResultDTO): Content => {
  return [
    {
      image: path.join(
        __dirname,
        '../Assets/Banner/' + resultText(params.result) + '_Banner@3x.png',
      ),
      absolutePosition: {x: 0, y: 0},
      width: 1224,
      opacity: 0.9,
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          stack: [
            {
              text: resultText(params.result),
              font: 'SFPro',
              color: '#FFFFFF',
              fontSize: 65,
              bold: true,
              absolutePosition: {x: 30, y: 30},
            },
            {
              text:
                'Tested ' +
                resultText(params.result).toUpperCase() +
                ' for SARS-COV-2 ' +
                testType(params.testType),
              color: '#FFFFFF',
              fontSize: 18,
              font: 'SFPro',
              absolutePosition: {x: 30, y: 110},
            },
          ],
        },
        {
          stack: [
            {
              image: path.join(__dirname, '../Assets/FH_Logo/FH_Health_Logos_Hor_White.png'),
              width: 275,
              height: 275 / 3.6,
              absolutePosition: {x: (1224 * 3) / 4 - 180, y: 50},
            },
          ],
          margin: [50, 0, 0, 0],
          style: ['black'],
        },
        {
          text:
            '2637 Yonge Street\n' +
            'Toronto, ON \n\n' +
            'info@fnhealth.com\n\n' +
            'www.fnhealth.com',
          font: 'SFPro',
          color: '#FFFFFF',
          fontSize: 15,
          bold: true,
          absolutePosition: {x: (1224 * 3) / 4 + 150, y: 35},
        },
      ],
      margin: [0, 0, 0, 50],
    },
  ]
}

const leftMarginX = 30
const topMargin = 100
// const smallx2FontSize = 8
const smallFontSize = 23 - 5
const smallFontSizeHeader = smallFontSize - 5
const pdfWidth = 1224
const pdfHeight = 1816
const bigFontSize = 55

const clientInformation = (params: RapidAntigenEmailResultDTO, resultDate: string): Content => {
  const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')

  return [
    {
      columns: [
        {
          stack: [
            {
              text: 'FIRST NAME',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
            },
            {
              text: params.firstName,
              bold: true,
              style: ['black'],
              fontSize: bigFontSize,
              font: 'PTSerif',
              margin: [0, 0, 0, 30],
            },
            {
              text: 'LAST NAME',
              bold: true,
              font: 'DMSans',
              style: ['gray'],
              fontSize: smallFontSizeHeader,
            },
            {
              text: params.lastName,
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: bigFontSize,
            },
          ],
          alignment: 'left',
          width: '100%',
          absolutePosition: {x: leftMarginX, y: 100 + topMargin},
        },
      ],
      margin: [0, 0, 0, topMargin],
    },
    {
      layout: 'infoTable',
      table: {
        widths: [180, 180],
        heights: [10, 10, 10, 10],
        headerRows: 0,
        body: [
          [
            {
              text: 'ADDRESS',
              bold: true,
              font: 'DMSans',
              style: ['gray'],
              fontSize: smallFontSizeHeader,
              border: [true, false, false, false],
              margin: [10, 30, 0, 0],
            },
            {
              text: '',
              border: [false, false, true, false],
              margin: [10, 30, 0, 0],
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
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [true, false, true, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: '',
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'COUNTRY',
              bold: true,
              font: 'DMSans',
              style: ['gray'],
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [true, false, false, false],
              margin: [10, 15, 0, 0],
            },
            {
              text: 'PHONE',
              bold: true,
              font: 'DMSans',
              style: ['gray'],
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, true, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              text: params.country,
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              font: 'PTSerif',
              alignment: 'left',
              border: [true, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: params.phone,
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              font: 'PTSerif',
              alignment: 'left',
              border: [false, false, true, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'OHIP',
              bold: true,
              font: 'DMSans',
              style: ['gray'],
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [true, false, false, false],
              margin: [10, 15, 0, 0],
            },
            {
              text: '',
              border: [false, false, true, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              text: params.ohipCard || 'N/A',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              font: 'PTSerif',
              border: [true, false, false, false],
              margin: [10, 5, 0, 70],
            },
            {
              text: '',
              border: [false, false, true, false],
              margin: [10, 5, 0, 50],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2 + 10, y: 73 + topMargin},
      margin: [20, 50, 0, 70 + topMargin],
    },
    {
      layout: 'infoTable',
      table: {
        widths: [180],
        headerRows: 0,
        body: [
          [
            {
              text: 'DATE OF BIRTH',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 30, 0, 0],
            },
          ],
          [
            {
              text: params.dateOfBirth || 'N/A',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'PASSPORT NO.',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              // Add passport
              text: params.travelID,
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'ISSUING COUNTRY',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              text: params.travelIDIssuingCountry || ' ',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
        ],
      },
      absolutePosition: {x: (1224 * 3) / 4 + 100, y: 73 + topMargin},
      margin: [0, 50, 0, 100 + topMargin],
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [pdfWidth],
        body: [
          [
            {
              text: '',
              border: [false, true, false, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 0, y: pdfWidth / 2 - 75},
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [pdfWidth],
        body: [
          [
            {
              text: '',
              border: [false, true, false, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 0, y: pdfWidth / 2 + 235},
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [pdfWidth],
        body: [
          [
            {
              text: '',
              border: [false, true, false, false],
            },
          ],
        ],
      },
      absolutePosition: {x: 0, y: pdfWidth / 2 + 1000},
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [1],
        heights: [600],
        body: [
          [
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2, y: 400},
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [1],
        heights: [199],
        body: [
          [
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2, y: pdfWidth / 2 + 1000},
    },
    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [1],
        heights: [120],
        body: [
          [
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
        ],
      },
      absolutePosition: {x: (pdfWidth * 3) / 4 + 100, y: 30},
    },
    {
      layout: 'infoTable',
      table: {
        widths: [270, 270],
        heights: [10, 10, 10, 10],
        headerRows: 0,
        body: [
          [
            {
              text: 'DATE OF TEST',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 30, 0, 0],
            },
            {
              text: 'DATE OF RESULT',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 30, 0, 0],
            },
          ],
          [
            {
              text: params.dateOfAppointment + ', ' + params.timeOfAppointment,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: resultDate,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'TEST-TYPE',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
            {
              text: 'ANTIBODY SPECIMEN TYPE',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              text: 'SARS-COV-2 Total Antibody\n' + '(IgG, IgA, IgM)',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: 'Serum',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'INDICATION',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 10, 0, 0],
            },
            {
              text: 'METHODOLOGY',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 10, 0, 0],
            },
          ],
          [
            {
              text: 'Suspected Exposure to \n COVID-19. Patron specified \nthat they are vaccinated.',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 2, 0, 30],
            },
            {
              text: 'ELISA',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 30],
            },
          ],
        ],
      },
      absolutePosition: {x: leftMarginX, y: 420 + topMargin},
      margin: [20, 50, 0, 100 + topMargin],
    },
    {
      layout: 'infoTable',
      table: {
        widths: [270, 270],
        heights: [10, 10, 10, 10],
        headerRows: 0,
        body: [
          [
            {
              text: 'COLLECTION NURSE',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 30, 0, 0],
            },
            {
              text: 'ORDERING PHYSICIAN',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              border: [false, false, false, false],
              margin: [10, 30, 0, 0],
            },
          ],
          [
            {
              text: params.registeredNursePractitioner,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: requisitionDoctor,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'TESTING CLINIC',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
            {
              text: 'LOCATION',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
          ],
          [
            {
              text: params.locationName,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: params.locationAddress,
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'TESTING LAB',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 15, 0, 0],
            },
            {
              text: '',
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
          [
            {
              text: 'FH Buffalo',
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: '',
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2 + 10, y: 420 + topMargin},
      margin: [20, 50, 0, 100 + topMargin],
    },
    {
      columns: [
        {
          stack: [
            {
              text: 'Test Analysis',
              bold: true,
              fontSize: 30,
              style: ['black'],
              margin: [30, 0, 0, 10],
            },
            {
              text: 'ANTIBODY CUT-OFF INDEX VALUES',
              bold: true,
              color: '#FFA500',
              fontSize: 20,
              margin: [30, 0, 0, 10],
            },
          ],
          alignment: 'left',
          width: '100%',
          absolutePosition: {x: pdfWidth / 2 + 10, y: 1224 / 2 + 300},
        },
      ],
      margin: [30, 0, 0, topMargin],
    },

    {
      layout: 'lineAsTable',
      table: {
        headerRows: 1,
        widths: [1],
        heights: [pdfHeight / 2 + 380],
        body: [
          [
            {
              text: '',
              border: [false, false, true, false],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2, y: 523},
    },
  ]
}

// const testAnalysisTable = (params: PCRTestResultEmailDTO): Content => {
//   if (params.testType === TestTypes.ExpressPCR) {
//     return []
//   }

//   const groupedAnalysis = groupByChannel(params.resultAnalysis)

//   return [
//     {
//       text: 'Detailed Test Analysis Data:',
//       margin: [0, 15, 0, 0],
//       lineHeight: 1.2,
//     },
//     {
//       columns: [
//         {
//           layout: 'resultTable',
//           width: 58,
//           table: {
//             widths: [52],
//             heights: [46],
//             body: [['Result']],
//           },
//         },
//         {
//           stack: [
//             {
//               layout: 'resultTable',
//               width: 350,
//               table: {
//                 widths: [...groupedAnalysis.map((channel) => channel.groups.length * 44)],
//                 body: [[...groupedAnalysis.map((channel) => channel.channelName)]],
//               },
//               margin: [3, 0, 0, 0],
//               alignment: 'center',
//             },
//             {
//               layout: 'resultTable',
//               width: 350,
//               table: {
//                 widths: [40, 39, 40, 39, 40, 39, 40, 39],
//                 body: [
//                   [
//                     ...groupedAnalysis
//                       .map((channel) => channel.groups.map((group) => group.label))
//                       .flat(),
//                   ],
//                 ],
//               },
//               margin: [3, -1, 0, 0],
//               alignment: 'center',
//             },
//           ],
//         },
//       ],
//       margin: [0, 15, 0, 0],
//       fontSize: 10,
//     },
//     {
//       layout: 'resultTable',
//       table: {
//         widths: [52, 40, 39, 40, 39, 40, 39, 40, 39],
//         body: [
//           [
//             {
//               text: resultText(params.result),
//               fillColor: getFillColorForResultsCell(params.result),
//               color: '#FFFFFF',
//             },
//             ...groupedAnalysis
//               .map((channel) =>
//                 channel.groups.map((group) => ({
//                   text: group.value,
//                   alignment: 'center',
//                 })),
//               )
//               .flat(),
//           ],
//         ],
//       },
//       margin: [0, -1, 0, 0],
//       fontSize: 10,
//     },
//   ]
// }

const resultAnalysis = (analysis: Spec[], keyName): Spec => {
  return analysis.find((analys) => {
    analys.label === keyName
  })
}

const importantInfo = (): Content => {
  const smallFontSize = 19
  const textInfo: Content = [
    {
      text: 'Important Information',
      font: 'SFPro',
      bold: true,
      fontSize: 30,
      style: ['black'],
    },
    {
      text: '\n The result of your test was ',
      lineHeight: 1.1,
      bold: false,
      fontSize: smallFontSize + 5,
      style: ['black'],
      font: 'SFPro',
    },
    {
      text: 'NEGATIVE ',
      lineHeight: 1.1,
      bold: true,
      fontSize: smallFontSize + 5,
      style: ['black'],
      font: 'SFPro',
    },
    {
      text:
        'Your results do not detect SARS-CoV-2, the virus that causes coronavirus \n' +
        'disease (also called COVID-19), a respiratory illness. A \n' +
        'negative test means that the virus was not present in the\n' +
        'sample we collected. Your results suggest you were \n' +
        'negative at the time of testing.\n\n' +
        'Although the possibility is low, a false negative result \n should be' +
        'considered if you have had recent exposure to \n the virus along with' +
        'symptoms consistent with COVID-19.\n\n' +
        'If you are the patron receiving the test and require further\n' +
        'information, please visit the City of Toronto Public Health:\n' +
        'https://www.toronto.ca/home/covid-19\n\n' +
        'If you have further questions or concerns, you can contact\n' +
        'FH Health at info@fhhealth.ca or (416) 484-0042.',
      font: 'SFPro',
      lineHeight: 1.1,
      bold: false,
      fontSize: smallFontSize + 5,
      style: ['black'],
    },
  ]

  return {
    table: {
      headerRows: 1,
      widths: [pdfWidth / 2],
      body: [
        [
          {
            text: textInfo,
            lineHeight: 1.5,
            border: [false, false, false, false],
          },
        ],
      ],
    },
    absolutePosition: {x: 30, y: 1224 / 2 + 250},
    margin: [0, 0, 0, 50],
  }
}

const testAnalysisTable = (params: RapidAntigenEmailResultDTO): Content => {
  let data = []
  if (params.testType != TestTypes.PCR) {
    return
  }
  if (params.result == ResultTypes.Positive) {
    data.push(
      {
        layout: 'infoTable',
        table: {
          widths: [70, 400],
          headerRows: 0,
          body: [
            [
              {
                text: 'FAM',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: 'Positive',
                bold: false,
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
                fillColor: '#FF0000',
                color: '#FFFFFF',
              },
            ],
          ],
        },
        absolutePosition: {x: 1224 / 2 + 40, y: 1224 / 2 + 400},
        margin: [20, 50, 0, 200],
      },
      {
        layout: 'infoTable',
        table: {
          widths: [70, 400],
          headerRows: 0,
          body: [
            [
              {
                text: 'CAL RED 61',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: 'Positive',
                bold: false,
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
                fillColor: '#FF0000',
                color: '#FFFFFF',
              },
            ],
          ],
        },
        absolutePosition: {x: 1224 / 2 + 40, y: 1224 / 2 + 500},
        margin: [20, 50, 0, 200],
      },
    )
  } else if (params.result == ResultTypes.Negative) {
    data.push(
      {
        layout: 'infoTable',
        table: {
          widths: [70, 70, 330],
          headerRows: 0,
          body: [
            [
              {
                text: 'IgG',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: resultAnalysis(params.resultAnalysis, 'IgG')?.value || 'N/A',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: 'Negative',
                bold: false,
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
                fillColor: '#008000',
                color: '#FFFFFF',
              },
            ],
          ],
        },
        absolutePosition: {x: 1224 / 2 + 40, y: 1224 / 2 + 400},
        margin: [20, 50, 0, 200],
      },
      {
        layout: 'infoTable',
        table: {
          widths: [70, 70, 330],
          headerRows: 0,
          body: [
            [
              {
                text: 'IgM',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: resultAnalysis(params.resultAnalysis, 'IgM')?.value || 'N/A',
                bold: false,
                style: ['black'],
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
              },
              {
                text: 'Negative',
                bold: false,
                fontSize: 30,
                border: [true, true, true, true],
                margin: [0, 10, 0, 10],
                alignment: 'center',
                fillColor: '#008000',
                color: '#FFFFFF',
              },
            ],
          ],
        },
        absolutePosition: {x: 1224 / 2 + 40, y: 1224 / 2 + 500},
        margin: [20, 50, 0, 200],
      },
    )
  } else {
    return
  }
  return data
}

const legalNotice = (): Content => {
  return {
    columns: [
      {
        stack: [
          {
            text: 'Legal Notice\n',
            bold: false,
            fontSize: 30,
            font: 'SFPro',
            style: ['black'],
            margin: [30, 10, 0, 10],
          },
          {
            text:
              'You have consented to the collection, use or disclosure of your personal health information\n' +
              'by FH Health and to receiving electronic communications from FH Health in accordance with\n' +
              'FH Health’s Privacy Policy (https://www.fhhealth.ca/privacy-policy) and Terms of Service\n' +
              '(https://www.fhhealth.ca/terms-of-service). The information contained in this report is confidential\n' +
              'and includes information protected by Ontario privacy laws. You are solely responsible for protecting\n' +
              'the confidentiality and security of the information in this report and agree to release, indenify and hold\n' +
              'harmless FH Health from and against any claim or liability associated with the loss,\n' +
              'theft or breach of privacy or security involving your personal information.',
            bold: false,
            style: ['black'],
            font: 'SFPro',
            fontSize: smallFontSize - 5,
            margin: [30, 0, 0, 10],
          },
        ],
        alignment: 'left',
        width: '100%',
        absolutePosition: {x: 0, y: 1224 / 2 + 1000},
      },
    ],
    margin: [30, 0, 0, topMargin],
  }
}

export default {
  clientInformation,
  importantInfo,
  legalNotice,
  companyInfoHeader,
  testAnalysisTable,
  tableLayouts,
}
