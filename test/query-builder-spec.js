'use strict'

const expect = require('chai').expect

const Raw = require('./../Kiirus/Database/Query/Expression')

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
      const callback = function (query) {
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
  })
})
