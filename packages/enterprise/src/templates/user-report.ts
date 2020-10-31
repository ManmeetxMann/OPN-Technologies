import {Content, TableLayouts} from '../../../common/src/service/reports/pdf-types'

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

const getHeaderTable = (
  generationDate: string,
  userName: string,
  guardianName: string | null,
  orgName: string,
  dateRange: string,
  groupName: string,
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

const generate = (params: Params): {content: Content[]; tableLayouts: TableLayouts} => ({
  content: [
    getHeaderTable(
      params.generationDate,
      params.userName,
      params.guardianName,
      params.organizationName,
      params.reportDate,
      params.userGroup,
    ),
    ...getAttestationTables(params.attestations),
    getLocationsTable(params.locations),
    getContactTable('Potential Exposures', params.exposures),
    getContactTable('Potential Users Exposed', params.traces),
  ],
  tableLayouts,
})

export default generate
