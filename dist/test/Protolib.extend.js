(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.extend', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        var o = {}, a = [], s = 'string', f = function () {}, n = 123, d = new Date();

        it('It should properly extend objects', function () {
            lib.extend('test', 'object', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
            });

            expect(o._.test).to.be.a('function');
            expect(lib.object.test).to.be.a('function');
            o._.test(1, 2);

            expect(a._.test).to.be.a('function');
            a._.test(1, 2);

            expect(s._.test).to.be.a('function');
            s._.test(1, 2);

            expect(n._.test).to.be.a('function');
            n._.test(1, 2);

            expect(f._.test).to.be.a('function');
            f._.test(1, 2);

            expect(d._.test).to.be.a('function');
            d._.test(1, 2);

            lib.extend('test2', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
            });

            expect(o._.test2).to.be.a('function');
            expect(lib.object.test2).to.be.a('function');
            o._.test(1, 2);

            expect(a._.test2).to.be.a('function');
            a._.test(1, 2);

            expect(s._.test2).to.be.a('function');
            s._.test(1, 2);

            expect(n._.test2).to.be.a('function');
            n._.test(1, 2);

            expect(f._.test2).to.be.a('function');
            f._.test(1, 2);

            // Make sure second argument is optional, and that we can overwrite library methods.
            lib.extend('test', function ($1, $2, $3) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                expect($3).to.equal('a');
            });

            expect(o._.test).to.be.a('function');
            expect(lib.object.test).to.be.a('function');
            o._.test(1, 2, 'a');

            expect(a._.test).to.be.a('function');
            a._.test(1, 2, 'a');

            expect(s._.test).to.be.a('function');
            s._.test(1, 2, 'a');

            expect(n._.test).to.be.a('function');
            n._.test(1, 2, 'a');

            expect(f._.test).to.be.a('function');
            f._.test(1, 2, 'a');
        });

        it('It should properly extend strings', function () {
            lib.extend('string_test', 'string', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.string_test).to.be.a('function');
            expect(lib.object.string_test).to.be.a('undefined');
            expect(lib.number.string_test).to.be.a('undefined');
            expect(lib.function.string_test).to.be.a('undefined');
            expect(lib.date.string_test).to.be.a('undefined');
            expect(lib.array.string_test).to.be.a('undefined');

            expect(o._.string_test).to.be.a('undefined');
            expect(a._.string_test).to.be.a('undefined');
            expect(s._.string_test).to.be.a('function');
            expect(n._.string_test).to.be.a('undefined');
            expect(n._.string_test).to.be.a('undefined');

            expect(s._.string_test(1, 2, 'a')).to.equal(s);
        });

        it('It should properly extend numbers', function () {
            var o = {}, a = [], s = 'string', f = function () {}, n = 123;

            lib.extend('number_test', 'number', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.number_test).to.be.a('undefined');
            expect(lib.object.number_test).to.be.a('undefined');
            expect(lib.number.number_test).to.be.a('function');
            expect(lib.function.number_test).to.be.a('undefined');
            expect(lib.date.number_test).to.be.a('undefined');
            expect(lib.array.number_test).to.be.a('undefined');

            expect(o._.number_test).to.be.a('undefined');
            expect(a._.number_test).to.be.a('undefined');
            expect(s._.number_test).to.be.a('undefined');
            expect(n._.number_test).to.be.a('function');
            expect(f._.number_test).to.be.a('undefined');
            expect(d._.number_test).to.be.a('undefined');

            expect(n._.number_test(1, 2, 'a')).to.equal(n);
        });

        it('It should properly extend functions', function () {
            lib.extend('function_test', 'function', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.function_test).to.be.a('undefined');
            expect(lib.object.function_test).to.be.a('undefined');
            expect(lib.number.function_test).to.be.a('undefined');
            expect(lib.function.function_test).to.be.a('function');
            expect(lib.date.function_test).to.be.a('undefined');
            expect(lib.array.function_test).to.be.a('undefined');

            expect(o._.function_test).to.be.a('undefined');
            expect(a._.function_test).to.be.a('undefined');
            expect(f._.function_test).to.be.a('function');
            expect(s._.function_test).to.be.a('undefined');
            expect(n._.function_test).to.be.a('undefined');
            expect(d._.function_test).to.be.a('undefined');

            expect(f._.function_test(1, 2, 'a')).to.equal(f);
        });

        it('It should properly extend arrays', function () {
            lib.extend('array_test', 'array', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.array_test).to.be.a('undefined');
            expect(lib.object.array_test).to.be.a('undefined');
            expect(lib.number.array_test).to.be.a('undefined');
            expect(lib.function.array_test).to.be.a('undefined');
            expect(lib.date.array_test).to.be.a('undefined');
            expect(lib.array.array_test).to.be.a('function');

            expect(o._.array_test).to.be.a('undefined');
            expect(a._.array_test).to.be.a('function');
            expect(f._.array_test).to.be.a('undefined');
            expect(s._.array_test).to.be.a('undefined');
            expect(n._.array_test).to.be.a('undefined');
            expect(d._.array_test).to.be.a('undefined');

            expect(a._.array_test(1, 2, 'a')).to.equal(a);
        });

        it('It should properly extend dates', function () {
            lib.extend('date_test', 'date', function ($1, $2) {
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.date_test).to.be.a('undefined');
            expect(lib.object.date_test).to.be.a('undefined');
            expect(lib.number.date_test).to.be.a('undefined');
            expect(lib.function.date_test).to.be.a('undefined');
            expect(lib.date.date_test).to.be.a('function');
            expect(lib.array.date_test).to.be.a('undefined');

            expect(o._.date_test).to.be.a('undefined');
            expect(d._.date_test).to.be.a('function');
            expect(f._.date_test).to.be.a('undefined');
            expect(s._.date_test).to.be.a('undefined');
            expect(n._.date_test).to.be.a('undefined');
            expect(a._.date_test).to.be.a('undefined');

            expect(d._.date_test(1, 2, 'a')).to.equal(d.getTime());
        });

        it('It should properly remove methods', function () {
            expect(o._.test).to.be.a('function');
            expect(s._.test).to.be.a('function');
            expect(n._.test).to.be.a('function');
            expect(a._.test).to.be.a('function');
            expect(f._.test).to.be.a('function');
            expect(d._.test).to.be.a('function');

            expect(lib.object.test).to.be.a('function');

            expect(lib.string.string_test).to.be.a('function');
            expect(s._.string_test).to.be.a('function');

            expect(lib.number.number_test).to.be.a('function');
            expect(n._.number_test).to.be.a('function');

            expect(lib.function.function_test).to.be.a('function');
            expect(f._.function_test).to.be.a('function');

            expect(lib.date.date_test).to.be.a('function');
            expect(d._.date_test).to.be.a('function');

            expect(lib.array.array_test).to.be.a('function');
            expect(a._.array_test).to.be.a('function');

            expect(lib.remove('test', 'object')).to.equal(true);
            expect(o._.test).to.be.a('undefined');
            expect(s._.test).to.be.a('undefined');
            expect(n._.test).to.be.a('undefined');
            expect(a._.test).to.be.a('undefined');
            expect(f._.test).to.be.a('undefined');
            expect(d._.test).to.be.a('undefined');

            expect(lib.object.test).to.be.a('undefined');

            expect(lib.remove('test', 'object')).to.equal(false);

            expect(lib.remove('string_test', 'string')).to.equal(true);
            expect(lib.string.string_test).to.be.a('undefined');
            expect(s._.string_test).to.be.a('undefined');

            expect(lib.remove('number_test', 'number')).to.equal(true);
            expect(lib.number.number_test).to.be.a('undefined');
            expect(n._.number_test).to.be.a('undefined');

            expect(lib.remove('function_test', 'function')).to.equal(true);
            expect(lib.function.function_test).to.be.a('undefined');
            expect(f._.function_test).to.be.a('undefined');

            expect(lib.remove('array_test', 'array')).to.equal(true);
            expect(lib.array.array_test).to.be.a('undefined');
            expect(a._.array_test).to.be.a('undefined');

            expect(lib.remove('date_test', 'date')).to.equal(true);
            expect(lib.date.date_test).to.be.a('undefined');
            expect(d._.date_test).to.be.a('undefined');

            // Spot check that other methods still exist...
            expect(s._.reverse).to.be.a('function');
            expect(o._.invert).to.be.a('function');
            expect(a._.rotate).to.be.a('function');
            expect(s._.invert).to.be.a('function');
            expect(a._.invert).to.be.a('function');
        });
    });
}());
