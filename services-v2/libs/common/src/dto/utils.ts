export const assignWithoutUndefined = <T>(source: unknown, target: T): T => {
  const notUndefinedSource = Object.entries(source)
    .filter(([_k, v]) => v != undefined)
    .reduce((resultingObject, [k, v]) => ({...resultingObject, [k]: v}), {})

  return Object.assign(target, notUndefinedSource)
}
