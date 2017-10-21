'use strict'

const config = require('./../config/database')

const Kiirus = require('./../../Kiirus')
const { Expression: Raw } = require('./../../Kiirus')

// Get Generated SQL
let builder = Kiirus.createBuilder(config)
builder.select('*').from('actor')
console.log(builder.toSql())

// Retrieving All Rows From A Table
builder = Kiirus.createBuilder(config)
builder.from('actor').get().then((actors) => {
  for (const actor of actors.all()) {
    console.log(`${actor.first_name} ${actor.last_name}`)
  }
}).catch((error) => {
  console.log(error)
})

// Retrieving A Single Row / Column From A Table
builder = Kiirus.createBuilder(config)
builder.from('actor').where('first_name', 'KEVIN').first().then((actor) => {
  console.log(actor.first_name)
}).catch((error) => {
  console.log(error)
})

// Retrieving A List Of Column Values
builder = Kiirus.createBuilder(config)
builder.from('actor').pluck('first_name').then((actors) => {
  for (const actor of actors.all()) {
    console.log(actor)
  }
}).catch((error) => {
  console.log(error)
})

builder = Kiirus.createBuilder(config)
builder.from('actor').pluck('name', 'lastname').then((actors) => {
  for (const [lastname, firstname] of Object.entries(actors.all())) {
    console.log(lastname, firstname)
  }
}).catch((error) => {
  console.log(error)
})

// Aggregates
builder = Kiirus.createBuilder(config)
builder.from('actor').count().then((count) => {
  console.log(`The are ${count} ${count === 1 ? 'register' : 'registers'}`)
}).catch((error) => {
  console.log(error)
})

builder = Kiirus.createBuilder(config)
builder.from('film').max('replacement_cost').then((max) => {
  console.log(`The biggest replacement_cost is: ${max}`)
}).catch((error) => {
  console.log(error)
})

builder = Kiirus.createBuilder(config)
builder.from('film').avg('replacement_cost').then((avg) => {
  console.log(`The average replacement_cost is: ${avg}`)
}).catch((error) => {
  console.log(error)
})

// Specifying A Select Clause
builder = Kiirus.createBuilder(config)
builder.from('film').select('title', 'length as duration').get()
  .then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film').distinct('title', 'length as duration').get()
  .then((users) => {
    console.log(users.all())
  }).catch((error) => {
    console.log(error)
  })

// Raw Expressions

// Raw statements will be injected into the query as strings, so you should be
// extremely careful to not create SQL injection vulnerabilities.
builder = Kiirus.createBuilder(config)
builder.from('film')
  .select(new Raw('count(*) as film_count, rating'))
  .where('rental_rate', '<>', 0.99)
  .groupBy('rental_rate')
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

// Raw Methods
builder = Kiirus.createBuilder(config)
builder.from('film')
  .selectRaw('replacement_cost * ? as replacement_cost_with_tax', [1.0825])
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereRaw('replacement_cost > IF(rental_rate = 4.99, ?, 10)', [20])
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .select('title', builder.raw('SUM(replacement_cost) as total_sales'))
  .groupBy('rating')
  .havingRaw('SUM(replacement_cost) > 2500')
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .orderByRaw('last_update DESC')
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

// Joins
// Inner Join Clause
builder = Kiirus.createBuilder(config)
builder.from('actor')
  .join('film_actor', 'actor.id', '=', 'film_actor.actor_id')
  .join('film', 'film.id', '=', 'film_actor.film_id')
  .select('actor.*', 'film.title', 'film.release_year')
  .get().then((actors) => {
    console.log(actors.all())
  }).catch((error) => {
    console.log(error)
  })

// Left Join Clause
builder = Kiirus.createBuilder(config)
builder.from('customer')
  .leftJoin('rental', 'customer.id', '=', 'rental.customer_id')
  .get().then((customers) => {
    console.log(customers.all())
  }).catch((error) => {
    console.log(error)
  })

// Cross Join Clause
builder = Kiirus.createBuilder(config)
builder.from('customer')
  .crossJoin('address')
  .get().then((customers) => {
    console.log(customers.all())
  }).catch((error) => {
    console.log(error)
  })

// Advanced Join Clauses
builder = Kiirus.createBuilder(config)
builder.from('customer')
  .join('address', (join) => {
    join.on('customer.address_id', '=', 'address.id')
  })
  .get().then((customers) => {
    console.log(customers.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('customer')
  .join('address', (join) => {
    join.on('customer.address_id', '=', 'address.id')
      .where('address.id', '>', 5)
  })
  .get().then((customers) => {
    console.log(customers.all())
  }).catch((error) => {
    console.log(error)
  })

// Unions
builder = Kiirus.createBuilder(config)
const first = builder.from('customer')
  .where('active', 1)

builder = Kiirus.createBuilder(config)
builder.from('customer')
  .where('store_id', 2)
  .union(first)
  .get().then((customers) => {
    console.log(customers.all())
  }).catch((error) => {
    console.log(error)
  })
