import {Content, TableLayouts} from '../../../common/src/service/reports/pdf-types'
import {TemperatureDBModel} from '../../../reservation/src/models/temperature'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {toDateFormat} from '../../../common/src/utils/times'
import * as _ from 'lodash'

type Contact = {
  firstName: string
  lastName: string
  groupName: string
  start: string
  end: string
}

type LocationAccess = {
  name: string
  time: string
  action: string
}
type Attestation = {
  responses: {
    question: string
    response: string
  }[]
  time: string
  status: string
}

type Params = {
  generationDate: string
  userName: string
  guardianName: string | null
  organizationName: string
  reportDate: string
  userGroup: string
  locations: LocationAccess[]
  attestations: Attestation[]
  exposures: Contact[]
  traces: Contact[]
  passportStatus: string
  temperatureChecks: TemperatureDBModel[]
}

const tableLayouts: TableLayouts = {
  mainTable: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#CCCCCC',
    vLineColor: () => '#CCCCCC',
    paddingTop: () => 5,
    paddingBottom: () => 5,
  },
}

const passportStatusName = (status: string): string => _.capitalize(status.split('_').join(' '))

const getHeaderTable = (
  generationDate: string,
  userName: string,
  guardianName: string | null,
  orgName: string,
  dateRange: string,
  groupName: string,
  passportStatus: string,
): Content => ({
  layout: 'mainTable',
  table: {
    headerRows: 1,
    widths: [183, 240],
    body: [
      ['OPN Report', {}],
      ['Date of Report Generation', generationDate],
      ['Name of User', userName],
      guardianName ? ['Name of Guardian', guardianName] : null,
      ['Organization Name', orgName],
      ['Date of report', dateRange],
      ['User Group', groupName],
      ['Passport Status', passportStatusName(passportStatus)],
    ].filter((notNull) => notNull),
  },
  margin: [14, 14, 14, 14],
})

const getLocationsTable = (locations: LocationAccess[]): Content => ({
  layout: 'mainTable',
  table: {
    headerRows: 1,
    widths: [183, 190, 50],
    body: [
      [locations.length ? 'Locations Visited' : ' No Locations Visited', {}, {}],
      ...locations.map(({name, time, action}) => [name, time, action]),
    ],
  },

  margin: [14, 14, 14, 14],
})

const getAttestationTables = (attestations: Attestation[]): Content[] =>
  attestations.map((attestation) => ({
    layout: 'mainTable',
    table: {
      headerRows: 1,
      widths: [183, 240],
      body: [
        ['Attestation Report', {}],
        ['Time of Attestation', attestation.time],
        ['Status', passportStatusName(attestation.status)],
        ...attestation.responses.map(({question, response}) => [question, response]),
      ],
    },
    margin: [14, 14, 14, 14],
  }))

const getContactTable = (title: string, contacts: Contact[]): Content => ({
  layout: 'mainTable',
  table: {
    headerRows: 1,
    widths: [183, 240],
    body: [
      [title, {}],
      ...contacts.map(({firstName, lastName, groupName, start, end}) => [
        `${firstName} ${lastName} (${groupName})`,
        `${start} - ${end}`,
      ]),
    ],
  },

  margin: [14, 14, 14, 14],
})

const getTemperatureTables = (temperatureChecks: TemperatureDBModel[]): Content[] =>
  temperatureChecks.map((temperature) => ({
    layout: 'mainTable',
    table: {
      headerRows: 1,
      widths: [183, 240],
      body: [
        ['Temperature Check Report', {}],
        ['Temperature', temperature.temperature],
        ['Time of Check', toDateFormat(safeTimestamp(temperature.timestamps.createdAt))],
        ['Status', _.capitalize(temperature.status)],
      ],
    },
    margin: [14, 14, 14, 14],
  }))

const generate = (params: Params): {content: Content[]; tableLayouts: TableLayouts} => ({
  content: [
    getHeaderTable(
      params.generationDate,
      params.userName,
      params.guardianName,
      params.organizationName,
      params.reportDate,
      params.userGroup,
      params.passportStatus,
    ),
    ...getTemperatureTables(params.temperatureChecks),
    ...getAttestationTables(params.attestations),
    getLocationsTable(params.locations),
    getContactTable('Potential Exposures', params.exposures),
    getContactTable('Potential Users Exposed', params.traces),
  ],
  tableLayouts,
})

export default generate
