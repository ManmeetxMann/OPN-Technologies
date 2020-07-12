import moment from 'moment'

export const isPassed = (date: Date | string): boolean => moment(date).isBefore(moment())
