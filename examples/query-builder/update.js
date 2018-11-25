const { kiirus: config } = require('./../config/database')

const { QueryBuilder } = require('./../../Kiirus')

let builder

// Updates

/* builder = QueryBuilder(config)
builder.from('users')
  .where('id', 1)
  .update({'email': 'email@domain.com', 'name': 'Álvaro José'})
  .then((result) => {
    console.log(result)
  }).catch((error) => {
    console.log(error)
  })

builder = QueryBuilder(config)
builder.from('users')
  .updateOrInsert({'email': 'email@domain.com'}, {
    'name': 'James',
    'lastname': 'Howlett',
    'email': 'james.howlett@email.com',
    'age': 100,
    'status': 1
  })
  .then((result) => {
    console.log(result)
  }).catch((error) => {
    console.log(error)
  })

builder = QueryBuilder(config)
builder.transaction(() => {
  builder.from('users')
    .update({'votes': 3}).then((result) => {
      console.log(result)
    }).catch((error) => {
      console.log(error)
    })
})

// Updating JSON Columns

builder = QueryBuilder(config)
builder.from('users')
  .where('id', 1)
  .update({'options->enabled': true}).then((result) => {
    console.log(result)
  }).catch((error) => {
    console.log(error)
  }) */

// Increment & Decrement

// builder = QueryBuilder(config)
//   .from('users')
//   .increment('votes').then((result) => {
//     console.log(result)
//   }).catch((error) => {
//     console.log(error)
//   })

// builder = QueryBuilder(config)
// builder.from('users')
//   .increment('votes', 5).then((result) => {
//     console.log(result)
//   }).catch((error) => {
//     console.log(error)
//   })

// builder = QueryBuilder(config)
// builder.from('users')
//   .decrement('votes').then((result) => {
//     console.log(result)
//   }).catch((error) => {
//     console.log(error)
//   })

builder = QueryBuilder(config)
builder.from('users')
  .decrement('votes', 5).then((result) => {
    console.log(result)
  }).catch((error) => {
    console.log(error)
  })
