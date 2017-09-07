'use strict'

const expect = require('chai').expect
const Collection = require('./../Kiirus/Support/Collection')

describe('Collection', function () {
  describe('#filter', function () {
    it('Execute a Filter Function On The Collection', function () {
      let collection = new Collection([{'id': 1, 'name': 'Hello'}, {'id': 2, 'name': 'World'}])
      expect([{'id': 2, 'name': 'World'}]).to.be.deep.equal(collection.filter((item) => {
        return item.id === 2
      }).all())

      collection = new Collection(['', 'Hello', '', 'World'])
      expect(['Hello', 'World']).to.be.deep.equal(collection.filter().values().toArray())

      collection = new Collection({'id': 1, 'first': 'Hello', 'second': 'World'})
      expect({'first': 'Hello', 'second': 'World'}).to.be.deep.equal(collection.filter((item, key) => {
        return key !== 'id'
      }).all())
    })
  })

  describe('#map', function () {
    it('Execute a Callbak On Each Element Of Collection', function () {
      let data = new Collection(['Álvaro', 'Agámez'])

      data = data.map(function (item, key) {
        return item.split('').reverse().join('')
      })

      expect(['oravlÁ', 'zemágA']).to.be.deep.equal(data.all())
    })
  })

  describe('#reject', () => {
    it('Reject Removes Elements Passing Truth Test', () => {
      let collection = new Collection(['foo', 'bar'])
      expect(['foo']).to.be.deep.equal(collection.reject('bar').values().all())

      collection = new Collection(['foo', 'bar'])
      expect(['foo']).to.be.deep.equal(collection.reject((value) => {
        return value === 'bar'
      }).values().all())

      collection = new Collection(['foo', null])
      expect(['foo']).to.be.deep.equal(collection.reject(null).values().all())

      collection = new Collection(['foo', 'bar'])
      expect(['foo', 'bar']).to.be.deep.equal(collection.reject('baz').values().all())

      collection = new Collection(['foo', 'bar'])
      expect(['foo', 'bar']).to.be.deep.equal(collection.reject((value) => {
        return value === 'baz'
      }).values().all())

      collection = new Collection({'id': 1, 'primary': 'foo', 'secondary': 'bar'})
      expect({'primary': 'foo', 'secondary': 'bar'}).to.be.deep.equal(collection.reject((item, key) => {
        return key === 'id'
      }).all())
    })
  })

  describe('#values', () => {
    it('Test Values', () => {
      const collection = new Collection([{'id': 1, 'name': 'Hello'}, {'id': 2, 'name': 'World'}])

      expect([{'id': 2, 'name': 'World'}]).to.be.deep.equal(collection.filter((item) => {
        return item.id === 2
      }).values().all())
    })
  })
})
