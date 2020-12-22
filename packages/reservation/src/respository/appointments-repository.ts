import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentDbBase, AppointmentsDBModel} from '../models/appoinment'

export class AppointmentsRepository extends DataModel<AppointmentsDBModel> {
    public rootPath = 'appointments'
    readonly zeroSet = []

    constructor(dataStore: DataStore) {
        super(dataStore)
    }

    public async save(appointments: AppointmentDbBase): Promise<AppointmentsDBModel> {
        console.log(appointments);
        return this.add(appointments)
    }
}
