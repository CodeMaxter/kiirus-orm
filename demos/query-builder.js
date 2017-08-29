'use strict'

const builderStub = require('../test/stubs/builder')

const builder = builderStub.getBuilder()

builder.select('*').from('users')
console.log(builder.toSql())

// Retrieving A Single Row / Column From A Table
// builder.from('users').where('name', 'John').first().then((user) => {
//   console.log(user.name)
// })
