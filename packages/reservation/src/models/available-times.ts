export type AvailableTimes = {
  id: string
  label: string
  slotsAvailable: number
}

export type AvailableSlotsUIDTO = {
  times: AvailableTimes[]
  totalSlotsAvailable: number
}

export const slotUiDTOResponse = (times: AvailableTimes[]): AvailableSlotsUIDTO => {
  const totalSlotsAvailable = times.reduce((totalSlots, time) => {
    return (totalSlots += time.slotsAvailable)
  }, 0)

  return {
    times,
    totalSlotsAvailable: totalSlotsAvailable,
  }
}
