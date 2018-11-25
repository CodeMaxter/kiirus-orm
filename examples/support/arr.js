const { Arr } = require('./../../Kiirus/Support')

let values = [{
  'name': 'Álvaro',
  'lastname': 'Agámez',
  'age': 36,
  'email': 'alvaro.agamez@email.com',
  'status': 1
}]

console.log(Arr.flatten(values, 1))

values = [{
  'name': 'Álvaro',
  'lastname': 'Agámez',
  'age': 36,
  'email': 'alvaro.agamez@email.com',
  'status': 1
}, {
  'name': 'John',
  'lastname': 'Doe',
  'age': 20,
  'email': 'john.doe@email.com',
  'status': 1
}, {
  'name': 'James',
  'lastname': 'Howlett',
  'age': 137,
  'email': 'james.howlett@email.com',
  'status': 1
}]

console.log(Arr.flatten(values, 1))
