const { kiirus: config } = require('./../config/database')

const { QueryBuilder } = require('./../../Kiirus')

// Inserts

let builder

bVoy

// builder = QueryBuilder(config)
// builder.from('users').insert([{
//   'name': 'Remy',
//   'lastname': 'Etienne LeBeau',
//   'age': 23,
//   'email': 'remy.lebeau@email.com',
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

// builder = QueryBuilder(config)
// builder.from('users').insertGetId({
//   'name': 'Charles Francis',
//   'lastname': 'Xavier',
//   'age': 53,
//   'email': 'charles.xavier@email.com',
//   'status': 1
// }).then((insertId) => {
//   console.log(insertId)
// }).catch((error) => {
//   console.log(error)
// })
