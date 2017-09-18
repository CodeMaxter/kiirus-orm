'use strict'

const expect = require('chai').expect
const Helper = require('./../Kiirus/Support/Helper')

const createMock = require('./tools/auto-verify-mock').createMock
const autoVerify = require('./tools/auto-verify-mock').autoVerify

describe('Helper', () => {
  afterEach(() => {
    autoVerify()
  })

  describe('#changeKeyCase', function () {
    it('Changes The Case Of All Keys In An Object', function () {
      const target = {'FirSt': 1, 'SecOnd': 4}
      const result = {'FIRST': 1, 'SECOND': 4}

      expect(Helper.changeKeyCase(target, 'CASE_UPPER')).to.deep.equal(result)
      expect(Helper.changeKeyCase({'FuBaR': 1}, 'CASE_LOWER')).to.deep.equal({'fubar': 1})
    })
  })

  describe('#empty', function () {
    it('Empty variable', function () {
      expect(Helper.empty([])).to.equal(true)
      expect(Helper.empty([1])).to.equal(false)
      expect(Helper.empty(0)).to.equal(true)
      expect(Helper.empty(false)).to.equal(true)
      expect(Helper.empty(true)).to.equal(false)
    })
  })

  describe('#isNumeric', () => {
    it('Verify Numeric Values', () => {
      expect(Helper.isNumeric('-10')).to.equal(true)

      expect(Helper.isNumeric('0')).to.equal(true)
      expect(Helper.isNumeric('5')).to.equal(true)
      expect(Helper.isNumeric(-16)).to.equal(true)
      expect(Helper.isNumeric(0)).to.equal(true)
      expect(Helper.isNumeric(32)).to.equal(true)
      expect(Helper.isNumeric('040')).to.equal(true)
      expect(Helper.isNumeric('0xFF')).to.equal(true)
      expect(Helper.isNumeric(0xFFF)).to.equal(true)
      expect(Helper.isNumeric('-1.6')).to.equal(true)
      expect(Helper.isNumeric('4.536')).to.equal(true)
      expect(Helper.isNumeric(-2.6)).to.equal(true)
      expect(Helper.isNumeric(3.1415)).to.equal(true)
      expect(Helper.isNumeric(1.5999999999999999)).to.equal(true)
      expect(Helper.isNumeric(8e5)).to.equal(true)
      expect(Helper.isNumeric('123e-2')).to.equal(true)
      expect(Helper.isNumeric(String('42'))).to.equal(true)

      expect(Helper.isNumeric('')).to.equal(false)
      expect(Helper.isNumeric('        ')).to.equal(false)
      expect(Helper.isNumeric('\t\t')).to.equal(false)
      expect(Helper.isNumeric('abcdefghijklm1234567890')).to.equal(false)
      expect(Helper.isNumeric('xabcdefx')).to.equal(false)
      expect(Helper.isNumeric(true)).to.equal(false)
      expect(Helper.isNumeric(false)).to.equal(false)
      expect(Helper.isNumeric('bcfed5.2')).to.equal(false)
      expect(Helper.isNumeric('7.2acdgs')).to.equal(false)
      expect(Helper.isNumeric(undefined)).to.equal(false)
      expect(Helper.isNumeric(null)).to.equal(false)
      expect(Helper.isNumeric(NaN)).to.equal(false)
      expect(Helper.isNumeric(Infinity)).to.equal(false)
      expect(Helper.isNumeric(Number.POSITIVE_INFINITY)).to.equal(false)
      expect(Helper.isNumeric(Number.NEGATIVE_INFINITY)).to.equal(false)
      expect(Helper.isNumeric(String('Devo'))).to.equal(false)
      expect(Helper.isNumeric({})).to.equal(false)
      expect(Helper.isNumeric([])).to.equal(false)
      expect(Helper.isNumeric([42])).to.equal(false)
      expect(Helper.isNumeric(function () { })).to.equal(false)
      expect(Helper.isNumeric(new Date())).to.equal(false)
    })
  })

  describe('#isObject', () => {
    it('Check Is a Var is Object', () => {
      expect(Helper.isObject({})).to.equal(true)
      expect(Helper.isObject(Object())).to.equal(true)
      expect(Helper.isObject('')).to.equal(false)
      expect(Helper.isObject([])).to.equal(false)
      expect(Helper.isObject(1)).to.equal(false)
    })
  })

  describe('#isSet', () => {
    it('Check Is a Var is Set', () => {
      expect(Helper.isSet(6)).to.equal(true)
      expect(Helper.isSet('')).to.equal(true)
      expect(Helper.isSet(0)).to.equal(true)
      expect(Helper.isSet(1)).to.equal(true)
      expect(Helper.isSet(false)).to.equal(true)
      expect(Helper.isSet({})).to.equal(true)
      expect(Helper.isSet(true)).to.equal(true)
      expect(Helper.isSet()).to.equal(false)
      expect(Helper.isSet(undefined)).to.equal(false)
      expect(Helper.isSet(null)).to.equal(false)
    })
  })

  describe('#isString', () => {
    it('Scalar String', function () {
      expect(Helper.isString('Hello World')).to.equal(true)
      expect(Helper.isString('1')).to.equal(true)
      expect(Helper.isString(1)).to.equal(false)
    })

    it('String Constructor', function () {
      expect(Helper.isString(String('Hellow World'))).to.equal(true)
      expect(Helper.isString(String('1'))).to.equal(true)
    })
  })

  describe('#keyExists', () => {
    it('Object Key Exists', () => {
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

      expect(Helper.keyExists('kevin', {'kevin': 'van Zonneveld'})).to.be.equal(true)
      expect(Helper.keyExists('products.desk.price', {'products': {'desk': {'price': 50}, null: 'something'}})).to.be.equal(true)
      expect(Helper.keyExists('stringAttribute', casts)).to.be.equal(true)

      expect(Helper.keyExists('john', ['kevin', 'john', 'van Zonneveld'])).to.be.equal(false)
      expect(Helper.keyExists('john', {'kevin': 'van Zonneveld'})).to.be.equal(false)
    })
  })

  describe('#last', () => {
    it('Test Last', () => {
      const array = ['a', 'b', 'c']
      expect(Helper.last(array)).to.be.equal('c')
    })
  })

  describe('#merge', () => {
    it('Merge', () => {
      let result = []
      result['color'] = 'green'
      result['shape'] = 'trapezoid'
      result[0] = 2
      result[1] = 4
      result[2] = 'a'
      result[3] = 'b'
      result[4] = 4

      expect(Helper.merge(['address'], ['name', 'age'])).to.deep.equal(['address', 'name', 'age'])
      // expect(Helper.merge([{'color': 'red'}, 2, 4], ['a', 'b', {'color': 'green'}, {'shape': 'trapezoid'}, 4])).to.deep.equal(result)

      // expect(Helper.merge([{'color': 'red'}, 2, 4], ['a', 'b', {'color': 'green'}, {'shape': 'trapezoid'}, 4])).to.deep.equal([{'color': 'green'}, 2, 4, 'a', 'b', {'shape': 'trapezoid'}, 4])
      // expect(Arr.merge([1, 2, 3], [4, 'c'])).to.deep.equal([4, 'c', 3])
      // expect(Arr.merge([1, 2, 3], [4, 5], [6, 'a', 7, 8, 9])).to.deep.equal([6, 'a', 7, 8, 9])
    })
  })

  describe('#tap', () => {
    it('Test Tap', () => {
      const object = {'id': 1}
      expect(2).to.be.equal(Helper.tap(object, (object) => {
        object.id = 2
      }).id)

      const target = {foo: () => {}}
      const mock = createMock(target)
      mock.expects('foo').once().returns('bar')
      expect(target).to.be.deep.equal(Helper.tap(target).foo())
    })
  })

  describe('#value', () => {
    it('Test Value', () => {
      expect(Helper.value('foo')).to.be.equal('foo')
      expect(Helper.value(() => {
        return 'foo'
      })).to.be.equal('foo')
    })
  })
})
