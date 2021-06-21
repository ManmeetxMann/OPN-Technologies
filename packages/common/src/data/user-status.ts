export enum UserStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  MERGED = 'MERGED',
}

export enum UserCreator {
  syncFromSQL = 'syncFromSQL',
  syncFromAcuity = 'syncFromAcuity',
  syncFromAcuityToOpnMigration = 'syncFromAcuityToOpnMigration',
}
