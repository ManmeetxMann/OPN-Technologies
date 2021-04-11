let dataRaw = {
  appointmentID:'NG8ZehhcCvWW1u3ABxlI',
  testResultID:'SAMSAyzMHpvOHMvQ0GfW'
}
let data = Buffer.from(JSON.stringify(dataRaw)).toString('base64')
console.log(data)
console.log(JSON.parse(Buffer.from(data, 'base64').toString()))