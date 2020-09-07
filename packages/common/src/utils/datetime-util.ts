import moment from 'moment-timezone'
import {now} from './times'

export const isPassed = (date: Date | string): boolean => moment(date).isBefore(moment(now()))
