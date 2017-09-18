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

    return new Proxy(this, {
      get (target, property, receiver) {
        if (Reflect.has(target, property)) {
          return Reflect.get(target, property)
        } else {
          if (Reflect.has(builder, property)) {
            return Reflect.get(builder, property)
          }
        }
      }
    })
  }

  /**
   * Create a new query instance for sub-query.
   *
   * @return {\Kiirus\Database\Query\Builder}
   */
  _forSubQuery () {
    return this.parentQuery.newQuery()
  }

  /**
   * Get a new instance of the join clause builder.
   *
   * @return {\Kiirus\Database\Query\JoinClause}
   */
  newQuery () {
    return new JoinClause(this.parentQuery, this.type, this.table)
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

  /**
   * Add an "or on" clause to the join.
   *
   * @param  {function|string}  first
   * @param  {string|undefined}  operator
   * @param  {string|undefined}  second
   * @return {\Kiirus\Database\Query\JoinClause}
   */
  orOn (first, operator = null, second = null) {
    return this.on(first, operator, second, 'or')
  }
}
