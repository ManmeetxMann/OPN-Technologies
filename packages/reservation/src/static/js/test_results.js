document.addEventListener('DOMContentLoaded', () => {
  const submitResultsForm = document.getElementById('submitResults')
  const submitAgainBtn = document.getElementById('sendResultsAgain')
  const sendResultNoBtn = document.getElementById('sendResultNo')
  const messageModal = document.getElementById('message')
  const confirmSendingAgainModal = document.getElementById('confirmSendingAgain')

  const getValueById = (id) => document.getElementById(id).value

  const findAncestor = (el, sel) => {
    while ((el = el.parentElement) && !(el.matches || el.matchesSelector).call(el, sel)) return el
  }

  const openModal = (modal) => modal.classList.add('show-modal')
  const closeModal = (modal) => modal.classList.close('show-modal')

  const showAlertModal = function (title, message) {
    messageModal.querySelector('.modal-title').innerHTML = title
    messageModal.querySelector('.modal-body').innerHTML = message
    openModal(messageModal)
  }

  const createCloseModal = (elem) => {
    closeModal(findAncestor(elem, '.show-modal'))
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
      const response = await fetch('/admin/api/v1/send-test-results-again', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()
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
