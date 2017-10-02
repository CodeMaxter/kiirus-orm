'use strict'

const config = require('./config/database')

const Kiirus = require('./../Kiirus')

const builder = Kiirus.createBuilder(config)

builder.select('*').from('users')
console.log(builder.toSql())

// Retrieving All Rows From A Table
builder.from('users').get().then((users) => {
  for (const user of users.all()) {
    console.log(`${user.name} ${user.lastname}`)
  }
})

// Retrieving A Single Row / Column From A Table
builder.from('users').where('name', 'John').first().then((user) => {
  console.log(user.name)
})

// Retrieving A List Of Column Values
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
builder.from('users').count().then((count) => {
  console.log(`The are ${count} ${count === 1 ? 'register' : 'registers'}`)
})

builder.from('users').max('age').then((max) => {
  console.log(`The biggest age is: ${max}`)
})

builder.from('users').avg('age').then((avg) => {
  console.log(`The average age is: ${avg}`)
})
