/**
 * Get Acuity IDs from Stripe
 */
import mysql from 'mysql'

//LOCAL DB. HardCoding for now
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'finance',
  port: 8889,
})

async function validateStripeCharges() {
  const acuityIds = []
  const sql = `SELECT balance_transaction_id,description FROM stripe_charges_oct WHERE description!=''`
  conn
    .query(sql, [])
    .on('error', (err) => {
      const message = `${sql} Failed ${err.sqlMessage}`
      console.log(message)
    })
    .on('result', (record) => {
      const matchedStrings = record.description.match(/\) [0-9]+ Acuity/g)
      if (matchedStrings) {
        matchedStrings.forEach((element) => {
          const acuityId = element.match(/[0-9]+/g)[0]
          const stripeCharge = {
            balance_transaction_id: record.balance_transaction_id,
            acuityId: acuityId,
          }
          acuityIds.push(stripeCharge)
        })
      }
    })
    .on('end', () => {
      console.log(acuityIds)
      saveAcuityId(acuityIds)
      //count_duplicate(acuityIds)
    })
}

async function saveAcuityId(acuityIds) {
  let count = 0
  acuityIds.forEach((element) => {
    const sql = `INSERT INTO stripe_acuity_id_assoc (balance_transaction_id, acuity_id) VALUES("${element.balance_transaction_id}", ${element.acuityId}) ON DUPLICATE KEY UPDATE acuity_id=${element.acuityId}`
    console.log(sql)
    conn
      .query(sql, [])
      .on('error', (err) => {
        const message = `${sql} Failed ${err.sqlMessage}`
        console.log(message)
      })
      .on('end', () => {
        count++
        if (count === acuityIds.length) {
          conn.end()
        }
      })
  })
}

;(async () => {
  await validateStripeCharges()
  //conn.end()
  console.log('Script Complete \n')
})()
