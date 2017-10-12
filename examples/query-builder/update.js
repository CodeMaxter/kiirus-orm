const config = require('./../config/database')

const Kiirus = require('./../../Kiirus')

let builder = Kiirus.createBuilder(config)
// builder.from('users')
//   .where('id', '=', 1)
//   .update({'email': 'email@domain.com', 'name': 'Álvaro José'})
//   .then((result) => {
//     console.log(result)
//   })

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
  })
