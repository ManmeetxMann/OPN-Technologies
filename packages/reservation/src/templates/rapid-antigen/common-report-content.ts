import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'
import {ResultTypes, TestTypes} from '../../models/appointment'
import path from 'path'
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

const leftMarginX = 30
const topMargin = 100
// const smallx2FontSize = 8
const smallFontSize = 23
const smallFontSizeHeader = smallFontSize - 5
const pdfWidth = 1224
const pdfHeight = 1816
const bigFontSize = 55

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
              margin: [10, 5, 0, 10],
            },
            {
              text: '',
              border: [false, false, true, false],
              margin: [10, 5, 0, 10],
            },
          ],
        ],
      },
      absolutePosition: {x: pdfWidth / 2 + 10, y: 73 + topMargin},
      margin: [20, 50, 0, 100 + topMargin],
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
      absolutePosition: {x: 0, y: pdfWidth / 2 + 195},
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
        heights: [pdfHeight / 7 + 20],
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
              text: 'COLLECTION METHOD',
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
              text: 'Rapid Antigen',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              alignment: 'left',
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: 'Nasal',
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
              text: 'TEST EQUIPMENT (HEALTH CANADA APPROVED)',
              bold: true,
              style: ['gray'],
              font: 'DMSans',
              fontSize: smallFontSizeHeader,
              alignment: 'left',
              border: [false, false, false, false],
              colSpan: 2,
              margin: [10, 15, 0, 0],
            },
            {},
          ],
          [
            {
              text: 'Allplex 2019-nCoV Assay, Seegene, Inc.',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              colSpan: 2,
              margin: [10, 5, 0, 30],
            },
            {},
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
              text: 'N/A',
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: 'N/A',
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
  ]
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
        'Your results do not detect \n' +
        'SARS-CoV-2, the virus that causes coronavirus disease (also called \n' +
        'COVID-19), a respiratory illness. A negative test means that the virus\n' +
        'was not present in the sample we collected. Your results suggest you\n' +
        'were negative at the time of testing.\n\n' +
        'Although the possibility is low, a false negative result should be \n' +
        'considered if you have had recent exposure to the virus along with\n' +
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
      widths: [1224],
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
    absolutePosition: {x: 30, y: 1224 / 2 + 200},
    margin: [0, 0, 0, 50],
  }
}

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
  if (
    result === TestTypes.RapidAntigen ||
    result === TestTypes.RapidAntigenAtHome ||
    result === TestTypes.EmergencyRapidAntigen
  )
    return 'Rapid Antigen'
  return 'Indeterminate'
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
                ' for SARS-COV-2 ( ' +
                testType(params.testType) +
                ' )',
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

const resultAnalysis = (analysis: Spec[], keyName): Spec => {
  return analysis.find((analys) => {
    analys.label === keyName
  })
}

const testAnalysisTable = (params: RapidAntigenEmailResultDTO): Content => {
  let data = []
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
                text: 'IgG',
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
                text: 'IgM',
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

export default {
  clientInformation,
  importantInfo,
  legalNotice,
  companyInfoHeader,
  testAnalysisTable,
  tableLayouts,
}
