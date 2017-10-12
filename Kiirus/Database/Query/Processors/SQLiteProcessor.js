'use strict'

const Processor = require('./Processor')

module.exports = class SQLiteProcessor extends Processor {
  /**
   * Process the results of a column listing query.
   *
   * @param  {array}  results
   * @return {array}
   */
  processColumnListing (results) {
    return results.map((result) => {
      return result.name
    })
  }
}
