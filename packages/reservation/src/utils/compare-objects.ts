import {isEqual} from 'lodash'

export const findDifference = <T>(
  current: Partial<T>,
  incoming: Partial<T>,
  skip: string[],
): {
  currentData: Partial<T>
  newData: Partial<T>
} => {
  const currentData = {}
  const newData = {}

  Object.keys(incoming).map((key) => {
    if (!skip.includes(key) && !isEqual(incoming[key], current[key])) {
      currentData[key] = current[key] ?? null
      newData[key] = incoming[key] ?? null
    }
  })

  return {currentData, newData}
}
