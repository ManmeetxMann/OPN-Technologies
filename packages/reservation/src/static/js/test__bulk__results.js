const parseCSV = (text) => {
  return text
    .split('\n')
    .filter((row) => !!row)
    .map((row) => row.split(',').map((row) => row.trim()))
}
document.addEventListener('DOMContentLoaded', () => {
  const bulkForm = document.getElementById('bulkSubmitResults')
  if (!bulkForm) {
    return
  }
  const csvFileInput = document.getElementById('csvFile')
  const presentationTable = document.getElementById('presentationTable')

  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) {
      var reader = new FileReader()
      reader.readAsText(file, 'UTF-8')
      reader.onload = function (evt) {
        const data = parseCSV(evt.target.result)
        presentationTable.classList.remove('d-none')
        data.forEach((row, i) => {
          const trElem = document.createElement('tr')
          const thElem = document.createElement('th')
          thElem.innerText = i + 1
          trElem.appendChild(thElem)
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
})
