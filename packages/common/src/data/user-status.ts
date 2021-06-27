export enum UserStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  MERGED = 'MERGED',
}

export enum UserCreator {
  syncFromSQL = 'syncFromSQL',
  syncFromTests = 'syncFromTests',
  syncFromTestsRequiredPatient = 'syncFromTestsRequiredPatient',
  syncFromAcuity = 'syncFromAcuity',
  syncFromAcuityToOpnMigration = 'syncFromAcuityToOpnMigration',
}
