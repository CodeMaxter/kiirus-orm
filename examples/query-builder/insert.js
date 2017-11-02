const { kiirus: config } = require('./../config/database')

const Kiirus = require('./../../Kiirus')

var mysql = require('mysql')
var conn = mysql.createConnection(config)

// const sql = 'insert into `users` (`name`, `lastname`, `age`, `email`, `status`) values ?'
// const values = [
//   ['Álvaro', 'Agámez', 36, 'alvaro.agamez@email.com', 1],
//   ['John', 'Doe', 20, 'john.doe@email.com', 1],
//   ['James', 'Howlett', 137, 'james.howlett@email.com', 1]
// ]
// conn.query(sql, [values], (err, result) => {
//   if (err) throw err

//   conn.end()

//   console.log(result)
// })

// Inserts

let builder = Kiirus.createBuilder(config)
builder.from('users').insertGetId({
  'name': 'Nathaniel',
  'lastname': 'Essex',
  'age': 158,
  'email': 'nathaniel.essex@email.com',
  'status': 1
}).then((insertId) => {
  console.log(insertId)
}).catch((error) => {
  console.log(error)
})

// builder = Kiirus.createBuilder(config)
// builder.from('users').insert([{
//   'name': 'Álvaro',
//   'lastname': 'Agámez',
//   'age': 36,
//   'email': 'alvaro.agamez@email.com',
//   'status': 1
// }, {
//   'name': 'John',
//   'lastname': 'Doe',
//   'age': 20,
//   'email': 'john.doe@email.com',
//   'status': 1
// }, {
//   'name': 'James',
//   'lastname': 'Howlett',
//   'age': 137,
//   'email': 'james.howlett@email.com',
//   'status': 1
// }]).then((result) => {
//   console.log(result)
// }).catch((error) => {
//   console.log(error)
// })
