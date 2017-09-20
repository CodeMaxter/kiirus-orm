'use strict'

const expect = require('chai').expect
const Str = require('./../Kiirus/Support/Str')

describe('Str', function () {
  describe('#ucfirst', function () {
    it('String First Letter In Uppercase', function () {
      expect(Str.ucfirst('hello world!')).to.be.equal('Hello world!')
      expect(Str.ucfirst('hello World!')).to.be.equal('Hello World!')
      expect(Str.ucfirst('HELLO WORLD!')).to.be.equal('HELLO WORLD!')
    })
  })
})
