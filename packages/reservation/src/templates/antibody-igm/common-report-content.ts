import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {ResultTypes} from '../../models/appointment'
import path from 'path'
import {Spec} from '../../models/pcr-test-results'
import {PCRTestResultEmailDTO} from '../../models/pcr-test-results'

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
const smallFontSize = 23 - 5
const smallFontSizeHeader = smallFontSize - 5
const pdfWidth = 1224
const pdfHeight = 1816
const bigFontSize = 55

const clientInformation = (params: PCRTestResultEmailDTO, resultDate: string): Content => {
  const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')

  const lab = params.lab.displayNameOnReport ? params.lab.name : 'N/A'
  const testingLabString = 'TESTING LAB ' ? params.lab.name : ''

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
              text: params.firstName || 'N/A',
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
              text: params.lastName || 'N/A',
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
              text: params.country || 'N/A',
              bold: true,
              style: ['black'],
              fontSize: smallFontSize,
              font: 'PTSerif',
              alignment: 'left',
              border: [true, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: params.phone || 'N/A',
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
              text: params.travelID || 'N/A',
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
              text: params.registeredNursePractitioner || 'N/A',
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
              text: params.locationName || 'N/A',
              alignment: 'left',
              bold: true,
              style: ['black'],
              font: 'PTSerif',
              fontSize: smallFontSize,
              border: [false, false, false, false],
              margin: [10, 5, 0, 0],
            },
            {
              text: params.locationAddress || 'N/A',
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
              text: testingLabString,
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
              text: lab,
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

const doctorSignature = (): Content => {
  return {
    columns: [
      {
        image: path.join(__dirname, '../../static/images/Peter-Blecher_Signature.png'),
        absolutePosition: {x: 50, y: (pdfHeight * 3) / 4 + 140},
        opacity: 0.9,
        margin: [0, 0, 0, 20],
        width: 200,
        height: 200 / 3,
      },
      {
        text: 'Dr. Peter Blecher \n FH Health Physician',
        absolutePosition: {x: 325, y: (pdfHeight * 3) / 4 + 140},
        bold: true,
        color: '#000000',
        font: 'PTSerif',
        fontSize: 20,
        margin: [30, 0, 0, 10],
      },
    ],
  }
}

const legalNotice = (): Content => {
  return {
    columns: [
      {
        stack: [
          {
            text: 'Legal Notice\n',
            font: 'SFPro',
            bold: true,
            fontSize: 30,
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
  const smallFontSize = 12
  const textInfo: Content = [
    {
      text: 'Important Information',
      font: 'SFPro',
      bold: true,
      fontSize: 30,
      style: ['black'],
    },
    {
      text:
        ' \n\nSARS-Cov-2 total antibody assay detects IgM, IgG and IgA antibodies to nucleocapsid proteins of \n' +
        ' SARS-CoV-2 virus. A Positive result by this assay indicates recent or prior exposure to the virus. \n' +
        ' False positive results may occur with this assay due to cross reactivity from pre-existing \n' +
        ' antibodies or other possible causes. A negative or equivocal finding does not preclude acute \n' +
        ' infection. If acute infection is suspected, direct testing for SARS-CoV-2 is indicated. \n',
      lineHeight: 1.1,
      fontSize: smallFontSize,
      style: ['black'],
    },
    {
      text:
        ' \n\nAntibodies to SARS-CoV-2 are generally detectable in blood several days after infection, though\n' +
        ' the duration of time the antibodies are present post infection is not well characterized. It is\n ' +
        ' unknown how long antibodies to SARS-CoV-2 will remain present in the blood after infection\n ' +
        ' and it is not known if they confer immunity to infection.\n ' +
        ' The positive percent agreement in 51 serum specimens collected between 2-42 days post onset\n ' +
        ' of clinical symptoms compared to SARS-CoV-2 RT-PCR was 92.16% and negative percent\n ' +
        ' agreement is 99.56%.1 Another study reported a specificity and sensitivity of 97.4% and 94.9%\n ' +
        ' for total antibodies using the adapted cut-offs (= 0.8) with this assay. \n',
      lineHeight: 1.1,
      fontSize: smallFontSize,
      style: ['black'],
    },
    {
      text: 'References:',
      bold: true,
      fontSize: 23,
      style: ['black'],
    },
    {
      text:
        '\n\n1) Platelia SARS-CoV-2 Total Ab package insert, Bio-Rad Laboratories, Inc\n' +
        '2) Tré-Hardy M, Wilmet A, Beukinga I, Favresse J, Dogné JM, Douxfils J, Blairon L. Analytical and\n ' +
        ' clinical validation of an ELISA for specific SARS-CoV-2 IgG, IgA, and IgM antibodies. J Med Virol.\n' +
        ' 2021 Feb;93(2):803-811.',
      lineHeight: 1.1,
      style: ['black'],
    },
  ]

  return {
    table: {
      headerRows: 1,
      widths: [1224 / 2 - 30],
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
    absolutePosition: {x: 30, y: 1224 / 2 + 300},
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

const companyInfoHeader = (params: PCRTestResultEmailDTO): Content => {
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
                ' for SARS-COV-2 (VACCINATED)',
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
            'info@fhhealth.com\n\n' +
            'www.fhhealth.com',
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

const testAnalysisTable = (params: PCRTestResultEmailDTO): Content => {
  const data = []
  if (params.result == ResultTypes.Inconclusive) {
    data.push({
      layout: 'infoTable',
      table: {
        widths: [70, 70, 330],
        headerRows: 0,
        body: [
          [
            {
              text: 'Ratio',
              bold: false,
              style: ['black'],
              fontSize: 30,
              border: [true, true, true, true],
              margin: [0, 10, 0, 10],
              alignment: 'center',
            },
            {
              //replace with ratio
              text: resultAnalysis(params.resultAnalysis, 'IgM')?.value || 'N/A',
              bold: false,
              style: ['black'],
              fontSize: 30,
              border: [true, true, true, true],
              margin: [0, 10, 0, 10],
              alignment: 'center',
            },
            {
              text: 'Inconclusive',
              bold: false,
              fontSize: 30,
              border: [true, true, true, true],
              margin: [0, 10, 0, 10],
              alignment: 'center',
              fillColor: '#0000FF',
              color: '#FFFFFF',
            },
          ],
        ],
      },
      absolutePosition: {x: 1224 / 2 + 40, y: 1224 / 2 + 500},
      margin: [20, 50, 0, 200],
    })
  } else if (params.result == ResultTypes.Positive) {
    data.push({
      layout: 'infoTable',
      table: {
        widths: [70, 70, 330],
        headerRows: 0,
        body: [
          [
            {
              text: 'Ratio',
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
    })
  } else if (params.result == ResultTypes.Negative) {
    data.push({
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
    })
  } else {
    return
  }
  return data
}

const placeQRCode = (qrCode: Content): Content => {
  return {
    columns: [
      {
        stack: [qrCode],
        alignment: 'left',
        width: '100%',
        absolutePosition: {x: pdfWidth - 230, y: 1224 / 2 + 1000},
      },
      {
        text: 'Access Code',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 1000},
        bold: true,
        color: '#000000',
        fontSize: 30,
        font: 'SFPro',

        margin: [30, 0, 0, 10],
      },
      {
        text: 'Scan the QR Code to verify authenticity of the pass\n QR Code will expire 7 days after sample was taken\n\n',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 1040},
        bold: false,
        color: '#a1a1a1',
        font: 'SFPro',
        fontSize: 18,
        margin: [30, 0, 0, 10],
      },
      {
        text: 'Powered by',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 1120},
        bold: false,
        color: '#a1a1a1',
        fontSize: 18,
        font: 'SFPro',
        margin: [30, 0, 0, 10],
      },
      {
        text: 'FH HEALTHPASS',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 1150},
        bold: true,
        color: '#000000',
        fontSize: 35,
        font: 'SFPro',
        margin: [30, 0, 0, 10],
      },
    ],
    margin: [30, 0, 0, topMargin],
  }
}

const ReferenceIndexingInfo = (): Content => {
  return {
    columns: [
      {
        text: 'Reference Cut-off Index',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 880},
        bold: false,
        color: '#000000',
        font: 'SFPro',
        fontSize: 18,
        margin: [30, 0, 0, 10],
      },
      {
        text: '0.8 - < 1.0 = Indeterminate\n >= 1.0 = positive \n < 0.8 = Negative',
        absolutePosition: {x: pdfWidth / 2 + 30, y: 1224 / 2 + 905},
        bold: false,
        color: '#a1a1a1',
        font: 'SFPro',
        fontSize: 18,
        margin: [30, 0, 0, 10],
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
  doctorSignature,
  placeQRCode,
  ReferenceIndexingInfo,
}
