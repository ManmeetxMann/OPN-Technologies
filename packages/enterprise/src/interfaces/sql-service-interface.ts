export interface SqlServiceInterface {
  getPatientByFirebaseKey(firebaseKey: string): Promise<unknown>
}
