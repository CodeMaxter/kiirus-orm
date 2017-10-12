'use strict'

const Connector = require('./Connector')
const Helper = require('./../../Support/Helper')

const mysql = require('mysql')

module.exports = class MySqlConnector extends Connector {
  /**
   * Create a new MySql connection.
   *
   * @param  {object}   config
   * @return {object}
   */
  createConnection (config) {
    // const connection = mysql.createPool(config)

    // return connection

    return mysql.createConnection(config)
  }

  /**
   * Establish a database connection.
   *
   * @param  {object}  config
   * @return {object}
   */
  connect (config) {
    // We need to grab the PDO options that should be used while making the brand
    // new connection instance. The PDO options control various aspects of the
    // connection's behavior, and some might be specified by the developers.
    const connection = this.createConnection(config)

    if (!Helper.empty(config.database)) {
      connection.query(`use \`${config.database}\``)
    }

    this._configureEncoding(connection, config)

    // Next, we will check to see if a timezone has been specified in this config
    // and if it has we will issue a statement to modify the timezone with the
    // database. Setting this DB timezone is an optional configuration item.
    this._configureTimezone(connection, config)

    this._setModes(connection, config)

    return connection
  }

  /**
   * Set the connection character set and collation.
   *
   * @param  {object}  connection
   * @param  {object}  config
   * @return {void}
   */
  _configureEncoding (connection, config) {
    if (!Helper.isSet(config.charset)) {
      return connection
    }

    connection.query(
      `set names '${config.charset}'${this._getCollation(config)}`
    )
  }

  /**
   * Set the timezone on the connection.
   *
   * @param  {object}  connection
   * @param  {object}  config
   * @return {void}
   */
  _configureTimezone (connection, config) {
    if (Helper.isSet(config.timezone)) {
      connection.query(`set time_zone="${config.timezone}"`)
    }
  }

  /**
   * Get the collation for the configuration.
   *
   * @param  {object}  config
   * @return {string}
   */
  _getCollation (config) {
    return Helper.isSet(config.collation) ? ` collate '${config.collation}'` : ''
  }

  /**
   * Set the custom modes on the connection.
   *
   * @param  {object}  connection
   * @param  {object}  config
   * @return {void}
   */
  _setCustomModes (connection, config) {
    const modes = config.modes.join(',')

    connection.query(`set session sql_mode='${modes}'`)
  }

    /**
   * Set the modes for the connection.
   *
   * @param  {object}  connection
   * @param  {object}  config
   * @return {void}
   */
  _setModes (connection, config) {
    if (Helper.isSet(config.modes)) {
      this._setCustomModes(connection, config)
    } else if (Helper.isSet(config.strict)) {
      if (config.strict) {
        connection.query(this._strictMode())
      } else {
        connection.query(`set session sql_mode='NO_ENGINE_SUBSTITUTION'`)
      }
    }
  }

  /**
   * Get the query to enable strict mode.
   *
   * @return {string}
   */
  strictMode () {
    return `set session sql_mode='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'`
  }
}
