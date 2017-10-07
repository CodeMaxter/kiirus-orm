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

  describe('Snake', function () {
    it('#snake', function () {
      expect(Str.snake('LaravelPHPFramework')).to.equal('laravel_p_h_p_framework')
      expect(Str.snake('LaravelPhpFramework')).to.equal('laravel_php_framework')
      expect(Str.snake('LaravelPhpFramework', ' ')).to.equal('laravel php framework')
      expect(Str.snake('Laravel Php Framework')).to.equal('laravel_php_framework')
      expect(Str.snake('Laravel    Php      Framework   ')).to.equal('laravel_php_framework')
    })
  })
})
