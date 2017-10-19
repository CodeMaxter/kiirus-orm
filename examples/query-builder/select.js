'use strict'

const config = require('./../config/database')

const Kiirus = require('./../../Kiirus')
const { Expression: Raw } = require('./../../Kiirus')

// Get Generated SQL
// builder = Kiirus.createBuilder(config)
// builder.select('*').from('users')
// console.log(builder.toSql()) // this line hang out the other builder instances

// Retrieving All Rows From A Table
let builder = Kiirus.createBuilder(config)
builder.from('users').get().then((users) => {
  for (const user of users.all()) {
    console.log(`${user.name} ${user.lastname}`)
  }
})

/* // Retrieving A Single Row / Column From A Table
builder = Kiirus.createBuilder(config)
builder.from('users').where('name', 'John').first().then((user) => {
  console.log(user.name)
})

// Retrieving A List Of Column Values
builder = Kiirus.createBuilder(config)
builder.from('users').pluck('name').then((users) => {
  for (const user of users.all()) {
    console.log(user)
  }
})

builder.from('users').pluck('name', 'lastname').then((users) => {
  for (const [lastname, name] of Object.entries(users.all())) {
    console.log(name, lastname)
  }
})

// Aggregates
builder = Kiirus.createBuilder(config)
builder.from('users').count().then((count) => {
  console.log(`The are ${count} ${count === 1 ? 'register' : 'registers'}`)
})

builder.from('users').max('age').then((max) => {
  console.log(`The biggest age is: ${max}`)
})

builder.from('users').avg('age').then((avg) => {
  console.log(`The average age is: ${avg}`)
})

// Specifying A Select Clause
builder = Kiirus.createBuilder(config)
builder.from('users').select('name', 'email as user_email').get()
  .then((users) => {
    console.log(users.all())
  })

builder.from('users').distinct('name', 'email as user_email').get()
  .then((users) => {
    console.log(users.all())
  })

// Raw Expressions
builder.from('users')
  .select(new Raw('count(*) as user_count, status'))
  .where('status', '<>', 1)
  .groupBy('status')
  .get().then((users) => {
    console.log(users.all())
  }) */
