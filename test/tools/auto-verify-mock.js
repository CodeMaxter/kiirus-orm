'use strict'

const sinon = require('sinon')

const mocks = []
module.exports = {
  createMock: (target) => {
    mocks.push(sinon.mock(target))

    return mocks[mocks.length - 1]
  },
  autoVerify: () => {
    mocks.map((mock) => {
      mock.verify()
      mock.restore()
    })
  }
}

