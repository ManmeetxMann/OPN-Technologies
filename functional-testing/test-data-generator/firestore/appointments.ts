import dataManagerInterface from 'test-data-generator/data-manager-interface'
import firestoreDb from './initialize'

class appointments implements dataManagerInterface {
  private createAppointment() {
    const data = {
      acuityAppointmentId: 111,
      address: 'address'
    }
    firestoreDb.collection('appointments').doc('0000aaaa1111AAA').set(data)
  }

  public create(){
    this.createAppointment()
  }

  public destroy(){
    
  }
}
export default appointments