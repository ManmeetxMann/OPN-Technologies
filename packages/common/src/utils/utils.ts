export const encodeQueryParams = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .filter(([_key, value]) => !!value)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${key}=${value.map(encodeURIComponent).join(`&${key}=`)}`
        : [key, value].map(encodeURIComponent).join('='),
    )
    .join('&')

const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export const isEisEmailmail = (email: string): boolean => {
  return emailRegex.test(email)
}

export const titleCase = (str: string): string => {
  return str.replace(/\w\S*/g, function (txt: string) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

export const isValidDate = (date: string): boolean => !isNaN(Date.parse(date))
