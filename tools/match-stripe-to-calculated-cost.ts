/**
 * Get Details for All Packages that are used in appointments
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

export enum PriceUpdateSource {
  FromBusinessInput = 'fromBusinessInput',
  FromDescription = 'fromDescription',
}

async function updateSourceForOneTimeUsedCoupons() {
  let count = 0
  const sql = `SELECT * FROM appointments WHERE datetimeCreated >= DATE('2020-11-01') AND datetimeCreated <= DATE('2020-11-30') AND amountPaid>0`
  conn
    .query(sql, [])
    .on('error', (err) => {
      const message = `${sql} Failed ${err.sqlMessage}`
      console.log(message)
    })
    .on('result', (record) => {
      const acuityId = record.acuityId
      const sql2 = `SELECT * FROM stripe_charges_nov WHERE description LIKE '%${acuityId}%'`
      console.log(sql2)
      conn
        .query(sql2, [])
        .on('error', (err) => {
          const message = `${sql2} Failed ${err.sqlMessage}`
          console.log(message)
        })
        .on('result', (record2) => {
          let sql3 = ''
          if (record2.reporting_category === 'charge') {
            sql3 = `UPDATE appointments SET stripeMatchFound=1 WHERE acuityId = ${acuityId}`
          } else {
            sql3 = `UPDATE appointments SET stripeMatchFoundForRefund=1 WHERE acuityId = ${acuityId}`
          }

          conn
            .query(sql3, [])
            .on('error', (err) => {
              console.log(err)
              const message = `${sql3} Failed ${err.sqlMessage}`
              console.log(message)
            })
            .on('end', () => {
              console.log(`stripeMatchFound: ${acuityId}`)
            })

          const sql4 = `UPDATE stripe_charges_nov SET matchFound=1 WHERE balance_transaction_id = '${record2.balance_transaction_id}'`
          conn
            .query(sql4, [])
            .on('error', (err) => {
              const message = `${sql4} Failed ${err.sqlMessage}`
              console.log(message)
            })
            .on('end', () => {
              console.log(`matchFound: ${record2.balance_transaction_id}`)
            })
        })
        .on('end', () => {
          count++
          console.log(`end: ${acuityId} : ${count}`)
        })
    })
    .on('end', () => {
      console.log(`updateSourceForFreeAppointmentFHHealthEmail`)
    })
}

;(async () => {
  await updateSourceForOneTimeUsedCoupons()

  //conn.end()
  console.log('Script Complete \n')
})()
