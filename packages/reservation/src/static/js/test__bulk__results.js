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
        const isValid = data.every((r) => r.length === 9)
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
      .map((row) => row.getAttribute('data-barcode'))
    const sendAgainDataVice = [...document.getElementsByClassName('sendAgainCheckbox')]
      .filter((row) => row.checked)
      .map((row) => row.getAttribute('data-barcode'))
    const dataSentBackend = data
      .filter((row) => sendAgainData.indexOf(row[0]) === -1)
      .map((row) => ({
        barCode: row[0],
        famEGeneElem: row[1],
        famCtElem: row[2],
        calRed61RdRpGeneElem: row[3],
        calRed61CtElem: row[4],
        quasar670NGeneElem: row[5],
        quasar670CtElem: row[6],
        hexICElem: row[7],
        hexCtElem: row[8],
        isAgain: sendAgainDataVice.indexOf(row[0]) !== -1,
      }))

    await fetch('/admin/api/v1/send-and-save-test-results-bulk', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to,
        results: dataSentBackend,
      }),
    })
  })
})
