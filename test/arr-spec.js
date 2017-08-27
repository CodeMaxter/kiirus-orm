'use strict'

const expect = require('chai').expect
const Arr = require('./../Kiirus/Support/Arr')

describe('Arr', function () {
  describe('#flatten', function () {
    it('Array Flatten', function () {
      expect(['taylor', 'php', 'javascript', null]).to.deep.equal(Arr.flatten({'name': 'taylor', 'languages': ['php', 'javascript', null]}))
    })
  })
})
