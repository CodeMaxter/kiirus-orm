const config = require('./../config/database')

const Kiirus = require('./../../Kiirus')

let builder = Kiirus.createBuilder(config)
builder.from('users').insertGetId({
  'name': 'Álvaro',
  'lastname': 'Agámez',
  'age': '36',
  'email': 'foo',
  'status': 1
}).then((insertId) => {
  console.log(insertId)
})

builder = Kiirus.createBuilder(config)
builder.from('users').insertGetId({
  'name': 'Álvaro',
  'lastname': 'Agámez',
  'age': '36',
  'email': 'foo',
  'status': 1
}).then((insertId) => {
  console.log(insertId)
})
