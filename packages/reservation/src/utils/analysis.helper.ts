import {AnalyseTypes, GroupedSpecs, Spec} from '../models/pcr-test-results'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

const groups = [
  {
    name: 'FAM',
    description: 'lorem',
    columns: ['famCt', 'famEGene', 'ORF1abCt', 'ORF1ab'],
  },
  {
    name: 'CAL RED 61',
    description: 'lorem',
    columns: ['calRedCt', 'calRedRdrp'],
  },
  {
    name: 'QUASAR 670',
    description: 'lorem',
    columns: ['quasarCt', 'quasarNgene'],
  },
  {
    name: 'HEX',
    description: 'lorem',
    columns: ['hexCt', 'hexIc'],
  },
  {
    name: 'VIC',
    description: 'lorem',
    columns: ['NGeneCt', 'NGene'],
  },
  {
    name: 'ABY',
    description: 'lorem',
    columns: ['SGeneCt', 'SGene'],
  },
  {
    name: 'Jun',
    description: 'lorem',
    columns: ['MS2Ct', 'MS2'],
  },
  {
    name: 'Antigen',
    description: 'lorem',
    columns: ['IgAResult', 'IgGResult', 'IgMResult', 'IgG', 'IgM'],
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

export const normalizeAnalysis = (specs: Spec[]): Spec[] => {
  return specs.map((spec) => {
    if (typeof spec.value === 'string') {
      if (spec.value.toUpperCase() === AnalyseTypes.POSITIVE) {
        return {
          label: spec.label,
          value: '+',
        }
      }
      if (spec.value.toUpperCase() === AnalyseTypes.NEGATIVE) {
        return {
          label: spec.label,
          value: '-',
        }
      }
    }
    return spec
  })
}

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
  ['calRedRdrp', 'RdRP gene'],
  ['calRedCt', 'C(t)'],
  ['hexIc', 'IC'],
  ['hexCt', 'C(t)'],
  ['quasarNgene', 'N gene'],
  ['quasarCt', 'C(t)'],

  ['ORF1abCt', 'C(t)'],
  ['SGeneCt', 'C(t)'],
  ['NGeneCt', 'C(t)'],
  ['MS2Ct', 'C(t)'],
  ['ORF1ab', 'ORF1ab'],
  ['NGene', 'N gene'],
  ['SGene', 'S gene'],
  ['MS2', 'MS2'],

  ['IgAResult', 'IgAResult'],
  ['IgGResult', 'IgGResult'],
  ['IgMResult', 'IgMResult'],
  ['IgG', 'IgG'],
  ['IgM', 'IgM'],
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
