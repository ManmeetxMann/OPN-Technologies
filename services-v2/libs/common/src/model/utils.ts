import {IsNull, Like, Not, Raw} from 'typeorm'
import {FindOperator} from 'typeorm/find-options/FindOperator'

export const isNotNull = (): FindOperator<unknown> => Not(IsNull())

export const like = (keyword: string): FindOperator<unknown> => Like(`%${keyword ?? ''}%`)

export const likeIgnoreCase = (keyword: string): FindOperator<unknown> =>
  Raw((alias) => `LOWER(${alias}) Like '%${keyword?.toLowerCase() ?? ''}%'`)

export type QueryMatcher<T> = Record<keyof Partial<T> | string, FindOperator<unknown> | unknown>
