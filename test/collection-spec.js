'use strict'

const expect = require('chai').expect
const Collection = require('./../Kiirus/Support/Collection')

describe('Collection', () => {
  describe('#filter', () => {
    it('Execute a Filter Function On The Collection', () => {
      let collection = new Collection([{'id': 1, 'name': 'Hello'}, {'id': 2, 'name': 'World'}])
      expect(collection.filter((item) => {
        return item.id === 2
      }).all()).to.be.deep.equal([{'id': 2, 'name': 'World'}])

      collection = new Collection(['', 'Hello', '', 'World'])
      expect(collection.filter().values().toArray()).to.be.deep.equal(['Hello', 'World'])

      collection = new Collection({'id': 1, 'first': 'Hello', 'second': 'World'})
      expect(collection.filter((item, key) => {
        return key !== 'id'
      }).all()).to.be.deep.equal({'first': 'Hello', 'second': 'World'})
    })
  })

  describe('#get', () => {
    it('Array Access Get', () => {
      const collection = new Collection(['foo', 'bar'])

      expect(collection.get(0)).to.equal('foo')
      expect(collection.get(1)).to.equal('bar')
    })
  })

  describe('#implode', () => {
    it('Test Implode', () => {
      let data = new Collection([{'name': 'taylor', 'email': 'foo'}, {'name': 'dayle', 'email': 'bar'}])
      expect(data.implode('email')).to.be.equal('foobar')
      expect(data.implode('email', ',')).to.be.equal('foo,bar')

      data = new Collection(['taylor', 'dayle'])
      expect('taylordayle').to.be.equal(data.implode(''))
      expect('taylor,dayle').to.be.equal(data.implode(','))
    })
  })

  describe('#isEmpty', () => {
    it('Empty Collection Is Empty', function () {
      const collection = new Collection()

      expect(collection.isEmpty()).to.be.equal(true)
    })
  })

  describe('#map', () => {
    it('Execute a Callbak On Each Element Of Collection', () => {
      let data = new Collection(['Álvaro', 'Agámez'])

      data = data.map((item, key) => {
        return item.split('').reverse().join('')
      })

      expect(['oravlÁ', 'zemágA']).to.be.deep.equal(data.all())
    })
  })

  describe('#offsetExists', () => {
    it('Array Access Offset Exists', () => {
      const collection = new Collection(['foo', 'bar'])

      expect(collection.offsetExists(0)).to.be.equal(true)
      expect(collection.offsetExists(1)).to.be.equal(true)
      expect(collection.offsetExists(1000)).to.be.equal(false)
    })
  })

  describe('#pluck', () => {
    it('Pluck With Array And Object Values', () => {
      let data = new Collection([{'name': 'taylor', 'email': 'foo'}, {'name': 'dayle', 'email': 'bar'}])

      expect(data.pluck('email', 'name').all()).to.be.deep.equal({'taylor': 'foo', 'dayle': 'bar'})
      expect(data.pluck('email').all()).to.be.deep.equal(['foo', 'bar'])
    })

    it('Pluck With Array Access Values', () => {
      const data = new Collection([
        {'name': 'taylor', 'email': 'foo'},
        {'name': 'dayle', 'email': 'bar'}
      ])

      expect(data.pluck('email', 'name').all()).to.be.deep.equal({'taylor': 'foo', 'dayle': 'bar'})
      expect(data.pluck('email').all()).to.be.deep.equal(['foo', 'bar'])
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
