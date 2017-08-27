'use strict'

const expect = require('chai').expect
const Collection = require('./../Kiirus/Support/Collection')

describe('Collection', function () {
  describe('#map', function () {
    it('Execute a Callbak On Each Element Of Collection', function () {
      let data = new Collection(['Álvaro', 'Agámez'])

      data = data.map(function (item, key) {
        return item.split('').reverse().join('')
      })

      expect(['oravlÁ', 'zemágA']).to.be.deep.equal(data.all())
    })
  })
})
