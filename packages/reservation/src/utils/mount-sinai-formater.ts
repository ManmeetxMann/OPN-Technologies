import moment from 'moment'
import {Gender} from '../models/appointment'
import {Config} from '../../../common/src/utils/config'

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
  dateOfBirth: string
}

type ORMDataResponse = {
  dateTime: string
  dateOfBirth: string
  specimenSource: SpecimenSource
  gender: GenderHL7
  clinicCode: string
}

export class MountSinaiFormater {
  ormData: ORMDataRequest
  constructor(ormData: ORMDataRequest) {
    this.ormData = ormData
  }

  private dateOfAppointment = (date: FirebaseFirestore.Timestamp): string => {
    return moment(date.toDate()).format('YYYYMMDDHHMM') //YYYYMMDDHHMM
  }

  private dateOfBirth = (date: string): string => {
    return moment(new Date(date)).format('YYYYMMDD') //YYYYMMDD
  }

  private gender = (gender: Gender): GenderHL7 => {
    switch (gender) {
      case Gender.Female: {
        return GenderHL7.F
      }
      case Gender.Male: {
        return GenderHL7.M
      }
      case Gender.Other: {
        return GenderHL7.O
      }
      case Gender.PreferNotToSay: {
        return GenderHL7.U
      }
      default: {
        return GenderHL7.U
      }
    }
  }

  get = (): ORMDataResponse => {
    return {
      ...this.ormData,
      dateTime: this.dateOfAppointment(this.ormData.dateTime),
      specimenSource: SpecimenSource.NASOP,
      gender: this.gender(this.ormData.gender),
      dateOfBirth: this.dateOfBirth(this.ormData.dateOfBirth),
      clinicCode: Config.get('CLINIC_CODE_MOUNT_SINAI_CONFIRMATORY'),
    }
  }
}
