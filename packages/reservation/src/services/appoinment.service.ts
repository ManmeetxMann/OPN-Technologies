import DataStore from '../../../common/src/data/datastore'

import {AppointmentDTO, AppointmentDAO, AppoinmentBarCodeSequenceDAO, TestResultsDTO} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppoinmentsDBRepository} from '../respository/appointment-db.repository'

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appoinmentDBRepository = new AppoinmentsDBRepository(new DataStore())

  async getAppoinmentByBarCode(barCodeNumber: string): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then((appoinment: AppointmentDTO) => {
        return appoinment
      })
  }

  async getNextBarCodeNumber(): Promise<string> {
    return this.appoinmentDBRepository
      .getNextBarCode()
      .then(({id, barCodeNumber}: AppoinmentBarCodeSequenceDAO) => {
        return id.concat(barCodeNumber.toString())
      })
  }

  async saveAndSendTestResults(testResults: TestResultsDTO): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: testResults.barCode}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then((appoinment: AppointmentDTO) => {
        return appoinment
      })
  }

}
