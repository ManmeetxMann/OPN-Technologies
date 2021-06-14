import moment from 'moment'
import {Gender, ThirdPartySyncSource} from '../models/appointment'
import {Config} from '../../../common/src/utils/config'

enum SendingFacility {
  MS112 = 'MS112',
  MS117 = 'MS117',
}

enum GenderHL7 {
  A = 'A', //Ambiguous
  F = 'F', //Female
  M = 'M', //Male
  N = 'N', //Not applicable
  O = 'O', //Other
  U = 'U', //Unknown
}

enum SpecimenSource {
  NASOP = 'NASOP', //Nasopharyngeal Swab
  NASD = 'NASD', //Nasal Swab-Deep
  NARES = 'NARES', //Nares
  NTS = 'NTS', //Nasal and Throat Swab
  TS = 'TS', //Throat Swab
  VSALV = 'VSALV', //Saliva
  NMT = 'NMT', //Nasal Mid-Turbinate
}

type ORMDataRequest = {
  dateTime: FirebaseFirestore.Timestamp
  gender: Gender
  dateOfBirth: string
  source: ThirdPartySyncSource
}

type ORMDataResponse = {
  dateTime: string
  dateOfBirth: string
  specimenSource: SpecimenSource
  gender: GenderHL7
  clinicCode: string
  sendingFacility: SendingFacility
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
      sendingFacility:
        this.ormData.source === ThirdPartySyncSource.TransportRun
          ? SendingFacility.MS117
          : SendingFacility.MS112,
    }
  }
}
