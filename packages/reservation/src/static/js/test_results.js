document.addEventListener('DOMContentLoaded', () => {
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById('sendResultsAgain')
  const sendResultNoBtn = document.getElementById('sendResultNo')
  const messageModal = document.getElementById('message')
  const confirmSendingAgainModal = document.getElementById('confirmSendingAgain')
  const sendButton = document.getElementById('sendButton')

  const getValueById = (id) => document.getElementById(id).value

  const findAncestor = (el, sel) => {
    while ((el = el.parentElement) && !(el.matches || el.matchesSelector).call(el, sel));
    return el
  }

  const openModal = (modal) => modal.classList.add('show-modal')
  const closeModal = (modal) => modal.classList.remove('show-modal')

  const showAlertModal = function (title, message) {
    messageModal.querySelector('.modal-title').innerHTML = title
    messageModal.querySelector('.modal-body').innerHTML = message
    openModal(messageModal)
  }

  const createCloseModal = (elem) => {
    closeModal(findAncestor(elem, '.show-modal'))
  }

  const setLoader = (btn, isEnable) => {
    if (isEnable) {
      const spinner = document.createElement('span')
      spinner.classList.add('spinner')
      const loaderText = document.createTextNode('Loading...')
      btn.classList.add('d-inline-flex')
      btn.classList.add('align-center')
      btn.disabled = true
      btn.innerHTML = ''
      btn.appendChild(spinner)
      btn.appendChild(loaderText)
    } else {
      btn.innerHTML = 'Submit'
      btn.disabled = false
      btn.classList.remove('d-inline-flex')
      btn.classList.remove('align-center')
    }
  }

  submitResultsForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const data = {
      barCode: getValueById('barCode'),
      result: getValueById('result'),
      famEGene: getValueById('famEGene'),
      famCt: getValueById('famCt'),
      calRed61RdRpGene: getValueById('calRed61RdRpGene'),
      calRed61Ct: getValueById('calRed61Ct'),
      quasar670NGene: getValueById('quasar670NGene'),
      quasar670Ct: getValueById('quasar670Ct'),
      hexIC: getValueById('hexIC'),
      hexCt: getValueById('hexCt'),
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
        showAlertModal('Success', responseData.data)
      } else {
        if (response.status === 409) {
          openModal(confirmSendingAgainModal)
        } else {
          showAlertModal('Failed', responseData.status.message)
        }
      }
    } catch (e) {
      showAlertModal('Failed', 'Something went wrong. Please try after sometime.')
    }
  })

  submitAgainBtn.addEventListener('click', async (e) => {
    const data = {
      barCode: getValueById('barCode'),
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

      const responseData = await response.json()
      setLoader(submitAgainBtn, false)
      closeModal(confirmSendingAgainModal)
      if (response.ok) {
        showAlertModal('Success', responseData.data)
      } else {
        showAlertModal('Failed', responseData.status.message)
      }
    } catch (e) {
      showAlertModal('Failed', 'Something went wrong. Please try after sometime.')
    }
  })
  ;[...document.getElementsByClassName('close')].forEach((closBtn) =>
    closBtn.addEventListener('click', ({target}) => createCloseModal(target)),
  )
  sendResultNoBtn.addEventListener('click', ({target}) => createCloseModal(target))
})
