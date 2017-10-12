'use strict'

const Processor = require('./Processor')

module.exports = class SqlServerProcessor extends Processor {
  /**
   * Process the results of a column listing query.
   *
   * @param  array  results
   * @return array
   */
  processColumnListing (results) {
    return resultsmap((result) => {
        return result.name
    })
  }

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
    connection = query.getConnection()

    connection.insert(sql, values)

    if (connection.getConfig('odbc') === true) {
      id = this.processInsertGetIdForOdbc(connection)
    } else {
      id = connection.getPdo().lastInsertId()
    }

    return is_numeric(id) ? (int) id : id
  }

  /**
   * Process an "insert get ID" query for ODBC.
   *
   * @param  {\Kiirus\Database\Connection}  connection
   * @return {number}
   * @throws {\Exception}
   */
  _processInsertGetIdForOdbc (connection) {
    result = connection.selectFromWriteConnection(
      'SELECT CAST(COALESCE(SCOPE_IDENTITY(), @@IDENTITY) AS int) AS insertid'
    )

    if (!result) {
      throw new Exception('Unable to retrieve lastInsertID for ODBC.')
    }

    row = result[0]
    
    return row.insertid
  }
}
