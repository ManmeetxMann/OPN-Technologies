import {TableLayouts, Content} from '../../../../common/src/service/reports/pdf-types'
import {Config} from '../../../../common/src/utils/config'
import {RapidAntigenEmailResultDTO} from '../../models/rapid-antigen-test-results'
import {ResultTypes, TestTypes} from '../../models/appointment'
import path from 'path'

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
              margin: [10, 5, 0, 30],
            },
            {
              text: '',
              border: [false, false, true, false],
              margin: [10, 5, 0, 30],
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
            fontSize: smallFontSize - 10,
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

const importantInfo = (params: RapidAntigenEmailResultDTO): Content => {
  const smallFontSize = 19
  const data = []
  if (params.result == ResultTypes.Positive) {
    data.push(
      {
        text:
          'The result of your test was POSITIVE for the direct and qualitative detection of SARS-CoV-2\n' +
          'viral nucleoprotein antigens known to cause coronavirus disease (also called COVID-19), a \n' +
          'respiratory illness. Antigen from nasal secretions of infected individuals is generally\n' +
          'detectable within 6 days of symptom onset, during the acute phase of the infection. A \n' +
          'positive result indicates the presence of viral antigens, but clinical correlation with your \n' +
          'history and confirmatory diagnostic PCR testing is necessary to determine infection status.\n\n' +
          'FAQ\n' +
          'Q: Should I now undergo a confirmatory PCR test?\n' +
          'A: Yes. It is currently the recommendation by Toronto Public Health officials that all point-of-care\n\n' +
          '(POC) ‘rapid tests’ are considered as providing a ‘presumptive’ status. This type of test is \n' +
          'considered a screening tool only, and not ‘confirmatory’, or diagnostic. As such all POC \n' +
          'testing is subject to confirmatory molecular assay (PCR) testing\n\n' +
          'If you wish to undergo confirmatory testing, FH Health uses only Health Canada approved\n' +
          'RT-PRC testing. Our test is the gold standard RT-PCR test performed on the Allplex\n' +
          'Seegene platform, considered one of the best in the industry, and the same platform used by\n ' +
          'many Public Health labs.\n\n' +
          'Meanwhile, even with the diagnosis as a ‘presumptive positive’ you should follow the Public\n' +
          'Health guidelines for ‘Have COVID-19’, which can be found here:\n',
        font: 'SFPro',
        lineHeight: 1.1,
        bold: false,
        fontSize: smallFontSize - 4,
        style: ['black'],
      },
      {
        text: 'https://www.toronto.ca/home/covid-19/covid-19-what-\nyou-should-do/covid-19-havesymptoms-or-been-exposed/\n\n',
        font: 'SFPro',
        lineHeight: 1.1,
        bold: false,
        fontSize: smallFontSize - 4,
        style: ['black'],
      },
      {
        text: 'If you have further questions or concerns, you can contact FH Health at \ninfo@fhhealth.com or (416) 484-0042.\n',
        font: 'SFPro',
        lineHeight: 1.1,
        bold: false,
        fontSize: smallFontSize - 4,
        style: ['black'],
      },
    )
  } else if (params.result == ResultTypes.Negative) {
    data.push({
      text:
        'The result of your test was NEGATIVE for the direct and qualitative detection of \n' +
        'SARS-CoV-2 viral nucleoprotein antigens known to cause coronavirus disease (also called \n' +
        'COVID-19), a respiratory illness. Antigen from nasal secretions of infected individuals is \n' +
        'generally detectable within 6 days of symptom onset, during the acute phase of the infection. \n' +
        'A negative result should be treated as presumptive, and does not rule out SARS-CoV-2 \n' +
        'infection and should not be used as the sole basis for treatment of patient management \n\n' +
        'decisions, including infection control decisions. Negative results should be considered in the \n' +
        'context of a patient’s recent exposures, history, and the presence of clinical signs and \n' +
        'symptoms consistent with COVID-19.\n\n' +
        'FAQ\n' +
        'Q: Should I now undergo a confirmatory PCR test?\n' +
        'A: If you are feeling completely fine, exhibiting no symptoms, and have no identified risk \n' +
        'exposure as per above, then you do not need to undergo confirmatory molecular assay \n' +
        '(PCR) testing at this time. Be mindful that all point-of-care (POC) ‘rapid tests’ are considered \n' +
        'as providing a ‘presumptive’ status.\n\n' +
        'This type of test is considered a screening tool only, and not ‘confirmatory’, or diagnostic. If \n' +
        'you wish to undergo confirmatory testing, FH Health uses only Health Canada approved RT\n' +
        'PRC testing. Our test is the gold standard RT-PCR test performed on the Allplex Seegene\n' +
        'platform, considered one of the best in the industry, and the same platform used by many \n' +
        'Public Health labs.\n\n' +
        'Meanwhile, even with the diagnosis as a ‘presumptive negative’ you should continue to\n' +
        'follow the prevailing Public Health guidelines for COVID-19. \n' +
        'If you require further information, please visit the City of Toronto Public Health: \n' +
        'https://www.toronto.ca/home/covid-19\n' +
        'If you have further questions or concerns, you can contact FH Health at info@fhhealth.com  \n' +
        'or (416) 484-0042.\n\n',
      font: 'SFPro',
      lineHeight: 1.1,
      bold: false,
      fontSize: smallFontSize - 4,
      style: ['black'],
    })
  }
  const textInfo: Content = [
    {
      text: 'Important Information\n',
      font: 'SFPro',
      bold: true,
      fontSize: 30,
      style: ['black'],
    },
    ...data,
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
  return 'Inconclusive'
}

const testType = (result: TestTypes): string => {
  console.log('type: ' + result)
  if (
    result === TestTypes.RapidAntigen ||
    result === TestTypes.RapidAntigenAtHome ||
    result === TestTypes.EmergencyRapidAntigen
  )
    return 'Rapid Antigen'
  return 'Inconclusive'
}

const companyInfoHeader = (params: RapidAntigenEmailResultDTO): Content => {
  return [
    {
      image: path.join(
        __dirname,
        '../../static/Banner/' + resultText(params.result) + '_Banner@3x.png',
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
              image: path.join(__dirname, '../../static/FH_Logo/FH_Health_Logos_Hor_White.png'),
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

export default {
  doctorSignature,
  clientInformation,
  importantInfo,
  legalNotice,
  companyInfoHeader,
  placeQRCode,
  tableLayouts,
}
