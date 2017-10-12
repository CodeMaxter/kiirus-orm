'use strict'

const Helper = require('./../../../Support/Helper')
const Processor = require('./Processor')

module.exports = class PostgresProcessor extends Processor {
  /**
   * Process an "insert get ID" query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  sql
   * @param  {array}   values
   * @param  {string}  sequence
   * @return {number}
   */
  processInsertGetId (query, sql, values, sequence = undefined) {
    const result = query.getConnection().selectFromWriteConnection(sql, values)[0]

    sequence = sequence || 'id'

    const id = Helper.isObject(result) ? result.sequence : result[sequence]

    return Helper.isNumeric(id) ? Number(id) : id
  }

  /**
   * Process the results of a column listing query.
   *
   * @param  {array}  results
   * @return {array}
   */
  processColumnListing (results) {
    return results.map((result) => {
      return result.column_name
    })
  }
}
