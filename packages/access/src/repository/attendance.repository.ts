import DataModel from '../../../common/src/data/datamodel.base'
import {Attendance} from '../models/attendance'

export type AttendanceModel = Attendance & {
  id: string
}
export class AttendanceRepository extends DataModel<AttendanceModel> {
  public readonly rootPath = 'attendance'
  readonly zeroSet = []
}
