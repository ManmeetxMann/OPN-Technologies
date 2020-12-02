document.addEventListener('DOMContentLoaded', () => {
  const resultSelect = document.getElementById('result')
  if (!resultSelect) {
    return
  }
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById('sendResultsAgain')
  const sendResultNoBtn = document.getElementById('sendResultNo')
  const messageModal = document.getElementById('message')
  const confirmSendingAgainModal = document.getElementById('confirmSendingAgain')
  const confirmMailSendModal = document.getElementById('confirmMailSend')
  const sendButton = document.getElementById('sendButton')
  const sendMailBtn = document.getElementById('sendMailBtn')

  const sendMailNoBtn = document.getElementById('sendMailNoBtn')
  const barCodeElem = document.getElementById('barCode')
  const resultElem = document.getElementById('result')
  const famEGeneElem = document.getElementById('famEGene')
  const famCtElem = document.getElementById('famCt')
  const calRed61RdRpGeneElem = document.getElementById('calRed61RdRpGene')
  const calRed61CtElem = document.getElementById('calRed61Ct')
  const quasar670NGeneElem = document.getElementById('quasar670NGene')
  const quasar670CtElem = document.getElementById('quasar670Ct')
  const hexICElem = document.getElementById('hexIC')
  const hexCtElem = document.getElementById('hexCt')

  const confirmFirstName = document.getElementById('confirmFirstName')
  const confirmLastName = document.getElementById('confirmLastName')
  const confirmEmail = document.getElementById('confirmEmail')
  const confirmPhone = document.getElementById('confirmPhone')
  const confirmDateOfBirth = document.getElementById('confirmDateOfBirth')
  const confirmRegisteredNursePractitioner = document.getElementById(
    'confirmRegisteredNursePractitioner',
  )
  const confirmAppointmentId = document.getElementById('confirmAppointmentId')
  const confirmDateOfAppointment = document.getElementById('confirmDateOfAppointment')
  let userData = {}

  const getValueByElem = (elem) => elem.value

  const showAlertModal = function (title, message) {
    messageModal.querySelector('.modal-title').innerHTML = title
    messageModal.querySelector('.modal-body').innerHTML = message
    openModal(messageModal)
  }

  const createCloseModal = (elem) => {
    closeModal(findAncestor(elem, 'show-modal'))
  }

  const sendResult = async (event, isSecond = false) => {
    event.preventDefault()

    const data = {
      barCode: getValueByElem(barCodeElem),
      result: getValueByElem(resultElem),
      famEGene: getValueByElem(famEGeneElem),
      famCt: getValueByElem(famCtElem),
      calRed61RdRpGene: getValueByElem(calRed61RdRpGeneElem),
      calRed61Ct: getValueByElem(calRed61CtElem),
      quasar670NGene: getValueByElem(quasar670NGeneElem),
      quasar670Ct: getValueByElem(quasar670CtElem),
      hexIC: getValueByElem(hexICElem),
      hexCt: getValueByElem(hexCtElem),
      resultDate: getValueByElem(resultDate),
    }
    if (!isSecond && confirmBeforeSend === '1') {
      data.needConfirmation = true
    }
    setLoader(sendButton, true)

    try {
      const response = await fetch('/admin/api/v1/send-and-save-test-results', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      setLoader(sendButton, false)
      if (response.ok) {
        if (!isSecond && confirmBeforeSend === '1') {
          openModal(confirmMailSendModal)
          confirmAppointmentId.innerHTML = responseData.data.appointmentId
          confirmDateOfAppointment.innerHTML = responseData.data.dateOfAppointment
          confirmDateOfBirth.innerHTML = responseData.data.dateOfBirth
          confirmEmail.innerHTML = responseData.data.email
          confirmFirstName.innerHTML = responseData.data.firstName
          confirmLastName.innerHTML = responseData.data.lastName
          confirmPhone.innerHTML = responseData.data.phone
          confirmRegisteredNursePractitioner.innerHTML =
            responseData.data.registeredNursePractitioner
          userData = responseData.data
        } else {
          showAlertModal('Success', responseData.data)
        }
      } else {
        if (response.status === 409) {
          openModal(confirmSendingAgainModal)
        }
        else if (responseData?.errors?.length) {
          let errorMessage = "";
          responseData.errors.map((error) => {
            errorMessage +=  `${error.param} ${error.msg}`
          })

          showAlertModal('Failed', errorMessage)
        }else {
          showAlertModal('Failed', responseData.status.message)
        }
      }
    } catch (e) {
      setLoader(sendButton, false)
      showAlertModal('Failed', 'Something went wrong. Please try after sometime.')
    }
  }

  submitResultsForm.addEventListener('submit', sendResult)

  submitAgainBtn.addEventListener('click', async () => {
    const data = {
      barCode: getValueByElem(barCodeElem),
      result: getValueByElem(resultElem),
      famEGene: getValueByElem(famEGeneElem),
      famCt: getValueByElem(famCtElem),
      calRed61RdRpGene: getValueByElem(calRed61RdRpGeneElem),
      calRed61Ct: getValueByElem(calRed61CtElem),
      quasar670NGene: getValueByElem(quasar670NGeneElem),
      quasar670Ct: getValueByElem(quasar670CtElem),
      hexIC: getValueByElem(hexICElem),
      hexCt: getValueByElem(hexCtElem),
      resultDate: getValueByElem(resultDate),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      registeredNursePractitioner: userData.registeredNursePractitioner,
      dateOfAppointment: userData.dateOfAppointment,
      appointmentId: userData.appointmentId,
      timeOfAppointment: userData.timeOfAppointment,
      id: getValueByElem(barCodeElem),
      packageCode: userData.packageCode,
      timestamps: userData.timestamps,
    }

    try {
      setLoader(submitAgainBtn, true)
      const response = await fetch('/admin/api/v1/send-test-results-again', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const {
        data: responseData,
        status: {message},
      } = await response.json()
      setLoader(submitAgainBtn, false)
      closeModal(confirmSendingAgainModal)
      if (response.ok) {
        showAlertModal('Success', responseData)
      } else {
        showAlertModal('Failed', message)
      }
    } catch (e) {
      setLoader(submitAgainBtn, false)
      closeModal(confirmSendingAgainModal)
      showAlertModal('Failed', 'Something went wrong. Please try after sometime.')
    }
  })
  ;[...document.getElementsByClassName('close')].forEach((closBtn) =>
    closBtn.addEventListener('click', ({target}) => createCloseModal(target)),
  )
  sendResultNoBtn.addEventListener('click', ({target}) => createCloseModal(target))

  sendMailBtn.addEventListener('click', (e) => {
    closeModal(confirmMailSendModal)
    sendResult(e, true)
  })
  sendMailNoBtn.addEventListener('click', ({target}) => createCloseModal(target))

  resultSelect.addEventListener('change', ({target}) => {
    const {value: resultVal} = target
    if (resultVal === 'Positive' || resultVal === '2019-nCoV Detected') {
      famEGeneElem.value = '+'
      famCtElem.value = ''
      calRed61RdRpGeneElem.value = '+'
      calRed61CtElem.value = ''
      quasar670NGeneElem.value = '+'
      quasar670CtElem.value = ''
      hexICElem.value = '+'
      hexCtElem.value = 'N/A'
    } else {
      famEGeneElem.value = '-'
      famCtElem.value = 'N/A'
      calRed61RdRpGeneElem.value = '-'
      calRed61CtElem.value = 'N/A'
      quasar670NGeneElem.value = '-'
      quasar670CtElem.value = 'N/A'
      hexICElem.value = '+'
      hexCtElem.value = ''
    }
  })
})
