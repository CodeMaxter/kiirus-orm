'use strict'

const expect = require('chai').expect
const DateTime = require('./../Kiirus/Support/DateTime')

describe('DateTime', () => {
  describe('#format', () => {
    it('Format a Date', () => {
      const testDate = '2016-04-05T01:37:07'
      const dateTime = new DateTime(new Date(testDate))

      expect(dateTime.format('yyyy-mm-ddThh:nn:ss')).to.equal(testDate)
    })
  })
})
