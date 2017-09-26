'use strict'

const Helper = require('./Helper')

module.exports = class DateTime {
  /**
   *
   * @param {Date} time
   * @param {string} timezone
   */
  constructor (time, timezone = undefined) {
    // Optional default parameter value
    time = Helper.isSet(time) ? time : time = Date.now()

    time = new Date(time)

    /**
     * A date/time string. Valid formats are explained in Date and Time Formats.
     * Enter NULL here to obtain the current time when using the $timezone parameter.
     *
     * @var {Date}
     */
    this._time = time

    /**
     * A date/time string. Valid formats are explained in Date and Time Formats.
     * Enter NULL here to obtain the current time when using the $timezone parameter.
     *
     * @var {string}
     */
    this._timezone = timezone

    /**
     * Seconds since the Unix Epoch
     *
     * @var {number}
     */
    this.timestamp = time.getTime()
  }

  /**
   * Returns date formatted according to given format
   *
   * @param {Date} date
   * @param {string} format
   * @returns {string}
   */
  format (format) {
    // a global month names array
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    // a global day names array
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    if (!this._time.valueOf()) {
      return '&nbsp;'
    }

    let result = format.replace(/(yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|a|A)/gi,
      ($1) => {
        switch ($1) {
          // A full numeric representation of a year, 4 digits. 1999 or 2003
          case 'yyyy':
            return this._time.getUTCFullYear()
          // A full textual representation of a month, such as January or March. January through December
          case 'mmmm':
            return monthNames[this._time.getUTCMonth()]
          // A short textual representation of a month, three letters. Jan through Dec
          case 'mmm':
            return monthNames[this._time.getUTCMonth()].substr(0, 3)
          // Numeric representation of a month, with leading zeros. 01 through 12
          case 'mm':
            return String(this._time.getUTCMonth() + 1).padStart(2, '0')
          // ISO-8601 numeric representation of the day of the week. 1 (for Monday) through 7 (for Sunday)
          case 'dddd':
            return dayNames[this._time.getUTCDay()]
          // A textual representation of a day, three letters. Mon through Sun
          case 'ddd':
            return dayNames[this._time.getUTCDay()].substr(0, 3)
          // Day of the month, 2 digits with leading zeros. 01 to 31
          case 'dd':
            return String(this._time.getUTCDate()).padStart(2, '0')
          // 12-hour format of an hour with leading zeros. 01 through 12
          case 'hh':
            // const hour = this._time.getUTCHours() % 12
            const hour = this._time.getUTCHours() - (this._time.getTimezoneOffset() / 60)

            return String(hour || 12).padStart(2, 0)
          // 24-hour format of an hour with leading zeros. 00 through 23
          case 'HH':
            return String(this._time.getUTCHours()).padStart(2, '0')
          // Minutes with leading zeros. 00 to 59
          case 'nn':
            return String(this._time.getUTCMinutes()).padStart(2, '0')
          // Seconds, with leading zeros. 00 through 59
          case 'ss':
            return String(this._time.getUTCSeconds()).padStart(2, '0')
          // Lowercase Ante meridiem and Post meridiem. am or pm
          case 'a':
            return this._time.getHours() < 12 ? 'am' : 'pm'
          // Microseconds
          case 'u':
            return this._time.getUTCMilliseconds() * 1000
          // Uppercase Ante meridiem and Post meridiem. AM or PM
          case 'A':
            return this._time.getHours() < 12 ? 'AM' : 'PM'
        }
      }
    )

    return result
  }

  /**
   * Get the system timezone
   *
   * @returns {string}
   */
  getTimeZone () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}
