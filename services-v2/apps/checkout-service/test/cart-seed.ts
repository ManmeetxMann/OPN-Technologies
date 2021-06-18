export const cartItem = {
  slotId:
    'eyJhcHBvaW50bWVudFR5cGVJZCI6MTk0MjIwMTgsImNhbGVuZGFyVGltZXpvbmUiOiJBbWVyaWNhL1Rvcm9udG8iLCJjYWxlbmRhcklkIjo0NTcxMTAzLCJjYWxlbmRhck5hbWUiOiJCcmFtcHRvbjogTW91bnQgUGxlYXNhbnQgVmlsbGFnZSIsImRhdGUiOiIyMDIxLTA1LTAyIiwidGltZSI6IjIwMjEtMDUtMDJUMDg6MTA6MDAtMDQwMCIsIm9yZ2FuaXphdGlvbklkIjoidkd2cUpVTGZ3SUMwQ0R3VnlBREkiLCJwYWNrYWdlQ29kZSI6IjBGN0U0REI1In0=',
  firstName: 'string',
  lastName: 'string',
  gender: 'Male',
  phone: {
    code: 0,
    number: 0,
  },
  dateOfBirth: '2021-04-17',
  address: 'string',
  addressUnit: 'string',
  postalCode: 'string',
  couponCode: 'string',
  shareTestResultWithEmployer: true,
  agreeToConductFHHealthAssessment: true,
  readTermsAndConditions: true,
  receiveResultsViaEmail: true,
  receiveNotificationsFromGov: true,
  userId: 'mockedId',
}

export const slotId = (data: {date: string; time: string}): unknown => ({
  appointmentTypeId: 19422018,
  calendarTimezone: 'America/Toronto',
  calendarId: 4571103,
  calendarName: 'Brampton: Mount Pleasant Village',
  date: data.date,
  time: `${data.date}T${data.time}-0400`,
  organizationId: 'vGvqJULfwIC0CDwVyADI',
  packageCode: '0F7E4DB5',
})

export const cartItemWithCustomSlot = (date: string, time: string): unknown => {
  const slotData = slotId({date, time})
  const buffer = Buffer.from(JSON.stringify(slotData), 'utf-8')

  return {...cartItem, slotId: buffer.toString('base64')}
}
