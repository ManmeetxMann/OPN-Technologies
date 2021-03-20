import {Config} from '../../../common/src/utils/config'
import DataStore from '../../../common/src/data/datastore'
import {Content, Lang} from '../models/content'
import {Doctor} from '../models/doctor'
import {ContentRepository} from '../repository/content.repository'

export class ContentService {
  private dataStore = new DataStore()
  private contentRepository = new ContentRepository(this.dataStore)
  private doctors: Doctor[]

  constructor() {
    const signaturePathUrl = Config.get('DOCTOR_SIGNATURE_STORAGE_PATH')
    this.doctors = [
      {
        id: '1',
        name: 'Dr. Peter Blecher',
        signatureUrl: signaturePathUrl + 'dr1_sign.png',
      },
    ]
  }

  getContentListByLang(lang: Lang): Promise<Content[]> {
    return this.contentRepository.findWhereEqual('lang', lang)
  }

  getDoctorById(doctorId: string): Doctor {
    for (const i in this.doctors) {
      if (this.doctors[i].id == doctorId) {
        return this.doctors[i]
      }
    }
    return null
  }
}
