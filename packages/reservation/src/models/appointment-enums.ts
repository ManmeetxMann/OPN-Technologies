export enum AppointmentStatus {
  Pending = 'Pending',
  Submitted = 'Submitted',
  InTransit = 'InTransit',
  Received = 'Received',
  CheckedIn = 'CheckedIn',
  InProgress = 'InProgress',
  Reported = 'Reported',
  ReRunRequired = 'ReRunRequired',
  ReCollectRequired = 'ReCollectRequired',
  Canceled = 'Canceled',
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

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
  PreferNotToSay = 'Prefer Not to Say',
}
