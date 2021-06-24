export enum Actions {
  read = 'read',
  write = 'write',
  delete = 'delete',
  resumable = 'resumable',
}

export enum Versions {
  v4 = 'v4',
  v2 = 'v2',
}

export const FiveDay = Date.now() + 60 * 24 * 5 * 60 * 1000
