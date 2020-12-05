document.addEventListener('DOMContentLoaded', () => {
  const confirmFaxSendModal = document.getElementById('confirmFaxSend')
  
  const sendFaxButton = document.getElementById('sendFaxButton')
  const sendFaxBtn = document.getElementById('sendFaxBtn')
  const sendFaxNoBtn = document.getElementById('sendFaxNoBtn')

  const barCodeElem = document.getElementById('barCode')
  const faxCodeElem = document.getElementById('faxCode')

  const messageModal = document.getElementById('message')
  
  const getValueByElem = (elem) => elem.value

  const showAlertModal = function (title, message) {
    messageModal.querySelector('.modal-title').innerHTML = title
    messageModal.querySelector('.modal-body').innerHTML = message
    openModal(messageModal)
  }

  const createCloseModal = (elem) => {
    closeModal(findAncestor(elem, 'show-modal'))
  }

  const sendResult = async (event) => {
    event.preventDefault()

    setLoader(sendFaxButton, true)

    const data = {
      barCode: getValueByElem(barCodeElem),
      faxNumber: getValueByElem(faxCodeElem),
    }

    setLoader(sendFaxButton, true)

    try {
      const response = await fetch('/admin/api/v1/send-fax-for-positive', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      setLoader(sendFaxButton, false)
      if (response.ok) {
        showAlertModal('Success', responseData.data)

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
      setLoader(sendFaxButton, false)
      showAlertModal('Failed', 'Something went wrong. Please try after sometime.')
    }
  }

  sendFaxButton.addEventListener('click', (event) => {
    event.preventDefault()
    openModal(confirmFaxSendModal)
  })
  ;[...document.getElementsByClassName('close')].forEach((closBtn) =>
    closBtn.addEventListener('click', ({target}) => createCloseModal(target)),
  )

  sendFaxBtn.addEventListener('click', (e) => {
    closeModal(confirmFaxSendModal)
    sendResult(e)
  })
  sendFaxNoBtn.addEventListener('click', ({target}) => createCloseModal(target))
})
