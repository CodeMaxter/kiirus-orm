'use strict'

module.exports = class JoinClause {
  /**
   * Create a new join clause instance.
   *
   * @param  {\Kiirus\Database\Query\Builder} parentQuery
   * @param  {string}  type
   * @param  {string}  table
   * @return {void}
   */
  constructor (parentQuery, type, table) {
    // this.builder = new parentQuery.constructor(
    //   parentQuery.getConnection(),
    //   parentQuery.getGrammar(),
    //   parentQuery.getProcessor()
    // )

    /**
     * The parent query builder instance.
     *
     * @var {\Kiirus\Database\Query\Builder}
     */
    this.parentQuery = parentQuery

    /**
     * The table the join clause is joining to.
     *
     * @var {string}
     */
    this.table = table

    /**
     * The type of join being performed.
     *
     * @var {string}
     */
    this.type = type

    const builder = new parentQuery.constructor(
      parentQuery.getConnection(),
      parentQuery.getGrammar(),
      parentQuery.getProcessor()
    )

    Object.setPrototypeOf(Object.getPrototypeOf(this), builder)

    // let joinClause = Object.assign(this)
    // Object.setPrototypeOf(Object.getPrototypeOf(joinClause), builder)
    // return joinClause

    // let joinClause = new this.constructor(parentQuery, type, table)
    // Object.setPrototypeOf(this, builder)

    // return joinClause

    // return new Proxy(this, {
    //   get (target, property, receiver) {
    //     if (Reflect.has(target, property)) {
    //       return Reflect.get(target, property)
    //     } else {
    //       const builder = new parentQuery.constructor(
    //         parentQuery.getConnection(),
    //         parentQuery.getGrammar(),
    //         parentQuery.getProcessor()
    //       )

    //       let joinClause = new target.constructor(parentQuery, type, table)
    //       Object.setPrototypeOf(joinClause, Object.getPrototypeOf(builder))

    //       // return builder[property].bind(builder)
    //       return joinClause[property].bind(joinClause)
    //     }
    //   }
    // })
  }

  /**
   * Add an "on" clause to the join.
   *
   * On clauses can be chained, e.g.
   *
   *  join.on('contacts.user_id', '=', 'users.id')
   *    .on('contacts.info_id', '=', 'info.id')
   *
   * will produce the following SQL:
   *
   * on `contacts`.`user_id` = `users`.`id`  and `contacts`.`info_id` = `info`.`id`
   *
   * @param  {function|string}  first
   * @param  {string|null}  operator
   * @param  {string|null}  second
   * @param  {string}  boolean
   * @return {\Kiirus\Database\Query\JoinClause}
   *
   * @throws {\InvalidArgumentException}
   */
  on (first, operator = null, second = null, boolean = 'and') {
    if (typeof first === 'function') {
      return this.whereNested(first, boolean)
    }

    return this.whereColumn(first, operator, second, boolean)
  }
}
