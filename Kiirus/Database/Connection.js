module.exports = class Connection {
  /**
   * Run a select statement against the database.
   *
   * @param  {string}  query
   * @param  {array}  bindings
   * @return {Promise}
   */
  select (query, bindings = []) {
    return this._run(query, bindings)
  }
}
