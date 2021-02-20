export type Content= {
  contentType: ContentType
  lang: string
  resultType: ResultTypes
  details: string
}

export type Result={
  legalNotice: string
  doctorName: string
  doctorSignature: string
  resultInfo: ResultInfo[]
}

export type ResultInfo={
  details: string
  resultType: ResultTypes
}

export enum ContentType {
  Result= 'result',
  Appointment= 'appointment'
}

export enum ResultTypes {
  PresumptivePositive = 'PresumptivePositive',
  PreliminaryPositive = 'PreliminaryPositive',
  Positive = 'Positive',
  Negative = 'Negative',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Inconclusive = 'Inconclusive',
  Indeterminate = 'Indeterminate',
}