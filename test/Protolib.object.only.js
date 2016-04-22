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
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
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
        });
    });
}());
