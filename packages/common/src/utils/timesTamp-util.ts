// Must be required, otherwise brake when imported to v2
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment-timezone')

// some timestamps are invalid and the "day" part is actually
// the day of the year. This function accepts a (valid or invalid)
// timestamp and returns a valid timestamp
export const fixTimestamp = (raw: string): string => {
  if (!isNaN(new Date(raw).valueOf())) {
    // raw is parseable on its own, no need to correct
    return raw
  }
  console.warn(`Saw invalid date ${raw}`)
  const [datePart, timePart] = raw.split('T')
  const [year, month, dayOfYear] = datePart.split('-')
  const date = moment().year(parseInt(year)).dayOfYear(parseInt(dayOfYear))
  return `${year}-${month}-${date.format('DD')}T${timePart}`
}
