'use strict'

const expect = require('chai').expect
const Str = require('./../Kiirus/Support/Str')

describe('Str', function () {
  describe('#ucfirst', function () {
    it('String First Letter In Uppercase', function () {
      expect('Hello world!').to.equal(Str.ucfirst('hello world!'))
      expect('Hello World!').to.equal(Str.ucfirst('hello World!'))
      expect('HELLO WORLD!').to.equal(Str.ucfirst('HELLO WORLD!'))
    })
  })
})
