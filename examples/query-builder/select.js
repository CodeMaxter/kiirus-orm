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

// Selects

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

// selectRaw

builder = Kiirus.createBuilder(config)
builder.from('film')
  .selectRaw('replacement_cost * ? as replacement_cost_with_tax', [1.0825])
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

// whereRaw / orWhereRaw

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereRaw('replacement_cost > IF(rental_rate = 4.99, ?, 10)', [20])
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

// havingRaw / orHavingRaw

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

// orderByRaw

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

// Where Clauses

// Simple Where Clauses

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('rental_duration', '=', 6)
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('rental_duration', 6)
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('rental_duration', '>=', 3)
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('rental_duration', '<>', 6)
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('title', 'like', 'T%')
  .get().then((films) => {
    console.log(films.all())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('customer').where([
  ['active', '=', '1'],
  ['store_id', '<>', '1']
]).get().then((customers) => {
  console.log(customers.all())
  console.log(builder.toSql())
}).catch((error) => {
  console.log(error)
})

// Or Statements

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('rental_rate', '>', 2.5)
  .orWhere('rental_rate', '4.99')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// whereBetween / whereNotBetween

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereBetween('length', [46, 110]).get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereNotBetween('length', [46, 110]).get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// whereIn / whereNotIn

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereIn('id', [1, 2, 3])
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereNotIn('id', [1, 2, 3])
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// whereNull / whereNotNull

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereNull('original_language_id')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereNotNull('original_language_id')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// whereDate / whereMonth / whereDay / whereYear

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereDate('last_update', '2006-02-18')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereMonth('last_update', '02')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereDay('last_update', '18')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereYear('last_update', '2006')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// whereColumn

builder = Kiirus.createBuilder(config)
builder.from('customer')
  .whereColumn('first_name', 'last_name')
  .get().then((customers) => {
    console.log(customers.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('customer')
  .whereColumn('last_update', '>', 'create_date')
  .get().then((customers) => {
    console.log(customers.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('customer')
  .whereColumn([
    ['first_name', '=', 'last_name'],
    ['last_update', '>', 'create_date']
  ]).get().then((customers) => {
    console.log(customers.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// Parameter Grouping

builder = Kiirus.createBuilder(config)
builder.from('film')
  .where('length', '=', 112)
  .orWhere((query) => {
    query.where('rental_duration', '>', 4)
      .where('rental_rate', '<>', 4.99)
  })
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// Where Exists Clauses

builder = Kiirus.createBuilder(config)
builder.from('film')
  .whereExists((query) => {
    query.select(new Raw(1))
      .from('film_actor')
      .whereRaw('film_actor.film_id = film.id')
  })
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// JSON Where Clauses

builder = Kiirus.createBuilder(config)
builder.from('users')
  .where('options->language', 'en')
  .get().then((users) => {
    console.log(users.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('users')
  .where('preferences->dining->meal', 'salad')
  .get().then((users) => {
    console.log(users.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// Ordering, Grouping, Limit, & Offset

// orderBy

builder = Kiirus.createBuilder(config)
builder.from('film')
  .orderBy('title', 'desc')
  .get().then((films) => {
    console.log(films.all())
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// latest / oldest

builder = Kiirus.createBuilder(config)
builder.from('film')
  .latest('last_update')
  .first().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .inRandomOrder()
  .first().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// groupBy / having

builder = Kiirus.createBuilder(config)
builder.from('film')
  .groupBy('language_id')
  .having('language_id', '>', 2)
  .get().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// skip / take

builder = Kiirus.createBuilder(config)
builder.from('film')
  .skip(10)
  .take(5)
  .get().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

builder = Kiirus.createBuilder(config)
builder.from('film')
  .offset(10)
  .limit(5)
  .get().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

// Conditional Clauses

const language = 3

builder = Kiirus.createBuilder(config)
builder.from('film')
  .when(language, (query) => {
    return query.where('language_id', language)
  })
  .get().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })

const sortBy = null

builder = Kiirus.createBuilder(config)
builder.from('film')
  .when(sortBy, (query) => {
    return query.orderBy(sortBy)
  }, (query) => {
    return query.orderBy('title')
  })
  .get().then((films) => {
    console.log(films)
    console.log(builder.toSql())
  }).catch((error) => {
    console.log(error)
  })
