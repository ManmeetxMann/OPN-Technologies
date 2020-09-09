export const flattern = <T>(data: T[][]): T[] =>
  data?.reduce((flatted, chunk) => [...flatted, ...(chunk ?? [])], [] as T[])
