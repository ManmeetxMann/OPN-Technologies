export const encodeQueryParams = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .filter(([_key, value]) => !!value)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${key}=${value.map(encodeURIComponent).join(`&${key}=`)}`
        : [key, value].map(encodeURIComponent).join('='),
    )
    .join('&')
