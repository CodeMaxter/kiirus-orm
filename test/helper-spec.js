'use strict'

const expect = require('chai').expect
const Helper = require('./../Kiirus/Support/Helper')

describe('Helper', () => {
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
})
