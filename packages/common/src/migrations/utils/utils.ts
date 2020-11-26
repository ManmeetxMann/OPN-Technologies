export async function promiseAllSettled(
  promises: Promise<unknown>[],
): Promise<({status: string; value: unknown} | {status: string; reason: unknown})[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: 'fulfilled',
          value,
        }))
        .catch((error: unknown) => ({
          status: 'rejected',
          reason: error,
        })),
    ),
  )
}
