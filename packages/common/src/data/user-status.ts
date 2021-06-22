export enum UserStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  MERGED = 'MERGED',
}

export enum UserCreator {
  syncFromSQL = 'syncFromSQL',
  syncFromTests = 'syncFromTests',
  syncFromAcuity = 'syncFromAcuity',
  syncFromAcuityToOpnMigration = 'syncFromAcuityToOpnMigration',
}
