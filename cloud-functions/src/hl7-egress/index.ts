import type {EventFunctionWithCallback, HttpFunction} from '@google-cloud/functions-framework/build/src/functions'
import hl7 from 'simple-hl7';
import dayjs from 'dayjs';


const client = hl7.Server.createTcpClient({
  host: 'localhost',
  port: 5011,
  keepalive: true,
  callback: (err, ack) => {
    if (err) {
      // tslint:disable: no-console
      console.log("*******ERROR********");
      console.log(err.message);
    } else {
      // tslint:disable: no-console
      console.log(ack.log());
    }
  }
});

type AppointmentData = {
  patientCode: string
  barCode: string
  dateTimeForAppointment: string
  firstName: string
  lastName:string
  healthCard:string
  dateOfBirth:string
  gender:string
  address1:string
  address2:string
  city:string
  province:string
  postalCode:string
  country:string
  testType:string
  clinicCode: string
}

export class AppointmentDataToHL7ORM {
  appointment: AppointmentData
  message: any

  constructor(appointment: AppointmentData) {
    this.appointment = appointment
  }

  getDoctorCode = () => {
    return process.env.DOCTOR_CODE
  }

  initializeHL7Message = ()=>{
    const nowDateTime = dayjs().format('YYYYMMDDHHmmss')

    this.message = new hl7.Message(
      "FHDASHBOARD",//3
      "FHH",//4
      "SCC",
      "SCC",
      nowDateTime,
      "",
      ["ORM", "O01"],//MSH.9 - Message Type
      nowDateTime,
      "T", //D,P,T [Debug, Production, Training]
      "2.2"//MSH.12 - Version ID
    );
  }

  addPatientInfo = ()=>{
    this.message.addSegment("PID",
            "1", //Blank field
            "",
            [this.appointment.patientCode, "", "", "", "", "PT"], //Multiple components
            "",
            [this.appointment.lastName, this.appointment.firstName],
            "",
            this.appointment.dateOfBirth,
            this.appointment.gender,
            "",
            "",
            [this.appointment.address1, this.appointment.address2, this.appointment.city, this.appointment.province, this.appointment.postalCode, this.appointment.country ],
            "",
            "",
            "",
            "",
            "",
            "",
            this.appointment.barCode,
            this.appointment.healthCard
        );
  }

  addPatientVisitSegment = ()=>{
    this.message.addSegment("PV1",
        "",
        "U",//Patient Class: U: Unknown
        this.appointment.clinicCode, //Patient Location
        "",
        "",
        "",
        this.getDoctorCode()
    );
  }
  
  addCommonOrderSegment = ()=>{
    this.message.addSegment("ORC",
      "NW",
      this.appointment.barCode,
      "",
      "",
      "",
      "",
      "",
      "",
      this.appointment.dateTimeForAppointment//ISO 8824-1987
    );
  }

  addObservationRequestSegment = ()=>{
    this.message.addSegment("OBR",
      "1",
      this.appointment.barCode,
      "",
      ["NCOVX","COVID-19 VIRUS DETECTION","L"],//Universal Service Identifier//OBR.4
      "",
      this.appointment.dateTimeForAppointment,//OBR.6
      this.appointment.dateTimeForAppointment,//OBR.7
      "",
      "",
      "HIS",//OBR.10
      "",
      "",
      "",
      this.appointment.dateTimeForAppointment,//OBR.14
      this.appointment.testType,
      this.getDoctorCode(),
      "",//Phone Number/OBR.17
      this.appointment.barCode,
      "",
      "",
      "",
      "",
      "",
      "MIC",
      "",
      "",
      ["","","","","","R"]
    )
  }

  addNotesAndComments = ()=>{
    this.message.addSegment("NTE",
        "1",
        "",
        "Patient Setting:->Outpatient",
    );

    this.message.addSegment("NTE",
        "2",
        "",
        "Clinical Information:->Asymptomatic",
    );
    this.message.addSegment("NTE",
        "3",
        "",
        "Reason for Test:->Patient Request",
    );
    this.message.addSegment("NTE",
        "4",
        "",
        "Exposure History:->No",
    );
  }

  get = ()=>{
    this.initializeHL7Message()
    this.addPatientInfo()//PID
    this.addPatientVisitSegment()//PV1
    this.addCommonOrderSegment()//ORC
    this.addObservationRequestSegment()//OBR
    this.addNotesAndComments()
    return this.message
  }
}
const requestHandler: EventFunctionWithCallback = async (pubSubMessage, context, callback) => {
  // tslint:disable: no-console
  console.log(pubSubMessage)
  const appointmentDataToHL7ORM = new AppointmentDataToHL7ORM(pubSubMessage as AppointmentData)
  const message = appointmentDataToHL7ORM.get()
  // tslint:disable: no-console
  console.log(message)
  client.send(message);
  callback()
}

const httpTestHandler: HttpFunction = async (req, res) => {
  // tslint:disable: no-console
  console.log(req.body)
  const appointmentDataToHL7ORM = new AppointmentDataToHL7ORM(req.body)
  const message = appointmentDataToHL7ORM.get()
  // tslint:disable: no-console
  console.log(message)
  client.send(message);
  res.send('No function to test!')
}

export {requestHandler, httpTestHandler}
