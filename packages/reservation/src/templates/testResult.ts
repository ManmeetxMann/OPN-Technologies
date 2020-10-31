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
  const isPositive = params.result === ResultTypes.Positive

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
              'Client Name ',
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
            ['Nurse / Physician', params.registeredNursePractitioner],
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
              'The screening test conducted was ',
              {
                text: 'POSITIVE',
                bold: true,
              },
              {
                text:
                  ' for SARS-CoV-2 . This result, along with \n the patron’s name and phone number have been forwarded to Public Health as per requirement by law, and the patron may be contacted. If you are the patron receiving   the test, you should now follow the Public Health guidelines, which can be found here: ',
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
            ]
          : [
              'The result of the test was ',
              {
                text: 'NEGATIVE.',
                bold: true,
              },
              {
                text:
                  '\n\nIf you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: https://www.toronto.ca/home/covid-19',
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