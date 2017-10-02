'use strict'

const Arr = require('./../../Support/Arr')
const Helper = require('./../../Support/Helper')
const MySqlConnection = require('./../MySqlConnection')
const MySqlConnector = require('./MySqlConnector')
const PostgresConnection = require('./../PostgresConnection')
const PostgresConnector = require('./PostgresConnector')
const SQLiteConnection = require('./../SQLiteConnection')
const SQLiteConnector = require('./SQLiteConnector')
const SqlServerConnection = require('./../SqlServerConnection')
const SqlServerConnector = require('./SqlServerConnector')

module.exports = class ConnectionFactory {
  /**
   * Create a connector instance based on the configuration.
   *
   * @param  {array}  config
   * @return {\Kiirus\Database\Connectors\Connector}
   *
   * @throws {\InvalidArgumentException}
   */
  createConnector (config) {
    if (!Helper.isSet(config.driver)) {
      throw new Error('InvalidArgumentException: A driver must be specified.')
    }

    switch (config.driver) {
      case 'mysql':
        return new MySqlConnector()
      case 'pgsql':
        return new PostgresConnector()
      case 'sqlite':
        return new SQLiteConnector()
      case 'sqlsrv':
        return new SqlServerConnector()
    }

    throw new Error(`InvalidArgumentException: Unsupported driver [${config.driver}]`)
  }

  /**
   * Establish a connection based on the configuration.
   *
   * @param  {array}   config
   * @return {\Kiirus\Database\Connection}
   */
  make (config) {
    config = this._parseConfig(config)

    return this._createSingleConnection(config)
  }

  /**
   * Create a new connection instance.
   *
   * @param  {string}   driver
   * @param  object   connection
   * @param  {string}   database
   * @param  {string}   prefix
   * @param  {array}    config
   * @return {\Kiirus\Database\Connection}
   *
   * @throws {\InvalidArgumentException}
   */
  _createConnection (driver, connection, database, prefix = '', config = []) {
    switch (driver) {
      case 'mysql':
        return new MySqlConnection(connection, database, prefix, config)
      case 'pgsql':
        return new PostgresConnection(database, prefix, config)
      case 'sqlite':
        return new SQLiteConnection(database, prefix, config)
      case 'sqlsrv':
        return new SqlServerConnection(database, prefix, config)
    }

    throw new Error('InvalidArgumentException: Unsupported driver [driver]')
  }

  /**
   * Create a single database connection instance.
   *
   * @param  {array}  config
   * @return {\Kiirus\Database\Connection}
   */
  _createSingleConnection (config) {
    const connector = this.createConnector(config)
    const connection = connector.connect(config)

    return this._createConnection(
      config.driver,
      connection,
      config.database,
      config.prefix,
      config
    ).setReconnector((connection) => {
      connection.setConnection(connector.connect(config))
    })
  }

  /**
   * Parse and prepare the database configuration.
   *
   * @param  {array}   config
   * @param  {string}  name
   * @return {array}
   */
  _parseConfig (config) {
    return Arr.add(config, 'prefix', '')
  }
}
