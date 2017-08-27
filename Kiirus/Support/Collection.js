'use strict'

module.exports = class Collection {
  /**
   * Create a new collection.
   *
   * @param  {*}  items
   * @return {void}
   */
  constructor (items = []) {
    /**
     * The items contained in the collection.
     *
     * @var {array}
     */
    this._items = Array.isArray(items) ? items : this._getArrayableItems(items)

    this.length = this._items.length
  }

  /**
   * Iterator to deal with the collection like a array
   */
  [Symbol.iterator] () {
    let index = -1
    let data = this._items

    return {
      next: () => ({ value: data[++index], done: !(index in data) })
    }
  }

  /**
   * Get all of the items in the collection.
   *
   * @return {array}
   */
  all () {
    return this._items
  }

  /**
   * Run a map over each of the items.
   *
   * @param  {function}  callback
   * @return {Collection}
   */
  map (callback) {
    const items = []

    for (let key in this._items) {
      items.push(callback(this._items[key], key))
    }

    return new this.constructor(items)
  }
}
