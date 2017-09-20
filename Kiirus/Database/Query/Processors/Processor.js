'use strict'

module.exports = class Processor {
  /**
   * Process an  "insert get ID" query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {string}  sql
   * @param  {array}   values
   * @param  {string}  sequence
   * @return {number}
   */
  processInsertGetId (query, sql, values, sequence = undefined) {
    return query.getConnection().insert(sql, values)
  }

  /**
   * Process the results of a "select" query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  results
   * @return {Promise</Kiirus/Database/Ceres/Collection>}
   */
  processSelect (query, results) {
    return results
  }
}
