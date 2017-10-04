'use strict'

const expect = require('chai').expect

const Collection = require('./../Kiirus/Database/Ceres/Collection')
const Raw = require('./../Kiirus/Database/Query/Expression')

const autoVerify = require('./tools/auto-verify-mock').autoVerify
const builderStub = require('./stubs/builder')
const createMock = require('./tools/auto-verify-mock').createMock

describe('QueryBuilder', () => {
  afterEach(() => {
    autoVerify()
  })

  describe('#select', () => {
    it('Basic Select', () => {
      const builder = builderStub.getBuilder()

      builder.select('*').from('users')

      expect(builder.toSql()).to.equal('select * from "users"')
    })

    it('Basic Select With Get Columns', () => {
      const builder = builderStub.getBuilder()
      const processorMock = createMock(builder.getProcessor())
      const connectionMock = createMock(builder.getConnection())

      processorMock.expects('processSelect').twice()
      connectionMock.expects('select').once().returns('select * from "users"')

      connectionMock.expects('select').once().returns('select "foo", "bar" from "users"')

      builder.from('users').get()
      expect(builder.columns).to.be.equal(undefined)

      builder.from('users').get(['foo', 'bar'])
      expect(builder.columns).to.be.equal(undefined)

      expect('select * from "users"', builder.toSql())
      expect(builder.columns).to.be.equal(undefined)
    })

    it('Basic Table Wrapping Protects Quotation Marks', () => {
      const builder = builderStub.getBuilder()

      builder.select('*').from('some"table')
      expect(builder.toSql()).to.equal('select * from "some""table"')
    })

    it('Alias Wrapping As Whole Constant', () => {
      const builder = builderStub.getBuilder()

      builder.select('x.y as foo.bar').from('baz')
      expect(builder.toSql()).to.equal('select "x"."y" as "foo.bar" from "baz"')
    })

    it('Alias Wrapping With Spaces In Database Name', () => {
      const builder = builderStub.getBuilder()

      builder.select('w x.y.z as foo.bar').from('baz')

      expect('select "w x"."y"."z" as "foo.bar" from "baz"').to.be.equal(builder.toSql())
    })

    it('Adding Selects', () => {
      const builder = builderStub.getBuilder()

      builder.select('foo').addSelect('bar').addSelect(['baz', 'boom']).from('users')
      expect(builder.toSql()).to.equal('select "foo", "bar", "baz", "boom" from "users"')
    })

    it('Basic Select With Prefix', () => {
      const builder = builderStub.getBuilder()

      builder.getGrammar().setTablePrefix('prefix_')
      builder.select('*').from('users')
      expect(builder.toSql()).to.equal('select * from "prefix_users"')
    })

    it('Basic Select Distinct', () => {
      const builder = builderStub.getBuilder()

      builder.distinct().select('foo', 'bar').from('users')
      expect(builder.toSql()).to.equal('select distinct "foo", "bar" from "users"')
    })

    it('Basic Alias', () => {
      const builder = builderStub.getBuilder()

      builder.select('foo as bar').from('users')
      expect(builder.toSql()).to.equal('select "foo" as "bar" from "users"')
    })

    it('Alias With Prefix', () => {
      const builder = builderStub.getBuilder()

      builder.getGrammar().setTablePrefix('prefix_')
      builder.select('*').from('users as people')
      expect(builder.toSql()).to.equal('select * from "prefix_users" as "prefix_people"')
    })

    it('Join Aliases With Prefix', () => {
      const builder = builderStub.getBuilder()

      builder.getGrammar().setTablePrefix('prefix_')
      builder.select('*').from('services').join('translations AS t', 't.item_id', '=', 'services.id')
      expect(builder.toSql()).to.equal('select * from "prefix_services" inner join "prefix_translations" as "prefix_t" on "prefix_t"."item_id" = "prefix_services"."id"')
    })

    it('Basic Table Wrapping', () => {
      const builder = builderStub.getBuilder()

      builder.select('*').from('public.users')
      expect(builder.toSql()).to.equal('select * from "public"."users"')
    })

    it('When Callback', () => {
      const callback = (query, condition) => {
        expect(condition).to.be.equal(true)

        query.where('id', '=', 1)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').when(true, callback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').when(false, callback).where('email', 'foo')
      expect('select * from "users" where "email" = ?').to.be.equal(builder.toSql())
    })

    it('When Callback With Return', () => {
      const callback = (query, condition) => {
        expect(condition).to.be.equal(true)

        return query.where('id', '=', 1)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').when(true, callback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').when(false, callback).where('email', 'foo')
      expect('select * from "users" where "email" = ?').to.be.equal(builder.toSql())
    })

    it('When Callback With Default', () => {
      const callback = (query, condition) => {
        expect(condition).to.be.equal('truthy')

        query.where('id', '=', 1)
      }

      const defaultCallback = (query, condition) => {
        expect(condition).to.be.equal(0)

        query.where('id', '=', 2)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').when('truthy', callback, defaultCallback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?', builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').when(0, callback, defaultCallback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?', builder.toSql())
      expect([2, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Unless Callback', () => {
      const callback = function (query, condition) {
        expect(condition).to.be.equal(false)

        query.where('id', '=', 1)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').unless(false, callback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').unless(true, callback).where('email', 'foo')
      expect('select * from "users" where "email" = ?').to.be.equal(builder.toSql())
    })

    it('Unless Callback With Return', () => {
      const callback = function (query, condition) {
        expect(condition).to.be.equal(false)

        return query.where('id', '=', 1)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').unless(false, callback).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').unless(true, callback).where('email', 'foo')
      expect('select * from "users" where "email" = ?').to.be.equal(builder.toSql())
    })

    it('Unless Callback With Default', () => {
      const callback = (query, condition) => {
        expect(condition).to.be.equal(0)

        query.where('id', '=', 1)
      }

      const defaultValue = (query, condition) => {
        expect(condition).to.be.equal('truthy')

        query.where('id', '=', 2)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').unless(0, callback, defaultValue).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').unless('truthy', callback, defaultValue).where('email', 'foo')
      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())
      expect([2, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Tap Callback', () => {
      const callback = (query) => {
        return query.where('id', '=', 1)
      }

      let builder = builderStub.getBuilder()
      builder.select('*').from('users').tap(callback).where('email', 'foo')

      expect('select * from "users" where "id" = ? and "email" = ?').to.be.equal(builder.toSql())
    })

    it('Basic Wheres', () => {
      const builder = builderStub.getBuilder()

      builder.select('*').from('users').where('id', '=', 1)
      expect(builder.toSql()).to.equal('select * from "users" where "id" = ?')
      expect(builder.getBindings()).to.be.deep.equal([1])
    })

    it('Default Select Parameter', () => {
      const builder = builderStub.getBuilder()

      builder.select()
      expect(builder.columns).to.be.deep.equal(['*'])
    })

    it('Custom Select Parameter', () => {
      const customParameter = ['first', 'second', 'third']

      const builder = builderStub.getBuilder()

      builder.select(customParameter)

      expect(customParameter).to.be.deep.equal(builder.columns)
    })

    it('MySql Wrapping Protects Quotation Marks', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('some`table')
      expect('select * from `some``table`').to.be.equal(builder.toSql())
    })

    it('Date Based Wheres Accepts Two Arguments', () => {
      let builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereDate('created_at', 1)
      expect('select * from `users` where date(`created_at`) = ?').to.be.equal(builder.toSql())

      builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereDay('created_at', 1)
      expect('select * from `users` where day(`created_at`) = ?').to.be.equal(builder.toSql())

      builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereMonth('created_at', 1)
      expect('select * from `users` where month(`created_at`) = ?').to.be.equal(builder.toSql())

      builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereYear('created_at', 1)
      expect('select * from `users` where year(`created_at`) = ?').to.be.equal(builder.toSql())
    })

    it('Where Day MySql', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereDay('created_at', '=', 1)
      expect('select * from `users` where day(`created_at`) = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Month MySql', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereMonth('created_at', '=', 1)
      expect('select * from `users` where month(`created_at`) = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Year MySql', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereYear('created_at', '=', 1)
      expect('select * from `users` where year(`created_at`) = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Time MySql', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').whereTime('created_at', '>=', '22:00')
      expect('select * from `users` where time(`created_at`) >= ?').to.be.equal(builder.toSql())
      expect(['22:00']).to.be.deep.equal(builder.getBindings())
    })

    it('Where Date Postgres', () => {
      const builder = builderStub.getPostgresBuilder()
      builder.select('*').from('users').whereDate('created_at', '=', '2015-12-21')
      expect('select * from "users" where "created_at"::date = ?').to.be.equal(builder.toSql())
      expect(['2015-12-21']).to.be.deep.equal(builder.getBindings())
    })

    it('Where Day Postgres', () => {
      const builder = builderStub.getPostgresBuilder()
      builder.select('*').from('users').whereDay('created_at', '=', 1)
      expect('select * from "users" where extract(day from "created_at") = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Month Postgres', () => {
      const builder = builderStub.getPostgresBuilder()
      builder.select('*').from('users').whereMonth('created_at', '=', 5)
      expect('select * from "users" where extract(month from "created_at") = ?').to.be.equal(builder.toSql())
      expect([5]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Year Postgres', () => {
      const builder = builderStub.getPostgresBuilder()
      builder.select('*').from('users').whereYear('created_at', '=', 2014)
      expect('select * from "users" where extract(year from "created_at") = ?').to.be.equal(builder.toSql())
      expect([2014]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Day Sqlite', () => {
      const builder = builderStub.getSQLiteBuilder()
      builder.select('*').from('users').whereDay('created_at', '=', 1)
      expect('select * from "users" where strftime(\'%d\', "created_at") = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Month Sqlite', () => {
      const builder = builderStub.getSQLiteBuilder()
      builder.select('*').from('users').whereMonth('created_at', '=', 5)
      expect('select * from "users" where strftime(\'%m\', "created_at") = ?').to.be.equal(builder.toSql())
      expect([5]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Year Sqlite', () => {
      const builder = builderStub.getSQLiteBuilder()
      builder.select('*').from('users').whereYear('created_at', '=', 2014)
      expect('select * from "users" where strftime(\'%Y\', "created_at") = ?').to.be.equal(builder.toSql())
      expect([2014]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Day SqlServer', () => {
      const builder = builderStub.getSqlServerBuilder()
      builder.select('*').from('users').whereDay('created_at', '=', 1)
      expect(builder.toSql()).to.be.equal('select * from [users] where day([created_at]) = ?')
      expect(builder.getBindings()).to.be.deep.equal([1])
    })

    it('Where Month SqlServer', () => {
      const builder = builderStub.getSqlServerBuilder()
      builder.select('*').from('users').whereMonth('created_at', '=', 5)
      expect('select * from [users] where month([created_at]) = ?').to.be.equal(builder.toSql())
      expect([5]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Year SqlServer', () => {
      const builder = builderStub.getSqlServerBuilder()
      builder.select('*').from('users').whereYear('created_at', '=', 2014)
      expect('select * from [users] where year([created_at]) = ?').to.be.equal(builder.toSql())
      expect([2014]).to.be.deep.equal(builder.getBindings())
    })

    it('Where Betweens', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereBetween('id', [1, 2])
      expect('select * from "users" where "id" between ? and ?', builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNotBetween('id', [1, 2])
      expect('select * from "users" where "id" not between ? and ?', builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Or Wheres', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhere('email', '=', 'foo')
      expect('select * from "users" where "id" = ? or "email" = ?', builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Raw Wheres', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').whereRaw('id = ? or email = ?', [1, 'foo'])
      expect('select * from "users" where id = ? or email = ?', builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Raw Or Wheres', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereRaw('email = ?', ['foo'])
      expect('select * from "users" where "id" = ? or email = ?', builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Where Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereIn('id', [1, 2, 3])
      expect('select * from "users" where "id" in (?, ?, ?)', builder.toSql())
      expect([1, 2, 3]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereIn('id', [1, 2, 3])
      expect('select * from "users" where "id" = ? or "id" in (?, ?, ?)', builder.toSql())
      expect([1, 1, 2, 3]).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Where Not Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNotIn('id', [1, 2, 3])
      expect('select * from "users" where "id" not in (?, ?, ?)', builder.toSql())
      expect([1, 2, 3]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereNotIn('id', [1, 2, 3])
      expect('select * from "users" where "id" = ? or "id" not in (?, ?, ?)', builder.toSql())
      expect([1, 1, 2, 3]).to.be.deep.equal(builder.getBindings())
    })

    it('Raw Where Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereIn('id', [new Raw(1)])
      expect('select * from "users" where "id" in (1)').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereIn('id', [new Raw(1)])
      expect('select * from "users" where "id" = ? or "id" in (1)').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Empty Where Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereIn('id', [])
      expect('select * from "users" where 0 = 1').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereIn('id', [])
      expect('select * from "users" where "id" = ? or 0 = 1').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Empty Where Not Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNotIn('id', [])
      expect('select * from "users" where 1 = 1').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereNotIn('id', [])
      expect('select * from "users" where "id" = ? or 1 = 1').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Where Column', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereColumn('first_name', 'last_name').orWhereColumn('first_name', 'middle_name')
      expect('select * from "users" where "first_name" = "last_name" or "first_name" = "middle_name"').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').whereColumn('updated_at', '>', 'created_at')
      expect('select * from "users" where "updated_at" > "created_at"').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())
    })

    it('Array Where Column', () => {
      const conditions = [
        ['first_name', 'last_name'],
        ['updated_at', '>', 'created_at']
      ]

      const builder = builderStub.getBuilder()
      builder.select('*').from('users').whereColumn(conditions)
      expect('select * from "users" where ("first_name" = "last_name" and "updated_at" > "created_at")').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())
    })

    it('Unions', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.union(builderStub.getBuilder().select('*').from('users').where('id', '=', 2))
      expect('select * from "users" where "id" = ? union select * from "users" where "id" = ?').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.union(builderStub.getMySqlBuilder().select('*').from('users').where('id', '=', 2))
      expect('(select * from `users` where `id` = ?) union (select * from `users` where `id` = ?)').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getMySqlBuilder()
      let expectedSql = '(select `a` from `t1` where `a` = ? and `b` = ?) union (select `a` from `t2` where `a` = ? and `b` = ?) order by `a` asc limit 10'
      let union = builderStub.getMySqlBuilder().select('a').from('t2').where('a', 11).where('b', 2)
      builder.select('a').from('t1').where('a', 10).where('b', 1).union(union).orderBy('a').limit(10)
      expect(expectedSql).to.be.equal(builder.toSql())
      expect([10, 1, 11, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getSQLiteBuilder()
      expectedSql = 'select * from (select "name" from "users" where "id" = ?) union select * from (select "name" from "users" where "id" = ?)'
      builder.select('name').from('users').where('id', '=', 1)
      builder.union(builderStub.getSQLiteBuilder().select('name').from('users').where('id', '=', 2))
      expect(expectedSql).to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('Union Alls', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.unionAll(builderStub.getBuilder().select('*').from('users').where('id', '=', 2))
      expect('select * from "users" where "id" = ? union all select * from "users" where "id" = ?').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('Multiple Unions', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.union(builderStub.getBuilder().select('*').from('users').where('id', '=', 2))
      builder.union(builderStub.getBuilder().select('*').from('users').where('id', '=', 3))
      expect('select * from "users" where "id" = ? union select * from "users" where "id" = ? union select * from "users" where "id" = ?').to.be.equal(builder.toSql())
      expect([1, 2, 3]).to.be.deep.equal(builder.getBindings())
    })

    it('Multiple Union Alls', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.unionAll(builderStub.getBuilder().select('*').from('users').where('id', '=', 2))
      builder.unionAll(builderStub.getBuilder().select('*').from('users').where('id', '=', 3))
      expect('select * from "users" where "id" = ? union all select * from "users" where "id" = ? union all select * from "users" where "id" = ?').to.be.equal(builder.toSql())
      expect([1, 2, 3]).to.be.deep.equal(builder.getBindings())
    })

    it('Union Order Bys', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.union(builderStub.getBuilder().select('*').from('users').where('id', '=', 2))
      builder.orderBy('id', 'desc')
      expect('select * from "users" where "id" = ? union select * from "users" where "id" = ? order by "id" desc').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('Union Limits And Offsets', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users')
      builder.union(builderStub.getBuilder().select('*').from('dogs'))
      builder.skip(5).take(10)
      expect('select * from "users" union select * from "dogs" limit 10 offset 5').to.be.equal(builder.toSql())
    })

    it('Union With Join', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users')
      builder.union(builderStub.getBuilder().select('*').from('dogs').join('breeds', (join) => {
        join.on('dogs.breed_id', '=', 'breeds.id')
          .where('breeds.is_native', '=', 1)
      }))
      expect('select * from "users" union select * from "dogs" inner join "breeds" on "dogs"."breed_id" = "breeds"."id" and "breeds"."is_native" = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('MySql Union Order Bys', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users').where('id', '=', 1)
      builder.union(builderStub.getMySqlBuilder().select('*').from('users').where('id', '=', 2))
      builder.orderBy('id', 'desc')
      expect('(select * from `users` where `id` = ?) union (select * from `users` where `id` = ?) order by `id` desc').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('MySql Union Limits And Offsets', () => {
      const builder = builderStub.getMySqlBuilder()
      builder.select('*').from('users')
      builder.union(builderStub.getMySqlBuilder().select('*').from('dogs'))
      builder.skip(5).take(10)
      expect('(select * from `users`) union (select * from `dogs`) limit 10 offset 5').to.be.equal(builder.toSql())
    })

    it('Sub Select Where Ins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereIn('id', (q) => {
        q.select('id').from('users').where('age', '>', 25).take(3)
      })
      expect('select * from "users" where "id" in (select "id" from "users" where "age" > ? limit 3)').to.be.equal(builder.toSql())
      expect([25]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNotIn('id', (q) => {
        q.select('id').from('users').where('age', '>', 25).take(3)
      })
      expect('select * from "users" where "id" not in (select "id" from "users" where "age" > ? limit 3)').to.be.equal(builder.toSql())
      expect([25]).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Where Nulls', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNull('id')
      expect('select * from "users" where "id" is null').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '=', 1).orWhereNull('id')
      expect('select * from "users" where "id" = ? or "id" is null').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Basic Where Not Nulls', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').whereNotNull('id')
      expect('select * from "users" where "id" is not null').to.be.equal(builder.toSql())
      expect([]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', '>', 1).orWhereNotNull('id')
      expect('select * from "users" where "id" > ? or "id" is not null').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
    })

    it('Group Bys', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').groupBy('email')
      expect('select * from "users" group by "email"').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').groupBy('id', 'email')
      expect('select * from "users" group by "id", "email"').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').groupBy(['id', 'email'])
      expect('select * from "users" group by "id", "email"').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').groupBy(new Raw('DATE(created_at)'))
      expect('select * from "users" group by DATE(created_at)').to.be.equal(builder.toSql())
    })

    it('Order Bys', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').orderBy('email').orderBy('age', 'desc')
      expect('select * from "users" order by "email" asc, "age" desc').to.be.equal(builder.toSql())

      builder.orders = null
      expect('select * from "users"').to.be.equal(builder.toSql())

      builder.orders = []
      expect('select * from "users"').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').orderBy('email').orderByRaw('"age" ? desc', ['foo'])
      expect('select * from "users" order by "email" asc, "age" ? desc', builder.toSql())
      expect(['foo']).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').orderByDesc('name')
      expect('select * from "users" order by "name" desc').to.be.equal(builder.toSql())
    })

    it('Havings', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').having('email', '>', 1)
      expect('select * from "users" having "email" > ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users')
        .orHaving('email', '=', 'test@example.com')
        .orHaving('email', '=', 'test2@example.com')
      expect('select * from "users" having "email" = ? or "email" = ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').groupBy('email').having('email', '>', 1)
      expect('select * from "users" group by "email" having "email" > ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('email as foo_email').from('users').having('foo_email', '>', 1)
      expect('select "email" as "foo_email" from "users" having "foo_email" > ?').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select(['category', new Raw('count(*) as "total"')])
        .from('item').where('department', '=', 'popular')
        .groupBy('category').having('total', '>', new Raw('3'))
      expect('select "category", count(*) as "total" from "item" where "department" = ? group by "category" having "total" > 3').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select(['category', new Raw('count(*) as "total"')])
        .from('item').where('department', '=', 'popular')
        .groupBy('category').having('total', '>', 3)
      expect('select "category", count(*) as "total" from "item" where "department" = ? group by "category" having "total" > ?').to.be.equal(builder.toSql())
    })

    it('Having Shortcut', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').having('email', 1).orHaving('email', 2)
      expect('select * from "users" having "email" = ? or "email" = ?').to.be.equal(builder.toSql())
    })

    it('Having Followed By Select Get', () => {
      let builder = builderStub.getBuilder()
      let query = 'select "category", count(*) as "total" from "item" where "department" = ? group by "category" having "total" > ?'
      let results = [{'category': 'rock', 'total': 5}]

      let connectionMock = createMock(builder.getConnection())
      let processorMock = createMock(builder.getProcessor())

      connectionMock.expects('select').once().withArgs(query, ['popular', 3]).returns(Promise.resolve(new Collection(results)))
      processorMock.expects('processSelect').once().returns(Promise.resolve(new Collection(results)))
      builder.from('item')
      builder.select(['category', new Raw('count(*) as "total"')])
        .where('department', '=', 'popular')
        .groupBy('category')
        .having('total', '>', 3)
        .get().then((result) => {
          expect([{'category': 'rock', 'total': 5}]).to.be.deep.equal(result.all())
        })

      // Using \Raw value
      builder = builderStub.getBuilder()
      query = 'select "category", count(*) as "total" from "item" where "department" = ? group by "category" having "total" > 3'

      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())

      connectionMock.expects('select').once().withArgs(query, ['popular']).returns(Promise.resolve(new Collection(results)))
      processorMock.expects('processSelect').returns(Promise.resolve(new Collection(results)))
      builder.from('item')
      builder.select(['category', new Raw('count(*) as "total"')])
        .where('department', '=', 'popular')
        .groupBy('category')
        .having('total', '>', new Raw('3'))
        .get().then((result) => {
          expect([{'category': 'rock', 'total': 5}]).to.be.deep.equal(result.all())
        })
    })

    it('Raw Havings', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').havingRaw('user_foo < user_bar')
      expect('select * from "users" having user_foo < user_bar').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').having('baz', '=', 1).orHavingRaw('user_foo < user_bar')
      expect('select * from "users" having "baz" = ? or user_foo < user_bar').to.be.equal(builder.toSql())
    })

    it('Limits And Offsets', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').offset(5).limit(10)
      expect('select * from "users" limit 10 offset 5').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').skip(5).take(10)
      expect('select * from "users" limit 10 offset 5').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').skip(0).take(0)
      expect('select * from "users" limit 0 offset 0').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').skip(-5).take(-10)
      expect('select * from "users" offset 0').to.be.equal(builder.toSql())
    })

    it('For Page', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(2, 15)
      expect('select * from "users" limit 15 offset 15').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(0, 15)
      expect('select * from "users" limit 15 offset 0').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(-2, 15)
      expect('select * from "users" limit 15 offset 0').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(2, 0)
      expect('select * from "users" limit 0 offset 0').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(0, 0)
      expect('select * from "users" limit 0 offset 0').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').forPage(-2, 0)
      expect('select * from "users" limit 0 offset 0').to.be.equal(builder.toSql())
    })

    it('Get Count For Pagination With Bindings', () => {
      const builder = builderStub.getBuilder()
      builder.from('users').selectSub((q) => {
        q.select('body').from('posts').where('id', 4)
      }, 'post')

      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select count(*) as aggregate from "users"', []).returns(Promise.resolve(results))
      processorMock.expects('processSelect').once().returns(results)

      builder.getCountForPagination().then((count) => {
        expect(1).to.be.equal(count)
        expect([4]).to.be.deep.equal(builder.getBindings())
      })
    })

    it('Get Count For Pagination With Column Aliases', () => {
      const builder = builderStub.getBuilder()
      const columns = ['body as post_body', 'teaser', 'posts.created as published']
      builder.from('posts').select(columns)

      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once()
        .withArgs('select count("body", "teaser", "posts"."created") as aggregate from "posts"', [])
        .returns(results)

      processorMock.expects('processSelect').once().returns(results)

      builder.getCountForPagination(columns).then((count) => {
        expect(1).to.be.equal(count)
      })
    })

    it('Where Shortcut', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('id', 1).orWhere('name', 'foo')
      expect('select * from "users" where "id" = ? or "name" = ?').to.be.equal(builder.toSql())
      expect([1, 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Where With Array Conditions', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').where([['foo', 1], ['bar', 2]])
      expect('select * from "users" where ("foo" = ? and "bar" = ?)').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where({'foo': 1, 'bar': 2})
      expect('select * from "users" where ("foo" = ? and "bar" = ?)').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').where([['foo', 1], ['bar', '<', 2]])
      expect('select * from "users" where ("foo" = ? and "bar" < ?)').to.be.equal(builder.toSql())
      expect([1, 2]).to.be.deep.equal(builder.getBindings())
    })

    it('Nested Wheres', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('email', '=', 'foo').orWhere((q) => {
        q.where('name', '=', 'bar').where('age', '=', 25)
      })

      expect('select * from "users" where "email" = ? or ("name" = ? and "age" = ?)').to.be.equal(builder.toSql())
      expect(['foo', 'bar', 25]).to.be.deep.equal(builder.getBindings())
    })

    it('Full Sub Selects', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').where('email', '=', 'foo').orWhere('id', '=', (q) => {
        q.select(new Raw('max(id)')).from('users').where('email', '=', 'bar')
      })

      expect('select * from "users" where "email" = ? or "id" = (select max(id) from "users" where "email" = ?)', builder.toSql())
      expect(['foo', 'bar']).to.be.deep.equal(builder.getBindings())
    })

    it('Where Exists', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('orders').whereExists(function (q) {
        q.select('*').from('products').where('products.id', '=', new Raw('"orders"."id"'))
      })

      expect('select * from "orders" where exists (select * from "products" where "products"."id" = "orders"."id")').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('orders').whereNotExists(function (q) {
        q.select('*').from('products').where('products.id', '=', new Raw('"orders"."id"'))
      })
      expect('select * from "orders" where not exists (select * from "products" where "products"."id" = "orders"."id")').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('orders').where('id', '=', 1).orWhereExists(function (q) {
        q.select('*').from('products').where('products.id', '=', new Raw('"orders"."id"'))
      })
      expect('select * from "orders" where "id" = ? or exists (select * from "products" where "products"."id" = "orders"."id")').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('orders').where('id', '=', 1).orWhereNotExists(function (q) {
        q.select('*').from('products').where('products.id', '=', new Raw('"orders"."id"'))
      })
      expect('select * from "orders" where "id" = ? or not exists (select * from "products" where "products"."id" = "orders"."id")').to.be.equal(builder.toSql())
    })

    it('Basic Joins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', 'users.id', 'contacts.id')
      expect('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id"').to.be.equal(builder.toSql())

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', 'users.id', '=', 'contacts.id').leftJoin('photos', 'users.id', '=', 'photos.id')
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" left join "photos" on "users"."id" = "photos"."id"')

      builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoinWhere('photos', 'users.id', '=', 'bar').joinWhere('photos', 'users.id', '=', 'foo')
      expect('select * from "users" left join "photos" on "users"."id" = ? inner join "photos" on "users"."id" = ?').to.be.equal(builder.toSql())
      expect(['bar', 'foo']).to.be.deep.equal(builder.getBindings())
    })

    it('Cross Joins', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('sizes').crossJoin('colors')
      expect(builder.toSql()).to.be.equal('select * from "sizes" cross join "colors"')

      builder = builderStub.getBuilder()
      builder.select('*').from('tableB').join('tableA', 'tableA.column1', '=', 'tableB.column2', 'cross')
      expect(builder.toSql()).to.be.equal('select * from "tableB" cross join "tableA" on "tableA"."column1" = "tableB"."column2"')

      builder = builderStub.getBuilder()
      builder.select('*').from('tableB').crossJoin('tableA', 'tableA.column1', '=', 'tableB.column2')
      expect(builder.toSql()).to.be.equal('select * from "tableB" cross join "tableA" on "tableA"."column1" = "tableB"."column2"')
    })

    it('Complex Join', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').orOn('users.name', '=', 'contacts.name')
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "users"."name" = "contacts"."name"')

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.where('users.id', '=', 'foo').orWhere('users.name', '=', 'bar')
      })

      expect('select * from "users" inner join "contacts" on "users"."id" = ? or "users"."name" = ?', builder.toSql())
      expect(builder.getBindings()).to.be.deep.equal(['foo', 'bar'])

      // Run the assertions again
      expect('select * from "users" inner join "contacts" on "users"."id" = ? or "users"."name" = ?', builder.toSql())
      expect(builder.getBindings()).to.be.deep.equal(['foo', 'bar'])
    })

    it('Join Where Null', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').whereNull('contacts.deleted_at')
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" and "contacts"."deleted_at" is null')

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').orWhereNull('contacts.deleted_at')
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "contacts"."deleted_at" is null')
    })

    it('Join Where Not Null', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').whereNotNull('contacts.deleted_at')
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" and "contacts"."deleted_at" is not null')

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').orWhereNotNull('contacts.deleted_at')
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "contacts"."deleted_at" is not null')
    })

    it('Join Where In', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').whereIn('contacts.name', [48, 'baz', null])
      })
      expect('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" and "contacts"."name" in (?, ?, ?)').to.be.equal(builder.toSql())
      expect(builder.getBindings()).to.be.deep.equal([48, 'baz', null])

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', function (j) {
        j.on('users.id', '=', 'contacts.id').orWhereIn('contacts.name', [48, 'baz', null])
      })
      expect('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "contacts"."name" in (?, ?, ?)').to.be.equal(builder.toSql())
      expect(builder.getBindings()).to.be.deep.equal([48, 'baz', null])
    })

    it('Join Where In Subquery', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', (j) => {
        const q = builderStub.getBuilder()

        q.select('name').from('contacts').where('name', 'baz')
        j.on('users.id', '=', 'contacts.id').whereIn('contacts.name', q)
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" and "contacts"."name" in (select "name" from "contacts" where "name" = ?)')
      expect(builder.getBindings()).to.be.deep.equal(['baz'])

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', (j) => {
        const q = builderStub.getBuilder()

        q.select('name').from('contacts').where('name', 'baz')
        j.on('users.id', '=', 'contacts.id').orWhereIn('contacts.name', q)
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "contacts"."name" in (select "name" from "contacts" where "name" = ?)')
      expect(builder.getBindings()).to.be.deep.equal(['baz'])
    })

    it('Join Where Not In', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', (j) => {
        j.on('users.id', '=', 'contacts.id').whereNotIn('contacts.name', [48, 'baz', null])
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" and "contacts"."name" not in (?, ?, ?)')
      expect(builder.getBindings()).to.be.deep.equal([48, 'baz', null])

      builder = builderStub.getBuilder()
      builder.select('*').from('users').join('contacts', (j) => {
        j.on('users.id', '=', 'contacts.id').orWhereNotIn('contacts.name', [48, 'baz', null])
      })
      expect(builder.toSql()).to.be.equal('select * from "users" inner join "contacts" on "users"."id" = "contacts"."id" or "contacts"."name" not in (?, ?, ?)')
      expect(builder.getBindings()).to.be.deep.equal([48, 'baz', null])
    })

    it('Joins With Nested Conditions', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoin('contacts', (j) => {
        j.on('users.id', '=', 'contacts.id').where((j) => {
          j.where('contacts.country', '=', 'US').orWhere('contacts.is_partner', '=', 1)
        })
      })
      expect(builder.toSql()).to.be.equal('select * from "users" left join "contacts" on "users"."id" = "contacts"."id" and ("contacts"."country" = ? or "contacts"."is_partner" = ?)')
      expect(builder.getBindings()).to.be.deep.equal(['US', 1])

      builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoin('contacts', (j) => {
        j.on('users.id', '=', 'contacts.id').where('contacts.is_active', '=', 1).orOn((j) => {
          j.orWhere((j) => {
            j.where('contacts.country', '=', 'UK').orOn('contacts.type', '=', 'users.type')
          }).where((j) => {
            j.where('contacts.country', '=', 'US').orWhereNull('contacts.is_partner')
          })
        })
      })
      expect(builder.toSql()).to.be.equal('select * from "users" left join "contacts" on "users"."id" = "contacts"."id" and "contacts"."is_active" = ? or (("contacts"."country" = ? or "contacts"."type" = "users"."type") and ("contacts"."country" = ? or "contacts"."is_partner" is null))')
      expect(builder.getBindings()).to.be.deep.equal([1, 'UK', 'US'])
    })

    it('Joins With Subquery Condition', () => {
      let builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoin('contacts', (j) => {
        j.on('users.id', 'contacts.id').whereIn('contact_type_id', (q) => {
          q.select('id').from('contact_types')
            .where('category_id', '1')
            .whereNull('deleted_at')
        })
      })
      expect(builder.toSql()).to.be.equal('select * from "users" left join "contacts" on "users"."id" = "contacts"."id" and "contact_type_id" in (select "id" from "contact_types" where "category_id" = ? and "deleted_at" is null)')
      expect(builder.getBindings()).to.be.deep.equal(['1'])

      builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoin('contacts', (j) => {
        j.on('users.id', 'contacts.id').whereExists((q) => {
          q.selectRaw('1').from('contact_types')
            .whereRaw('contact_types.id = contacts.contact_type_id')
            .where('category_id', '1')
            .whereNull('deleted_at')
        })
      })
      expect(builder.toSql()).to.be.equal('select * from "users" left join "contacts" on "users"."id" = "contacts"."id" and exists (select 1 from "contact_types" where contact_types.id = contacts.contact_type_id and "category_id" = ? and "deleted_at" is null)')
      expect(builder.getBindings()).to.be.deep.equal(['1'])
    })

    it('Joins With Advanced Subquery Condition', () => {
      const builder = builderStub.getBuilder()
      builder.select('*').from('users').leftJoin('contacts', (j) => {
        j.on('users.id', 'contacts.id').whereExists((q) => {
          q.selectRaw('1').from('contact_types')
            .whereRaw('contact_types.id = contacts.contact_type_id')
            .where('category_id', '1')
            .whereNull('deleted_at')
            .whereIn('level_id', (q) => {
              q.select('id').from('levels')
                .where('is_active', true)
            })
        })
      })
      expect(builder.toSql()).to.be.equal('select * from "users" left join "contacts" on "users"."id" = "contacts"."id" and exists (select 1 from "contact_types" where contact_types.id = contacts.contact_type_id and "category_id" = ? and "deleted_at" is null and "level_id" in (select "id" from "levels" where "is_active" = ?))')
      expect(builder.getBindings()).to.be.deep.equal(['1', true])
    })

    it('Raw Expressions In Select', () => {
      const builder = builderStub.getBuilder()
      builder.select(new Raw('substr(foo, 6)')).from('users')
      expect(builder.toSql()).to.be.equal('select substr(foo, 6) from "users"')
    })

    it('Find Returns First Result By ID', () => {
      const builder = builderStub.getBuilder()

      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'foo': 'bar'}]))

      connectionMock.expects('select').once().withArgs('select * from "users" where "id" = ? limit 1', [1]).returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').find(1).then((results) => {
        expect(results).to.be.deep.equal({'foo': 'bar'})
      })
    })

    it('First Method Returns First Result', () => {
      const builder = builderStub.getBuilder()

      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'foo': 'bar'}]))

      connectionMock.expects('select').once().withArgs('select * from "users" where "id" = ? limit 1', [1]).returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').where('id', '=', 1).first().then((results) => {
        expect(results).to.be.deep.equal({'foo': 'bar'})
      })
    })

    it('List Methods Gets Array Of Column Values', () => {
      let builder = builderStub.getBuilder()

      let connectionMock = createMock(builder.getConnection())
      let processorMock = createMock(builder.getProcessor())
      let results = Promise.resolve(new Collection([{'foo': 'bar'}, {'foo': 'baz'}]))

      connectionMock.expects('select').once().returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').where('id', '=', 1).pluck('foo').then((results) => {
        expect(results.all()).to.be.deep.equal(['bar', 'baz'])
      })

      builder = builderStub.getBuilder()

      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())
      results = Promise.resolve(new Collection([{'id': 1, 'foo': 'bar'}, {'id': 10, 'foo': 'baz'}]))

      connectionMock.expects('select').once().returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').where('id', '=', 1).pluck('foo', 'id').then((results) => {
        expect(results.all()).to.be.deep.equal({1: 'bar', 10: 'baz'})
      })
    })

    it('Implode', () => {
      // Test without glue.
      let builder = builderStub.getBuilder()

      let connectionMock = createMock(builder.getConnection())
      let processorMock = createMock(builder.getProcessor())
      let results = Promise.resolve(new Collection([{'foo': 'bar'}, {'foo': 'baz'}]))

      connectionMock.expects('select').once().returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').where('id', '=', 1).implode('foo').then((results) => {
        expect(results).to.be.deep.equal('barbaz')
      })

      // Test with glue.
      builder = builderStub.getBuilder()

      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())
      results = Promise.resolve(new Collection([{'foo': 'bar'}, {'foo': 'baz'}]))

      connectionMock.expects('select').once().returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)
      builder.from('users').where('id', '=', 1).implode('foo', ',').then((results) => {
        expect('bar,baz').to.be.deep.equal(results)
      })
    })

    it('Value Method Returns Single Column', () => {
      const builder = builderStub.getBuilder()

      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'foo': 'bar'}]))

      connectionMock.expects('select').once().withArgs('select "foo" from "users" where "id" = ? limit 1', [1]).returns(results)
      processorMock.expects('processSelect').once().withArgs(builder, results).returns(results)

      builder.from('users').where('id', '=', 1).value('foo').then((results) => {
        expect(results).to.be.equal('bar')
      })
    })

    it('Aggregate Functions', () => {
      let builder = builderStub.getBuilder()
      let connectionMock = createMock(builder.getConnection())
      let processorMock = createMock(builder.getProcessor())
      let results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select count(*) as aggregate from "users"', []).returns(results)
      processorMock.expects('processSelect').once().returns(results)
      builder.from('users').count().then((results) => {
        expect(results).to.be.equal(1)
      })

      builder = builderStub.getBuilder()
      connectionMock = createMock(builder.getConnection())
      results = Promise.resolve(new Collection([{'exists': 1}]))

      connectionMock.expects('select').once().withArgs('select exists(select * from "users") as "exists"', []).returns(results)
      builder.from('users').exists().then((results) => {
        expect(results).to.be.equal(true)
      })

      builder = builderStub.getBuilder()
      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())
      results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select max("id") as aggregate from "users"', []).returns(results)
      processorMock.expects('processSelect').once().returns(results)
      builder.from('users').max('id').then((results) => {
        expect(results).to.be.equal(1)
      })

      builder = builderStub.getBuilder()
      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())
      results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select min("id") as aggregate from "users"', []).returns(results)
      processorMock.expects('processSelect').once().returns(results)
      builder.from('users').min('id').then((results) => {
        expect(results).to.be.equal(1)
      })

      builder = builderStub.getBuilder()
      connectionMock = createMock(builder.getConnection())
      processorMock = createMock(builder.getProcessor())
      results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select sum("id") as aggregate from "users"', []).returns(results)
      processorMock.expects('processSelect').once().returns(results)
      builder.from('users').sum('id').then((results) => {
        expect(results).to.be.equal(1)
      })
    })

    it('SqlServer Exists', () => {
      const builder = builderStub.getSqlServerBuilder()
      const connectionMock = createMock(builder.getConnection())
      const results = Promise.resolve(new Collection([{'exists': 1}]))

      connectionMock.expects('select').once().withArgs('select top 1 1 [exists] from [users]', []).returns(results)
      builder.from('users').exists().then((results) => {
        expect(results).to.be.equal(true)
      })
    })

    it('Aggregate Reset Followed By Get', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())
      const results1 = Promise.resolve(new Collection([{'aggregate': 1}]))
      const results2 = Promise.resolve(new Collection([{'aggregate': 2}]))
      const results3 = Promise.resolve(new Collection([{'column1': 'foo', 'column2': 'bar'}]))

      connectionMock.expects('select').once().withArgs('select count(*) as aggregate from "users"', []).returns(results1)
      connectionMock.expects('select').once().withArgs('select sum("id") as aggregate from "users"', []).returns(results2)
      connectionMock.expects('select').once().withArgs('select "column1", "column2" from "users"', []).returns(results3)

      builder.from('users').select('column1', 'column2')
      builder.count().then((count) => {
        expect(count).to.be.equal(1)
      })

      builder.sum('id').then((sum) => {
        expect(sum).to.be.equal(2)
      })

      builder.get().then((result) => {
        expect(result.all()).to.be.deep.equal([{'column1': 'foo', 'column2': 'bar'}])
      })
    })

    it('Aggregate Reset Followed By Select Get', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())
      const results1 = Promise.resolve(new Collection([{'aggregate': 1}]))
      const results2 = Promise.resolve(new Collection([{'column2': 'foo', 'column3': 'bar'}]))

      connectionMock.expects('select').once().withArgs('select count("column1") as aggregate from "users"', []).returns(results1)
      connectionMock.expects('select').once().withArgs('select "column2", "column3" from "users"', []).returns(results2)

      builder.from('users')
      builder.count('column1').then((count) => {
        expect(count).to.be.equal(1)
      })

      builder.select('column2', 'column3').get().then((result) => {
        expect(result.all()).to.be.deep.equal([{'column2': 'foo', 'column3': 'bar'}])
      })
    })

    it('Aggregate With Sub Select', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())
      const processorMock = createMock(builder.getProcessor())
      const results = Promise.resolve(new Collection([{'aggregate': 1}]))

      connectionMock.expects('select').once().withArgs('select count(*) as aggregate from "users"', []).returns(results)
      processorMock.expects('processSelect').once().returns(results)

      builder.from('users').selectSub((query) => {
        query.from('posts').select('foo').where('title', 'foo')
      }, 'post')
      builder.count().then((count) => {
        expect(count).to.be.equal(1)
        expect(builder.getBindings()).to.be.deep.equal(['foo'])
      })
    })

    it('Subqueries Bindings', () => {
      let builder = builderStub.getBuilder()
      const second = builderStub.getBuilder().select('*').from('users').orderByRaw('id = ?', 2)
      const third = builderStub.getBuilder().select('*').from('users').where('id', 3).groupBy('id').having('id', '!=', 4)

      builder.groupBy('a').having('a', '=', 1).union(second).union(third)
      expect(builder.getBindings()).to.be.deep.equal([1, 2, 3, 4])

      builder = builderStub.getBuilder().select('*').from('users').where('email', '=', (q) => {
        q.select(new Raw('max(id)'))
          .from('users').where('email', '=', 'bar')
          .orderByRaw('email like ?', '%.com')
          .groupBy('id').having('id', '=', 4)
      }).orWhere('id', '=', 'foo').groupBy('id').having('id', '=', 5)
      expect(builder.getBindings()).to.be.deep.equal(['bar', 4, '%.com', 'foo', 5])
    })
  })

  describe('#insert', () => {
    it('Insert Method', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())

      connectionMock.expects('insert').once().withArgs('insert into "users" ("email") values (?)', ['foo']).returns(Promise.resolve(true))
      builder.from('users').insert({'email': 'foo'}).then((result) => {
        expect(result).to.be.equal(true)
      })
    })

    it('SQLite Multiple Inserts', () => {
      const builder = builderStub.getSQLiteBuilder()
      const connectionMock = createMock(builder.getConnection())

      connectionMock.expects('insert').once().withArgs('insert into "users" ("email", "name") select ? as "email", ? as "name" union all select ? as "email", ? as "name"', ['foo', 'taylor', 'bar', 'dayle']).returns(Promise.resolve(true))
      builder.from('users').insert([{'email': 'foo', 'name': 'taylor'}, {'email': 'bar', 'name': 'dayle'}]).then((result) => {
        expect(result).to.be.equal(true)
      })
    })

    it('Insert Get Id Method', () => {
      const builder = builderStub.getBuilder()
      const processorMock = createMock(builder.getProcessor())

      processorMock.expects('processInsertGetId').once().withArgs(builder, 'insert into "users" ("email") values (?)', ['foo'], 'id').returns(Promise.resolve(1))
      builder.from('users').insertGetId({'email': 'foo'}, 'id').then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('Insert Get Id Method Removes Expressions', () => {
      const builder = builderStub.getBuilder()
      const processorMock = createMock(builder.getProcessor())

      processorMock.expects('processInsertGetId').once().withArgs(builder, 'insert into "users" ("email", "bar") values (?, bar)', ['foo'], 'id').returns(Promise.resolve(1))
      builder.from('users').insertGetId({'email': 'foo', 'bar': new Raw('bar')}, 'id').then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('Insert Method Respects Raw Bindings', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())

      connectionMock.expects('insert').once().withArgs('insert into "users" ("email") values (CURRENT TIMESTAMP)', []).returns(Promise.resolve(true))
      builder.from('users')
        .insert({'email': new Raw('CURRENT TIMESTAMP')}).then((result) => {
          expect(result).to.be.equal(true)
        })
    })

    it('Multiple Inserts With Expression Values', () => {
      const builder = builderStub.getBuilder()
      const connectionMock = createMock(builder.getConnection())

      connectionMock.expects('insert').once().withArgs('insert into "users" ("email") values (UPPER(\'Foo\')), (LOWER(\'Foo\'))', []).returns(Promise.resolve(true))
      builder.from('users')
        .insert([{'email': new Raw("UPPER('Foo')")}, {'email': new Raw("LOWER('Foo')")}]).then((result) => {
          expect(result).to.be.equal(true)
        })
    })
  })

  describe('#update', () => {
    it('Update Method', () => {
      let builder = builderStub.getBuilder()
      let connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update "users" set "email" = ?, "name" = ? where "id" = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users').where('id', '=', 1).update({'email': 'foo', 'name': 'bar'}).then((result) => {
        expect(result).to.be.equal(1)
      })

      builder = builderStub.getMySqlBuilder()
      connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update `users` set `email` = ?, `name` = ? where `id` = ? order by `foo` desc limit 5', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users').where('id', '=', 1).orderBy('foo', 'desc')
        .limit(5).update({'email': 'foo', 'name': 'bar'})
        .then((result) => {
          expect(result).to.be.equal(1)
        })
    })

    it('Update Method With Joins', () => {
      let builder = builderStub.getBuilder()
      let connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update "users" inner join "orders" on "users"."id" = "orders"."user_id" set "email" = ?, "name" = ? where "users"."id" = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users').join('orders', 'users.id', '=', 'orders.user_id')
        .where('users.id', '=', 1)
        .update({'email': 'foo', 'name': 'bar'}).then((result) => {
          expect(result).to.be.equal(1)
        })

      builder = builderStub.getBuilder()
      connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update "users" inner join "orders" on "users"."id" = "orders"."user_id" and "users"."id" = ? set "email" = ?, "name" = ?', [1, 'foo', 'bar']).returns(Promise.resolve(1))
      builder.from('users').join('orders', (join) => {
        join.on('users.id', '=', 'orders.user_id')
          .where('users.id', '=', 1)
      }).update({'email': 'foo', 'name': 'bar'}).then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('Update Method With Joins On SqlServer', () => {
      let builder = builderStub.getSqlServerBuilder()
      let connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update [users] set [email] = ?, [name] = ? from [users] inner join [orders] on [users].[id] = [orders].[user_id] where [users].[id] = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users').join('orders', 'users.id', '=', 'orders.user_id')
        .where('users.id', '=', 1)
        .update({'email': 'foo', 'name': 'bar'}).then((result) => {
          expect(result).to.be.equal(1)
        })

      builder = builderStub.getSqlServerBuilder()
      connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update [users] set [email] = ?, [name] = ? from [users] inner join [orders] on [users].[id] = [orders].[user_id] and [users].[id] = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users').join('orders', (join) => {
        join.on('users.id', '=', 'orders.user_id')
          .where('users.id', '=', 1)
      }).update({'email': 'foo', 'name': 'bar'}).then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('Update Method With Joins On MySql', () => {
      let builder = builderStub.getMySqlBuilder()
      let connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update `users` inner join `orders` on `users`.`id` = `orders`.`user_id` set `email` = ?, `name` = ? where `users`.`id` = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users')
        .join('orders', 'users.id', '=', 'orders.user_id')
        .where('users.id', '=', 1)
        .update({'email': 'foo', 'name': 'bar'}).then((result) => {
          expect(result).to.be.equal(1)
        })

      builder = builderStub.getMySqlBuilder()
      connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update `users` inner join `orders` on `users`.`id` = `orders`.`user_id` and `users`.`id` = ? set `email` = ?, `name` = ?', [1, 'foo', 'bar']).returns(Promise.resolve(1))
      builder.from('users').join('orders', (join) => {
        join.on('users.id', '=', 'orders.user_id')
          .where('users.id', '=', 1)
      }).update({'email': 'foo', 'name': 'bar'}).then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('Update Method With Joins On SQLite', () => {
      let builder = builderStub.getSQLiteBuilder()
      let connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update "users" inner join "orders" on "users"."id" = "orders"."user_id" set "email" = ?, "name" = ? where "users"."id" = ?', ['foo', 'bar', 1]).returns(Promise.resolve(1))
      builder.from('users')
        .join('orders', 'users.id', '=', 'orders.user_id')
        .where('users.id', '=', 1)
        .update({'email': 'foo', 'name': 'bar'}).then((result) => {
          expect(result).to.be.equal(1)
        })

      builder = builderStub.getSQLiteBuilder()
      connectionMock = createMock(builder.getConnection())

      connectionMock.expects('update').once().withArgs('update "users" inner join "orders" on "users"."id" = "orders"."user_id" and "users"."id" = ? set "email" = ?, "name" = ?', [1, 'foo', 'bar']).returns(Promise.resolve(1))
      builder.from('users').join('orders', function (join) {
        join.on('users.id', '=', 'orders.user_id')
          .where('users.id', '=', 1)
      }).update({'email': 'foo', 'name': 'bar'}).then((result) => {
        expect(result).to.be.equal(1)
      })
    })

    it('', () => {

    })
  })
})
