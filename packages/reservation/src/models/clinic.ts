export type Clinic = {
  id: string
  name: string
  address: string
  acuityUser: string
  acuityPass: string
  timestamps?: string
}

export type ClinicID = Pick<Clinic, 'id'>

export type ClinicPostRequest = Omit<Clinic, 'id' | 'timestamps'>
