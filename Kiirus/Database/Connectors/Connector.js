'use strict'

const Helper = require('./../../Support/Helper')

module.exports = class Connector {
  constructor () {
    /**
     * The default Connection options.
     *
     * @var {object}
     */
    this._options = {}
  }

  /**
   * Get the default connection options.
   *
   * @return {array}
   */
  getDefaultOptions () {
    return this._options
  }

  /**
   * Get the Connection options based on the configuration.
   *
   * @param  {object}  config
   * @return {object}
   */
  getOptions (config) {
    const options = config.options || {}

    return Helper.merge(Helper.diffKey(this._options, options), options)
  }

  /**
   * Set the default PDO connection options.
   *
   * @param  {array}  options
   * @return {void}
   */
  setDefaultOptions (options) {
    this._options = options
  }
}
