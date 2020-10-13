export type Auditable<T extends number | Date | string = Date> = {
  timestamps: {
    // TODO to be flatten
    createdAt: T
    updatedAt: T
  }
  updatedBy: string //TODO: handle with authenticated userId
}
