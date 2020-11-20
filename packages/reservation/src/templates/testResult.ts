import moment from 'moment-timezone'
import path from 'path'

import {ResultTypes, TestResultsDTOForEmail} from '../models/appoinment'
import {TableLayouts, Content} from '../../../common/src/service/reports/pdf-types'

import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'

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
const generate = (
  params: TestResultsDTOForEmail,
): {content: Content[]; tableLayouts: TableLayouts} => {
  const timeZone = Config.get('DEFAULT_TIME_ZONE')
  const createTime = moment(now()).tz(timeZone).format('LL')
  const isPositive =
    params.result === ResultTypes.Positive || params.result === ResultTypes.Detected
  const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')

  return {
    tableLayouts,
    content: [
      {
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
      },
      {
        text: createTime,
        margin: [0, 30, 0, 0],
        style: ['gray-text'],
      },
      {
        text:
          'The following client completed a SARS-CoV-2 screening test at FH Health Screening Test Centre:',
        margin: [0, isPositive ? 20 : 33, 0, 0],
        style: ['gray-text'],
        lineHeight: 1.2,
      },
      {
        layout: 'mainTable',
        table: {
          headerRows: 1,
          widths: [183, 240],
          body: [
            [
              'Patient Name ',
              {
                text: `${params.firstName} ${params.lastName}`,
                bold: true,
              },
            ],
            ['Date of Birth', params.dateOfBirth],
            ['Mobile Number', params.phone],
            [
              'Date of Test (Sample Collection)',
              `${params.dateOfAppointment} at ${params.timeOfAppointment}`,
            ],
            ['Date of Result', createTime],
            ['Ordering Physician', requisitionDoctor],
            ['Nurse', params.registeredNursePractitioner],
            ['Test', 'RT-PCR (Reverse Transcription Polymerase Chain Reaction)'],
            [
              'Equipment approved by \n Health Canada',
              'Allplex 2019-nCoV Assay manufactured by Seegene, Inc.',
            ],
          ],
        },

        margin: [0, isPositive ? 0 : 18, 0, 0],
      },
      {
        text: isPositive
          ? [
              'The result of your test was ',
              {
                text: 'POSITIVE',
                bold: true,
              },
              {
                text:
                  " for the presence of SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness.  A positive test means that the virus was likely present in the sample you provided. The probability of a false positive is low.\n\n This result, along with your name and contact information have been forwarded to Public Health as per requirement by law, and you may be contacted. You should follow the Public Health guidelines for '‘Have COVID-19’', which can be found here: ",
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
              {
                text:
                  '\n\nIf you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 482-0042.\n\n',
              },
            ]
          : [
              'The result of your test was ',
              {
                text: 'NEGATIVE.',
                bold: true,
              },
              {
                text:
                  ' Your results do not detect SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness.  A negative test means that the virus was not present in the sample you provided. Your results suggest you were negative at the time of testing. *\n\n* Although the possibility is low, a false negative result should be considered if you have had recent exposure to the virus along with symptoms consistent with COVID-19.\n\nIf you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: https://www.toronto.ca/home/covid-19 \n\nIf you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 482-0042.',
              },
            ],
        margin: [0, isPositive ? 20 : 30, 0, 0],
        lineHeight: 1.5,
      },
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
                text: `${isPositive ? '2019-nCoV Detected' : 'NEGATIVE'}`,
                fillColor: isPositive ? '#FF0000' : '#6AA84F',
                color: '#FFFFFF',
              },
              {
                text: params.famEGene,
                alignment: 'center',
              },
              {
                text: params.famCt,
                alignment: 'center',
              },
              {
                text: params.calRed61RdRpGene,
                alignment: 'center',
              },
              {
                text: params.calRed61Ct,
                alignment: 'center',
              },
              {
                text: params.quasar670NGene,
                alignment: 'center',
              },
              {
                text: params.quasar670Ct,
                alignment: 'center',
              },
              {
                text: params.hexIC,
                alignment: 'center',
              },
              {
                text: params.hexCt,
                alignment: 'center',
              },
            ],
          ],
        },

        margin: [0, -1, 0, 0],
        fontSize: 10,
      },
      {
        text:
          'This document contains personal identifiable information that must be treated confidentially. Any unauthorized use or disclosure is prohibited.',
        style: ['black', 'footer'],
        margin: [0, isPositive ? 50 : 60, 0, 0],
      },
    ],
  }
}
export default generate
