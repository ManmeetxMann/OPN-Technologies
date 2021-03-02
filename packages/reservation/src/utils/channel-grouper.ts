import {GroupedSpecs} from '../models/pcr-test-results'

type Spec = {
  label: string
  value: string | boolean | Date
}

const groups = [
  {
    name: 'FAM',
    description: 'lorem',
    columns: ['famCt', 'famEGene'],
  },
  {
    name: 'HEX',
    description: 'lorem',
    columns: ['hexCt', 'hexIC'],
  },
  {
    name: 'calRed',
    description: 'lorem',
    columns: ['calRed61Ct', 'calRed61RdRpGene'],
  },
  {
    name: 'quasar',
    description: 'lorem',
    columns: ['quasar670Ct', 'quasar670NGene'],
  },
  {
    name: 'other',
    description: 'lorem',
    columns: ['comments'],
  },
]

export const groupByChannel = (specs: Spec[]): GroupedSpecs[] =>
  groups
    .map((group) => ({
      channelName: group.name,
      description: group.description,
      groups: specs.filter((spec) => group.columns.includes(spec.label)),
    }))
    .filter((group) => group.groups.length)
