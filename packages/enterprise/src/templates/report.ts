import {Content, TableLayouts} from '../../../common/src/service/reports/pdf-types'

type Access = {
  user: {
    firstName: string
    lastName: string
  }
  status: string
}

type Params = {
  accesses: Access[]
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

const getAccessesTable = (accesses: Access[]): Content => ({
  layout: 'mainTable',
  table: {
    headerRows: 0,
    widths: [183, 240],
    body: [...accesses.map(({user, status}) => [`${user.firstName} ${user.lastName}`, status])],
  },

  margin: [14, 14, 14, 14],
})
const generate = (params: Params): {content: Content[]; tableLayouts: TableLayouts} => ({
  content: [getAccessesTable(params.accesses)],
  tableLayouts,
})

export default generate
