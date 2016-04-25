(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.only', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should simply return booleans', function () {
            expect(true._.only('string')).to.equal(true);
            expect(true._.only('number')).to.equal(true);

            expect(false._.only('string')).to.equal(false);
            expect(false._.only('number')).to.equal(false);

            expect([true, 'x', false, 12, true, 4]._.only('boolean')).to.eql([true, false, true]);
        });

        it('It should return only the values of the specified type in an object', function () {
            var f = function () {};
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string')).to.eql(['string', 'hello', 'world']);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('number')).to.eql([1, 2]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('array')).to.eql([[1], [1, 2]]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('object')).to.eql([[1], [1, 2], { foo: 'bar' }]);
            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('function')).to.eql([f]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('object object')).to.eql([{ foo: 'bar' }]);

            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number')).to.eql([1, 2, 'string', 'hello', 'world']);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('number', 'object')).to.eql([1, 2, [1], [1, 2], { foo: 'bar' }]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('number', 'object object')).to.eql([1, 2, { foo: 'bar' }]);

            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'object')).to.eql([1, 2, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar' }]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'object object')).to.eql([1, 2, 'string', 'hello', 'world', { foo: 'bar' }]);

            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('array')).to.eql([[1], [1, 2]]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('array', 'object object')).to.eql([[1], [1, 2], { foo: 'bar' }]);
            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}, {}, [], {}])._.only('object object', 'array')).to.eql([[1], [1, 2], { foo: 'bar' }, {}, [], {}]);

            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('object')).to.eql([[1], [1, 2], { foo: 'bar' }]);
            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('function')).to.eql([f]);
            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('function', 'object object')).to.eql([f, { foo: 'bar'}]);

            expect(([1, 2, function () {}, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('object object')).to.eql([{ foo: 'bar' }]);

            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'function', 'object'))
                .to.eql([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}]);

            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'function', 'object object'))
                .to.eql([1, 2, f, 'string', 'hello', 'world', { foo: 'bar'}]);

            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'function', 'array'))
                .to.eql([1, 2, f, 'string', 'hello', 'world', [1], [1, 2]]);

            expect(([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}])._.only('string', 'number', 'function', 'object object', 'array'))
                .to.eql([1, 2, f, 'string', 'hello', 'world', [1], [1, 2], { foo: 'bar'}]);

            var foo, bar;
            foo = [1, 2, 3, 'a', 'b', 'c', 4, 5, 6];

            bar = foo._.only('numbers');
            expect(bar).to.eql([1, 2, 3, 4, 5, 6]);

            bar = foo._.only('strings');
            expect(bar).to.eql(['a', 'b', 'c']);

            bar = foo._.only('numbers', 'strings');
            expect(bar).to.eql([1, 2, 3, 'a', 'b', 'c', 4, 5, 6]);

            var funct = function () {};

            foo = {
                a: [1, 2, 3],
                b: 'a string',
                c: funct,
                d: null,
                e: { z: 9, y: 8 }
            };

            bar = foo._.only('object');
            expect(bar).to.eql({ a: [1, 2, 3], d: null, e: { z: 9, y: 8 } });

            bar = foo._.only('array');
            expect(bar).to.eql({ a: [1, 2, 3] });

            bar = foo._.only('object object');
            expect(bar).to.eql({ d: null, e: { z: 9, y: 8 } });

            bar = foo._.only('function');
            expect(bar).to.eql({ c: funct });

            // Useless on strings, numbers, and functions...
            bar = (5)._.only('string');
            expect(bar).to.eql(5);

            bar = ('hello world')._.only('string');
            expect(bar).to.eql('hello world');

            expect(lib.object.only(null, 'string')).to.equal(null);
            expect(lib.object.only(undefined, 'string')).to.equal(undefined);

            expect(lib.object.only(null, 'number')).to.equal(null);
            expect(lib.object.only(undefined, 'number')).to.equal(undefined);

            expect(lib.object.only(null, 'object')).to.equal(null);
            expect(lib.object.only(undefined, 'object')).to.equal(undefined);

            expect(lib.object.only(null, 'array')).to.equal(null);
            expect(lib.object.only(undefined, 'array')).to.equal(undefined);

            expect(lib.object.only(null, 'function')).to.equal(null);
            expect(lib.object.only(undefined, 'function')).to.equal(undefined);
        });
    });
}());
