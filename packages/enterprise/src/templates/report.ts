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

const tableLayouts = {
  mainTable: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#CCCCCC',
    vLineColor: () => '#CCCCCC',
    paddingTop: () => 5,
    paddingBottom: () => 5,
  },
}

const getAccessesTable = (accesses: Access[]): unknown => ({
  layout: 'mainTable',
  table: {
    headerRows: 0,
    widths: [183, 240],
    body: [...accesses.map(({user, status}) => [`${user.firstName} ${user.lastName}`, status])],
  },

  margin: [14, 14, 14, 14],
})
const getContent = (params: Params): unknown => ({
  content: [getAccessesTable(params.accesses)],
  tableLayouts,
})

export default getContent
