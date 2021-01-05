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
  let barcodeCounts
  if (!bulkForm) {
    return
  }
  const csvFileInput = document.getElementById('csvFile')
  const presentationTable = document.getElementById('presentationTable')
  const warningMessage = document.getElementById('warning-message')

  const datesToday = document.getElementById('resultDate')

  const sendButtonBulk = document.getElementById('sendButtonBulk')
  const errorBulkModal = document.getElementById('errorBulkModal')
  const errorBulkContent = document.getElementById('errorBulkContent')
  const successModal = document.getElementById('successModal')
  const successModalContent = document.getElementById('successModalContent')
  const successModalClose = document.getElementById('successModalClose')

  const isValidResultType = (result) => {
    return !['Positive', 'Negative', '2019-nCoV Detected', 'Invalid', 'Inconclusive'].includes(result);
  }

  successModalClose.addEventListener('click', () => {
    closeModal(successModal)
    location.reload()
  })

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
        const isInvalid = data.every((r) => r.length !== 15)
        if (isInvalid) {
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
        const presentationTableTbody = presentationTable.querySelector('tbody')
        presentationTableTbody.innerHTML = ''
        warningMessage.classList.add('d-none')
        const {data: existenceStatus} = await response.json()
        presentationTable.classList.remove('d-none')
        barcodeCounts = data.reduce((acc, row) => {
          if (acc[row[3]]) {
            acc[row[3]]++
          } else {
            acc[row[3]] = 1
          }
          return acc
        }, {})
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
          const markWarning = (rowElem, colElem = null) => {
            warningMessage.classList.remove('d-none')
            rowElem.classList.add('line-warning')
            if (colElem) {
              colElem.classList.add('col-warning')
            }
          }
          if (row.length !== 15) {
            markWarning(trElem)
          }
          trElem.appendChild(tdElem)
          row.forEach((col, i) => {
            const tdElem = document.createElement('td')
            tdElem.innerText = col
            if (i === 12 && parseInt(col) > 40) {
              markWarning(trElem, tdElem)
            }
            if ([6, 8, 10, 12].includes(i) && !(col === 'N/A' || !isNaN(parseInt(col)))) {
              markWarning(trElem, tdElem)
            }
            if (i === 13 && isValidResultType(col)) {
              markWarning(trElem, tdElem)
            }
            if (i === 3 && barcodeCounts[col] > 1) {
              markWarning(trElem, tdElem)
            }

            trElem.appendChild(tdElem)
          })
          presentationTableTbody.appendChild(trElem)
        })
      }
      reader.onerror = function () {
        document.getElementById('fileContents').innerHTML = 'error reading file'
      }
    }
  })

  
  sendButtonBulk.addEventListener('click', async (e) => {
    e.preventDefault()
    let resultDate = datesToday.value;
    setLoader(sendButtonBulk, true)
    if (!data) {
      openModal(errorBulkModal)
      errorBulkContent.innerHTML = 'You should upload CSV file before'
      setLoader(sendButtonBulk, false)
      return
    }

    const sendAgainData = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => !row.checked)
      .map((row) => row.getAttribute('data-index'))

    const sendAgainDataVice = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => row.checked)
      .map((row) => row.getAttribute('data-barcode'))

    const failedValidation = []
    const duplicatedRow = []
    const alreadyExist = []
    const dataSentBackend = data
      .filter((row, i) => {
        const isInvalidNum = [6, 8, 10, 12].some(
          (num) => !(row[num] === 'N/A' || !isNaN(parseInt(row[num]))),
        )
        const isResultWrong = row[13] && isValidResultType(row[13])
        const isDuplicate = barcodeCounts[row[3]] > 1
        
        if (isInvalidNum || isResultWrong || !(row[12] <= 40 || row[12] === 'N/A')) {
          failedValidation.push({barCode: row[3]})
        }
        if (isDuplicate) {
          duplicatedRow.push({barCode: row[3]})
        }
        if (sendAgainData.indexOf(`${i}`) === 1) {
          alreadyExist.push({barCode: row[3]})
        }

        return (
          sendAgainData.indexOf(`${i}`) === -1 &&
          (row[12] <= 40 || row[12] === 'N/A') &&
          !isInvalidNum &&
          !isResultWrong &&
          !isDuplicate
        )
      })
      .map((row, i) => ({
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
        resultDate: resultDate,
        sendAgain: sendAgainDataVice.indexOf(row[3]) !== -1,
      }))

    const dataChunks = _.chunk(dataSentBackend, 5)
    let failedRows = []
    let isFatal = []

    for (let i = 0; i < dataChunks.length; i++) {
      const response = await fetch('/admin/api/v1/send-and-save-test-results-bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from,
          to,
          resultDate,
          results: dataChunks[i],
        }),
      })

      const responseData = await response.json()

      // This case should be only if server is down
      if (!response.ok) {
        setLoader(sendButtonBulk, false)
        openModal(errorBulkModal)
        errorBulkContent.innerHTML = ''
        const regexpFieldName = /.*\[\d*\]\./g
        const regexpFieldRow = /.*\[(\d*)\]\..*/g

        if (responseData?.errors?.length) {
          responseData.errors.map((err) => {
            const errorElem = document.createElement('p')
            const fieldName = err.param.replace(regexpFieldName, '')
            const index = parseInt(err.param.replace(regexpFieldRow, '$1'))
            errorElem.innerText = `At ${dataSentBackend[index].barCode} row ${fieldName} is invalid.`
            errorBulkContent.appendChild(errorElem)
          })
        } else {
          const errorElem = document.createElement('p')
          errorElem.innerText = `Invalid request`
          errorBulkContent.appendChild(errorElem)
        }
        isFatal = _.flatten(dataChunks.slice(i))
        break
      }
      failedRows = [...failedRows, ...responseData.data.failedRows]
    }

    let content = ''
    const succeedRows = dataSentBackend.filter((row) => {
      return (
        !failedRows.find((row2) => row2.barCode === row.barCode) &&
        !isFatal.find((row2) => row2.barCode === row.barCode)
      )
    })

    setLoader(sendButtonBulk, false)
    openModal(successModal)

    content += `Total rows: ${data.length}<br/>`
    content += `Successfully: ${succeedRows.length}<br/>`
    content += `Exists but is not marked for sent again: ${sendAgainData.length}<br/>`
    content += `Failed: ${failedRows.length + isFatal.length + failedValidation.length}<br/>`

    if (succeedRows.length) {
      const succeedRowsElem = succeedRows.map((row) => `<div>${row.barCode}</div>`).join('')
      content += `Succeed rows: ${succeedRowsElem}<br/>`
    }
    if (failedValidation.length) {
      const invalidRowsElem = failedValidation.map((row) => `<div>${row.barCode}</div>`).join('')
      content += `Failed rows. Reason: Validation Error ${invalidRowsElem}<br/>`
    }
    if (duplicatedRow.length) {
      const duplicatedRowsElem = duplicatedRow.map((row) => `<div>${row.barCode}</div>`).join('')
      content += `Failed rows. Reason: duplicated rows ${duplicatedRowsElem}<br/>`
    }
    if (failedRows.length) {
      const failedRowsElem = failedRows.map((row) => `<div>${row.barCode}</div>`).join('')
      content += `Failed rows. Reason: Appointment not found ${failedRowsElem}<br/>`
    }
    if (isFatal.length) {
      const fatalRowsElem = isFatal.map((row) => `<div>${row.barCode}</div>`).join('')
      content += `Failed rows. Reason: Internal Server Error ${fatalRowsElem}<br/>`
    }

    successModalContent.innerHTML = content
  })
})
