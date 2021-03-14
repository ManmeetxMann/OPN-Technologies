import {GroupedSpecs} from '../models/pcr-test-results'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

export type Spec = {
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

const validations = [
  {
    column: 'hexCt',
    validate: (hexCt: string | boolean | Date): void => {
      if (hexCt instanceof Date || Number(hexCt) > 40) {
        throw new BadRequestException(`Invalid Hex Ct. Should be less than 40`)
      }
    },
  },
]

export const validateAnalysis = (specs: Spec[]): void => {
  specs.forEach((spec) => {
    const validator = validations.find(({column}) => column === spec.label)
    if (validator) {
      validator.validate(spec.value)
    }
  })
}

const channelLabelMapping = new Map([
  ['famEGene', 'E Gene'],
  ['famCt', 'C(t)'],
  ['calRed61RdRpGene', 'RdRP gene'],
  ['calRed61Ct', 'C(t)'],
  ['hexIC', 'IC'],
  ['hexCt', 'C(t)'],
  ['quasar670NGene', 'N gene'],
  ['quasar670Ct', 'C(t)'],
])

export const groupByChannel = (specs: Spec[]): GroupedSpecs[] =>
  groups
    .map((group) => ({
      channelName: group.name,
      description: group.description,
      groups: specs
        .filter((spec) => group.columns.includes(spec.label))
        .map((spec) => ({
          ...spec,
          label: channelLabelMapping.get(spec.label),
        })),
    }))
    .filter((group) => group.groups.length)
