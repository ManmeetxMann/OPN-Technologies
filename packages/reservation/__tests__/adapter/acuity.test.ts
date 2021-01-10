function mapper(appoinments: any[]) {
  return appoinments.map((appointment) => {
    appointment.forms.forEach((form: {values: any[]}) => {
      form.values.some((field) => {
        if (field.fieldID == 8561464) {
          appointment.DOB = field.value
          return true
        }
      })
    })
    return appointment
  })
}

describe('Acuity Adapter', () => {
  test('Acuity Map Response Custom Field to DOB', () => {
    const appoinmentsRaw = [
      {
        id: 457878046,
        firstName: 'HSH',
        lastName: 'G',
        phone: '32432423423432',
        email: 'harpreet+test1@stayopn.com',
        date: 'October 14, 2020',
        time: '9:00am',
        endTime: '9:10am',
        dateCreated: 'October 13, 2020',
        datetimeCreated: '2020-10-13T10:16:31-0500',
        datetime: '2020-10-14T09:00:00-0400',
        price: '179.00',
        priceSold: '179.00',
        paid: 'no',
        amountPaid: '0.00',
        type: 'Testing',
        appointmentTypeID: 17534086,
        classID: null,
        addonIDs: [],
        category: '',
        duration: '10',
        calendar: 'FH Health - TEST',
        calendarID: 4577880,
        certificate: null,
        confirmationPage:
          'https://app.squarespacescheduling.com/schedule.php?owner=20915162&action=appt&id%5B%5D=6c12d615268442c716d612d336433940',
        location: '',
        notes: '',
        timezone: 'America/Toronto',
        calendarTimezone: 'America/Toronto',
        canceled: false,
        canClientCancel: false,
        canClientReschedule: true,
        labels: null,
        forms: [
          {
            id: 1554251,
            name: '',
            values: [
              {
                id: 1340227159,
                fieldID: 8561464,
                value: 'March 21, 2011',
                name: 'Date of Birth',
              },
              {
                id: 1340227160,
                fieldID: 8591567,
                value: 'yes',
                name: 'I would like to receive results via email',
              },
            ],
          },
          {
            id: 1559910,
            name: 'Bar Code number',
            values: [
              {
                id: 1341269288,
                fieldID: 8594852,
                value: '900021',
                name: 'Bar code Id',
              },
            ],
          },
          {
            id: 1554370,
            name: 'Terms & Conditions',
            values: [
              {
                id: 1340227161,
                fieldID: 8562278,
                value: 'yes',
                name: 'I have read and agree to the terms above',
              },
            ],
          },
        ],
        formsText:
          'Name: HSH G\nPhone: 32432423423432\nEmail: harpreet+test1@stayopn.com\nPrice: CA$179.00\n\n\n============\nDate of Birth: March 22, 2011\n\nI would like to receive results via email: yes\n\n\n\nBar Code number\n============\nBar code Id: 900021\n\n\n\nTerms & Conditions\n============\nI have read and agree to the terms above: yes\n\n',
      },
      {
        id: 457878046,
        firstName: 'HSH',
        lastName: 'G',
        phone: '32432423423432',
        email: 'harpreet+test1@stayopn.com',
        date: 'October 14, 2020',
        time: '9:00am',
        endTime: '9:10am',
        dateCreated: 'October 13, 2020',
        datetimeCreated: '2020-10-13T10:16:31-0500',
        datetime: '2020-10-14T09:00:00-0400',
        price: '179.00',
        priceSold: '179.00',
        paid: 'no',
        amountPaid: '0.00',
        type: 'Testing',
        appointmentTypeID: 17534086,
        classID: null,
        addonIDs: [],
        category: '',
        duration: '10',
        calendar: 'FH Health - TEST',
        calendarID: 4577880,
        certificate: null,
        confirmationPage:
          'https://app.squarespacescheduling.com/schedule.php?owner=20915162&action=appt&id%5B%5D=6c12d615268442c716d612d336433940',
        location: '',
        notes: '',
        timezone: 'America/Toronto',
        calendarTimezone: 'America/Toronto',
        canceled: false,
        canClientCancel: false,
        canClientReschedule: true,
        labels: null,
        forms: [
          {
            id: 1554251,
            name: '',
            values: [
              {
                id: 1340227159,
                fieldID: 8561464,
                value: 'March 22, 2011',
                name: 'Date of Birth',
              },
              {
                id: 1340227160,
                fieldID: 8591567,
                value: 'yes',
                name: 'I would like to receive results via email',
              },
            ],
          },
          {
            id: 1559910,
            name: 'Bar Code number',
            values: [
              {
                id: 1341269288,
                fieldID: 8594852,
                value: '900021',
                name: 'Bar code Id',
              },
            ],
          },
          {
            id: 1554370,
            name: 'Terms & Conditions',
            values: [
              {
                id: 1340227161,
                fieldID: 8562278,
                value: 'yes',
                name: 'I have read and agree to the terms above',
              },
            ],
          },
        ],
        formsText:
          'Name: HSH G\nPhone: 32432423423432\nEmail: harpreet+test1@stayopn.com\nPrice: CA$179.00\n\n\n============\nDate of Birth: March 22, 2011\n\nI would like to receive results via email: yes\n\n\n\nBar Code number\n============\nBar code Id: 900021\n\n\n\nTerms & Conditions\n============\nI have read and agree to the terms above: yes\n\n',
      },
    ]

    const data = mapper(appoinmentsRaw)
    //console.log(data);
    expect(data[0].DOB).toBe('March 21, 2011')
    expect(data[1].DOB).toBe('March 22, 2011')
  })
})
