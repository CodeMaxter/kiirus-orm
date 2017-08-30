'use strict'

const expect = require('chai').expect

const Arr = require('./../Kiirus/Support/Arr')

describe('Arr', () => {
  describe('#except', () => {
    it('Array Except', () => {
      let array = { 'name': 'Desk', 'price': 100 }

      array = Arr.except(array, ['price'])

      expect(array).to.deep.equal({ 'name': 'Desk' })
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

  describe('#unset', () => {
    it('Array Unset', () => {
      let array = { 'products': { 'desk': { 'price': 100 } } }

      Arr.unSet(array, 'products.desk')
      expect(array).to.deep.equal({ 'products': {} })
    })
  })
})
