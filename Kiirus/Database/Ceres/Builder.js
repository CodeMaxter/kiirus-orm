'use strict'

module.exports = class Builder {
  /**
   * Get the underlying query builder instance.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  getQuery () {
    return this._query
  }
}
