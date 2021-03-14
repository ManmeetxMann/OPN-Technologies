import { GroupedSpecs, GroupLabel, Spec, SpecLabel } from "../models/pcr-test-results";
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

const groups = [
  {
    name: 'FAM',
    description: 'lorem',
    columns: ['famCt', 'famEGene', 'ORF1ab Ct', 'ORF1ab'],
  },
  {
    name: 'CAL RED 61',
    description: 'lorem',
    columns: ['hexCt', 'hexIC'],
  },
  {
    name: 'HEX',
    description: 'lorem',
    columns: ['calRed61Ct', 'calRed61RdRpGene'],
  },
  {
    name: 'QUASAR 670',
    description: 'lorem',
    columns: ['quasar670Ct', 'quasar670NGene'],
  },
  {
    name: 'VIC',
    description: 'lorem',
    columns: ['N gene Ct', 'N gene'],
  },
  {
    name: 'ABY',
    description: 'lorem',
    columns: ['S gene Ct', 'S gene'],
  },
  {
    name: 'Jun',
    description: 'lorem',
    columns: ['MS2 Ct', 'MS2'],
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
  [SpecLabel.famEGene, 'E Gene'],
  [SpecLabel.famCt, 'C(t)'],
  [SpecLabel.calRed61RdRpGene, 'RdRP gene'],
  [SpecLabel.calRed61Ct, 'C(t)'],
  [SpecLabel.hexIC, 'IC'],
  [SpecLabel.hexCt, 'C(t)'],
  [SpecLabel.quasar670NGene, 'N gene'],
  [SpecLabel.quasar670Ct, 'C(t)'],

  [SpecLabel.ORF1abCt, 'ORF1ab Ct'],
  [SpecLabel.SGeneCt, 'S gene Ct'],
  [SpecLabel.NGeneCt, 'N gene Ct'],
  [SpecLabel.MS2Ct, 'MS2 Ct'],
  [SpecLabel.ORF1ab, 'ORF1ab'],
  [SpecLabel.SGene, 'S gene'],
  [SpecLabel.NGene, 'N gene'],
  [SpecLabel.MS2, 'MS2'],

  [SpecLabel.profileR1, 'profileR1'],
  [SpecLabel.profileR2, 'profileR2'],
  [SpecLabel.profileR3, 'profileR3'],
  [SpecLabel.IgA, 'IgA'],
  [SpecLabel.IgG, 'IgG'],
  [SpecLabel.IgM, 'IgM'],
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
