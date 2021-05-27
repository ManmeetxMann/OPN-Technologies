import moment from 'moment'
import {Gender} from '../models/appointment'

enum GenderHL7 {
  A, //Ambiguous
  F, //Female
  M, //Male
  N, //Not applicable
  O, //Other
  U, //Unknown
}

enum SpecimenSource {
  NASOP, //Nasopharyngeal Swab
  NASD, //Nasal Swab-Deep
  NARES, //Nares
  NTS, //Nasal and Throat Swab
  TS, //Throat Swab
  VSALV, //Saliva
  NMT, //Nasal Mid-Turbinate
}

type ORMDataRequest = {
  dateTime: FirebaseFirestore.Timestamp
  gender: Gender
}

type ORMDataResponse = {
  dateTime: string
  specimenSource: SpecimenSource
  gender: GenderHL7
}

export class MountSinaiFormater {
  ormData: ORMDataRequest
  constructor(ormData: ORMDataRequest) {
    this.ormData = ormData
  }

  private dateOfAppointment = (date: FirebaseFirestore.Timestamp): string => {
    return moment(date.toDate()).format('YYYYMMDDHHMM') //YYYYMMDDHHMM
  }

  private gender = (gender: Gender): GenderHL7 => {
    console.log(gender)
    return GenderHL7.M
  }

  get = (): ORMDataResponse => {
    return {
      ...this.ormData,
      dateTime: this.dateOfAppointment(this.ormData.dateTime),
      specimenSource: SpecimenSource.NASOP,
      gender: this.gender(this.ormData.gender),
    }
  }
}
