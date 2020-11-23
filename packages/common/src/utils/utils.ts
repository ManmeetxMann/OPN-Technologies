export const encodeQueryParams = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .filter(([_key, value]) => !!value)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${key}=${value.map(encodeURIComponent).join(`&${key}=`)}`
        : [key, value].map(encodeURIComponent).join('='),
    )
    .join('&')

export const validateEmail = (email: string): boolean => {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}
