import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentBase, AppointmentsDBModel} from '../models/appoinment'

export class AppointmentsDBRepository extends DataModel<AppointmentsDBModel> {
    public rootPath = 'appointments'
    readonly zeroSet = []

    constructor(dataStore: DataStore) {
        super(dataStore)
    }

    public async save(appointments: AppointmentBase): Promise<AppointmentsDBModel> {
        return this.add(appointments)
    }
}
