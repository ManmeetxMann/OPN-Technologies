const parseCSV = (text) => {
  return text
    .split('\n')
    .filter((row) => !!row)
    .map((row) => row.split(',').map((row) => row.trim()))
}
const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}
document.addEventListener('DOMContentLoaded', () => {
  const bulkForm = document.getElementById('bulkSubmitResults')
  const {DateTime} = luxon
  let from = DateTime.utc().toLocaleString()
  let to = DateTime.utc().minus({days: 4}).toLocaleString()
  let data
  if (!bulkForm) {
    return
  }
  const csvFileInput = document.getElementById('csvFile')
  const presentationTable = document.getElementById('presentationTable')

  const datesBefore = document.getElementById('datesBefore')

  const sendButtonBulk = document.getElementById('sendButtonBulk')
  const errorBulkModal = document.getElementById('errorBulkModal')
  const errorBulkContent = document.getElementById('errorBulkContent')

  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.readAsText(file, 'UTF-8')
      reader.onload = async function (evt) {
        try {
          data = parseCSV(evt.target.result)
        } catch (e) {
          return
        }
        const response = await fetch('/admin/api/v1/check-appointments', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barCodes: data.map((row) => row[0]),
          }),
        })
        const {data: existenceStatus} = await response.json()
        presentationTable.classList.remove('d-none')
        const isValid = data.every((r) => r.length === 10)
        if (!isValid) return
        data.forEach((row, i) => {
          const trElem = document.createElement('tr')
          const thElem = document.createElement('th')
          thElem.innerText = i + 1
          trElem.appendChild(thElem)
          const tdElem = document.createElement('td')
          if (existenceStatus.indexOf(row[0]) !== -1) {
            const checkboxElem = document.createElement('input')
            checkboxElem.setAttribute('type', 'checkbox')
            checkboxElem.classList.add('sendAgainCheckbox')
            checkboxElem.setAttribute('data-barcode', row[0])
            checkboxElem.setAttribute('data-index', i)
            tdElem.appendChild(checkboxElem)
          }
          trElem.appendChild(tdElem)

          row.forEach((col) => {
            const tdElem = document.createElement('td')
            tdElem.innerText = col
            trElem.appendChild(tdElem)
          })
          presentationTable.appendChild(trElem)
        })

        presentationTable.querySelector('tbody')
      }
      reader.onerror = function () {
        document.getElementById('fileContents').innerHTML = 'error reading file'
      }
    }
  })
  datesBefore.addEventListener('change', async (e) => {
    from = DateTime.utc().toLocaleString()
    to = DateTime.utc().minus({days: e.target.value}).toLocaleString()
  })
  sendButtonBulk.addEventListener('click', async (e) => {
    e.preventDefault()
    const sendAgainData = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => !row.checked)
      .map((row) => row.getAttribute('data-index'))
    const sendAgainDataVice = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => row.checked)
      .map((row) => row.getAttribute('data-index'))
    const dataSentBackend = data
      .filter((row, i) => sendAgainData.indexOf(`${i}`) === -1)
      .map((row) => ({
        barCode: row[0],
        famEGene: row[1],
        famCt: row[2],
        calRed61RdRpGene: row[3],
        calRed61Ct: row[4],
        quasar670NGene: row[5],
        quasar670Ct: row[6],
        hexIC: row[7],
        hexCt: row[8],
        result: row[9],
        sendAgain: sendAgainDataVice.indexOf(row[0]) !== -1,
      }))

    const response = await fetch('/admin/api/v1/send-and-save-test-results-bulk', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to,
        results: dataSentBackend,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      openModal(errorBulkModal)
      const regexpFieldName = /.*\[\d*\]\./g
      const regexpFieldRow = /.*\[(\d*)\]\..*/g
      errorBulkContent.innerHTML = ''

      if (responseData?.errors?.length) {
        responseData.errors.map((err) => {
          const errrorElem = document.createElement('p')
          const fieldName = err.param.replace(regexpFieldName, '')
          const index = parseInt(err.param.replace(regexpFieldRow, '$1'))
          console.log(regexpFieldRow)
          console.log(err.param)
          console.log(index)
          errrorElem.innerText = `At ${index + 1} row ${fieldName} is invalid.`
          errorBulkContent.appendChild(errrorElem)
        })
      } else {
        const errrorElem = document.createElement('p')
        errrorElem.innerText = `Invalid request`
        errorBulkContent.appendChild(errrorElem)
      }
      console.log(responseData.errors[0].param.replace(regexpFieldName, ''))
    }
  })
})
