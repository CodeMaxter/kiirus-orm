module.exports = class Processor {
  /**
   * Process the results of a "select" query.
   *
   * @param  {\Kiirus\Database\Query\Builder}  query
   * @param  {array}  results
   * @return {array}
   */
  processSelect (query, results) {
    return results
  }
}
