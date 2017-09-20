'use strict'

const expect = require('chai').expect

const Arr = require('./../Kiirus/Support/Arr')
const Helper = require('./../Kiirus/Support/Helper')

describe('Arr', () => {
  describe('#except', () => {
    it('Array Except', () => {
      let array = {'name': 'Desk', 'price': 100}

      array = Arr.except(array, ['price'])

      expect(array).to.be.deep.equal({'name': 'Desk'})
    })
  })

  describe('#exists', () => {
    it('Array Exists', () => {
      expect(Arr.exists([1], 0)).to.be.equal(true)
      expect(Arr.exists([null], 0)).to.be.equal(true)
      expect(Arr.exists({ 'a': 1 }, 'a')).to.be.equal(true)
      expect(Arr.exists({ 'a': null }, 'a')).to.be.equal(true)
      // expect(Arr.exists(new Collection({'a': null}), 'a')).to.be.equal(true)

      expect(Arr.exists([1], 1)).to.be.equal(false)
      expect(Arr.exists([null], 1)).to.be.equal(false)
      expect(Arr.exists({ 'a': 1 }, 0)).to.be.equal(false)
      // expect(Arr.exists(new Collection({'a': null}), 'b')).to.be.equal(false)
    })
  })

  describe('#first', () => {
    it('Test First', () => {
      const array = [100, 200, 300]
      const value = Arr.first(array, (value) => {
        return value >= 150
      })
      expect(value).to.be.equal(200)
      expect(Arr.first(array)).to.be.equal(100)
    })
  })

  describe('#flatten', () => {
    it('Array Flatten', () => {
      expect(['taylor', 'php', 'javascript', null]).to.deep.equal(Arr.flatten({'name': 'taylor', 'languages': ['php', 'javascript', null]}))
    })
  })

  describe('#forget', () => {
    it('Array Forget', () => {
      let array = { 'products': { 'desk': { 'price': 100 } } }

      Arr.forget(array, null)
      expect(array).to.be.deep.equal({ 'products': { 'desk': { 'price': 100 } } })

      array = { 'products': { 'desk': { 'price': 100 } } }
      Arr.forget(array, {})
      expect(array).to.be.deep.equal({ 'products': { 'desk': { 'price': 100 } } })

      array = { 'products': { 'desk': { 'price': 100 } } }
      Arr.forget(array, 'products.desk')
      expect(array).to.deep.equal({ 'products': {} })

      array = { 'products': { 'desk': { 'price': 100 } } }
      Arr.forget(array, 'products.desk.price')
      expect(array).to.deep.equal({ 'products': { 'desk': {} } })

      array = { 'products': { 'desk': { 'price': 100 } } }
      Arr.forget(array, 'products.final.price')
      expect(array).to.deep.equal({ 'products': { 'desk': { 'price': 100 } } })

      array = { 'shop': { 'cart': { 150: 0 } } }
      Arr.forget(array, 'shop.final.cart')
      expect(array).to.deep.equal({ 'shop': { 'cart': { 150: 0 } } })

      array = { 'products': { 'desk': { 'price': { 'original': 50, 'taxes': 60 } } } }
      Arr.forget(array, 'products.desk.price.taxes')
      expect(array).to.deep.equal({ 'products': { 'desk': { 'price': { 'original': 50 } } } })

      array = { 'products': { 'desk': { 'price': { 'original': 50, 'taxes': 60 } } } }
      Arr.forget(array, 'products.desk.final.taxes')
      expect(array).to.deep.equal({ 'products': { 'desk': { 'price': { 'original': 50, 'taxes': 60 } } } })

      array = { 'products': { 'desk': { 'price': 50 }, null: 'something' } }
      Arr.forget(array, ['products.amount.all', 'products.desk.price'])
      expect(array).to.deep.equal({ 'products': { 'desk': {}, null: 'something' } })

      // Only works on first level keys
      array = { 'joe@example.com': 'Joe', 'jane@example.com': 'Jane' }
      Arr.forget(array, 'joe@example.com')
      expect(array).to.deep.equal({ 'jane@example.com': 'Jane' })

      // // Does not work for nested keys
      array = { 'emails': { 'joe@example.com': { 'name': 'Joe' }, 'jane@localhost': { 'name': 'Jane' } } }
      Arr.forget(array, ['emails.joe@example.com', 'emails.jane@localhost'])
      expect(array).to.deep.equal({ 'emails': { 'joe@example.com': { 'name': 'Joe' } } })
    })
  })

  describe('#isAssoc', () => {
    it('Array Is Assoc', () => {
      expect(Arr.isAssoc({ 'a': 'green', 'b': 'red' })).to.equal(true)
      expect(Arr.isAssoc([{ 'a': 'green' }, 'red', { 'b': 'green' }, 'blue', 'red'])).to.equal(false)
    })
  })

  describe('#keyExists', () => {
    it('Array Key Exists', () => {
      const casts = [
        {'intAttribute': 'int'},
        {'floatAttribute': 'float'},
        {'stringAttribute': 'string'},
        {'boolAttribute': 'bool'},
        {'booleanAttribute': 'boolean'},
        {'objectAttribute': 'object'},
        {'arrayAttribute': 'array'},
        {'jsonAttribute': 'json'},
        {'dateAttribute': 'date'},
        {'datetimeAttribute': 'datetime'},
        {'timestampAttribute': 'timestamp'}
      ]

      expect(Arr.keyExists('kevin', {'kevin': 'van Zonneveld'})).to.be.equal(true)
      expect(Arr.keyExists('products.desk.price', {'products': {'desk': {'price': 50}, null: 'something'}})).to.be.equal(true)
      expect(Arr.keyExists('stringAttribute', casts)).to.be.equal(true)

      expect(Arr.keyExists('john', ['kevin', 'john', 'van Zonneveld'])).to.be.equal(false)
      expect(Arr.keyExists('john', {'kevin': 'van Zonneveld'})).to.be.equal(false)
    })
  })

  describe('#pluck', function () {
    it('Array Pluck', function () {
      let testArray = [
        {'developer': {'name': 'Taylor'}},
        {'developer': {'name': 'Abigail'}}
      ]
      testArray = Arr.pluck(testArray, 'developer.name')
      expect(testArray).to.deep.equal(['Taylor', 'Abigail'])

      testArray = [{'id': 1, 'foo': 'bar'}, {'id': 10, 'foo': 'baz'}]
      testArray = Arr.pluck(testArray, 'foo', 'id')
      expect(testArray).to.deep.equal({1: 'bar', 10: 'baz'})
    })
  })

  describe('#unset', () => {
    it('Array Unset', () => {
      let array = { 'products': { 'desk': { 'price': 100 } } }

      Arr.unSet(array, 'products.desk')
      expect(array).to.deep.equal({ 'products': {} })
    })
  })

  describe('#where', () => {
    it('Test Where', () => {
      let array = [100, '200', 300, '400', 500]

      array = Arr.where(array, function (value, key) {
        return Helper.isString(value)
      })

      expect(['200', '400']).to.be.deep.equal(array)
    })
  })

  describe('#wrap', () => {
    it('Test Wrap', () => {
      const string = 'a'
      const array = ['a']
      const object = {}
      object.value = 'a'

      expect(['a']).to.be.deep.equal(Arr.wrap(string))
      expect(array).to.be.deep.equal(Arr.wrap(array))
      expect([object]).to.be.deep.equal(Arr.wrap(object))
    })
  })
})
