const parseCSV = (strData) => {
  const strDelimiter = ','

  const objPattern = new RegExp(
    // Delimiters.
    '(\\' +
      strDelimiter +
      '|\\r?\\n|\\r|^)' +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      '\\r\\n]*))',
    'gi',
  )

  const arrData = [[]]
  let arrMatches = null

  while ((arrMatches = objPattern.exec(strData))) {
    const strMatchedDelimiter = arrMatches[1]
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      arrData.push([])
    }

    let strMatchedValue
    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"')
    } else {
      strMatchedValue = arrMatches[3]
    }

    arrData[arrData.length - 1].push(strMatchedValue)
  }
  return arrData
}
const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}
document.addEventListener('DOMContentLoaded', () => {
  const bulkForm = document.getElementById('bulkSubmitResults')
  const {DateTime} = luxon
  let to = DateTime.utc().toLocaleString()
  let from = DateTime.utc().minus({days: 4}).toLocaleString()
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
  const successModal = document.getElementById('successModal')
  const successModalContent = document.getElementById('successModalContent')
  const successModalClose = document.getElementById('successModalClose')

  successModalClose.addEventListener('click', () => {
    closeModal(successModal)
    location.reload()
  });

  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.readAsText(file, 'UTF-8')
      reader.onload = async function (evt) {
        try {
          data = parseCSV(evt.target.result).filter(
            (row) => !(row[0] === 'Sample No' || row[3] === '' || row[5] === 'E gene'),
          )
          if (data.length > 100) {
            openModal(errorBulkModal)
            errorBulkContent.innerHTML = 'CSV Rows cannot be more than 100'
            return
          }
        } catch (e) {
          openModal(errorBulkModal)
          errorBulkContent.innerHTML = 'CSV File is invalid'
          return
        }
        const isValid = data.every((r) => r.length === 15)
        if (!isValid) {
          openModal(errorBulkModal)
          errorBulkContent.innerHTML = 'CSV File is invalid should be 15 columns'
          return
        }
        const response = await fetch('/admin/api/v1/check-appointments', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barCodes: data.map((row) => row[3]),
          }),
        })
        const {data: existenceStatus} = await response.json()
        presentationTable.classList.remove('d-none')
        data.forEach((row, i) => {
          const trElem = document.createElement('tr')
          const thElem = document.createElement('th')
          thElem.innerText = i + 1
          trElem.appendChild(thElem)
          const tdElem = document.createElement('td')
          if (existenceStatus.indexOf(row[3]) !== -1) {
            const checkboxElem = document.createElement('input')
            checkboxElem.setAttribute('type', 'checkbox')
            checkboxElem.classList.add('sendAgainCheckbox')
            checkboxElem.setAttribute('data-barcode', row[3])
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
    to = DateTime.utc().toLocaleString()
    from = DateTime.utc().minus({days: e.target.value}).toLocaleString()
  })
  sendButtonBulk.addEventListener('click', async (e) => {
    e.preventDefault()
    if (!data) {
      openModal(errorBulkModal)
      errorBulkContent.innerHTML = 'You should upload CSV file before'
      return
    }
    const sendAgainData = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => !row.checked)
      .map((row) => row.getAttribute('data-index'))
    const sendAgainDataVice = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => row.checked)
      .map((row) => row.getAttribute('data-index'))
    const dataSentBackend = data
      .filter((row, i) => sendAgainData.indexOf(`${i}`) === -1)
      .map((row) => ({
        barCode: row[3],
        famEGene: row[5],
        famCt: row[6],
        calRed61RdRpGene: row[7],
        calRed61Ct: row[8],
        quasar670NGene: row[9],
        quasar670Ct: row[10],
        hexIC: row[11],
        hexCt: row[12],
        result: row[13],
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
      errorBulkContent.innerHTML = ''
      const regexpFieldName = /.*\[\d*\]\./g
      const regexpFieldRow = /.*\[(\d*)\]\..*/g

      if (responseData?.errors?.length) {
        responseData.errors.map((err) => {
          const errrorElem = document.createElement('p')
          const fieldName = err.param.replace(regexpFieldName, '')
          const index = parseInt(err.param.replace(regexpFieldRow, '$1'))
          errrorElem.innerText = `At ${dataSentBackend[index].barCode} row ${fieldName} is invalid.`
          errorBulkContent.appendChild(errrorElem)
        })
      } else {
        const errrorElem = document.createElement('p')
        errrorElem.innerText = `Invalid request`
        errorBulkContent.appendChild(errrorElem)
      }
    } else {
      let content = ''
      const succeedRows = dataSentBackend.filter((row) => {
        return !responseData.data.failedRows.find((row2) => row2.barCode === row.barCode)
      })
      openModal(successModal)

      if (succeedRows.length) {
        const succeedRowsElem = succeedRows.map((row) => `<div>${row.barCode}</div>`).join('')
        content += `Succeed rows: ${succeedRowsElem}<br/>`
      }
      if (responseData.data.failedRows.length) {
        const failedRows = responseData.data.failedRows
          .map((row) => `<div>${row.barCode}</div>`)
          .join('')
        content += `Failed rows: ${failedRows}`
      }

      successModalContent.innerHTML = content
    }
  })
})
