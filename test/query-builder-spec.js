'use strict'

const expect = require('chai').expect

const Raw = require('./../Kiirus/Database/Query/Expression')
const Collection = require('./../Kiirus/Database/Ceres/Collection')

const createMock = require('./tools/auto-verify-mock').createMock
const autoVerify = require('./tools/auto-verify-mock').autoVerify
const builderStub = require('./stubs/builder')

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
      expect('select * from [users] where day([created_at]) = ?').to.be.equal(builder.toSql())
      expect([1]).to.be.deep.equal(builder.getBindings())
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
      expect(['foo', 'bar'], builder.getBindings())
    })

    it('', () => {

    })
  })
})
