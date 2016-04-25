(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.object.getCallback', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        var funcA = function funcA () {};
        var funcB = function funcB () {};
        var funcC = function funcC () {};
        var funcD = function funcD () {};

        it('It should return the last function item in an array or object or an "empty" function', function () {
            var emptyFunction = []._.getCallback();

            expect([1, funcA, {}, [], 1, 'a', funcB, funcC, funcD]._.getCallback()).to.equal(funcD);

            expect([1, funcA, {}, [], 1, 'a']._.getCallback()).to.equal(emptyFunction).and.to.be.a('function');
            expect([1, 2, funcC, 4, 5]._.getCallback()).to.equal(emptyFunction);

            expect([1, funcA, {}, [], 1, 'a', funcB]._.getCallback()).to.equal(funcB);
            expect([1, funcA, {}, [], 1, 'a', funcB]._.getCallback()).to.be.a('function');
        });

        it('It should return the last function item in an array or object or an "empty" function', function () {
            expect({ a: 1, b: funcA, c: {}, d: [], e: 1, f: 'a', g: funcB, h: funcC, i: funcD }._.getCallback()).to.equal(funcD);
            expect({ a: 1, b: funcA, c: {}, d: [], e: 1, f: 'a'}._.getCallback()).to.be.a('function');

            expect({ a: 1, b: funcA, c: {}, d: [], e: 1, f: 'a', g: funcB}._.getCallback()).to.equal(funcB);
            expect({ a: 1, b: funcA, c: {}, d: [], e: 1, f: 'a', g: funcB}._.getCallback()).to.be.a('function');
        });

        it('It should return an "empty" function for booleans', function () {
            expect(true._.getCallback()).to.be.a('function');
            expect(false._.getCallback()).to.be.a('function');
        });

        it('It should return an "empty" function for non-object types (string, number, function)', function () {
            expect((1234)._.getCallback()).to.be.a('function');
            expect((-1234)._.getCallback()).to.be.a('function');
            expect((0)._.getCallback()).to.be.a('function');
            expect(('some string')._.getCallback()).to.be.a('function');
            expect(('')._.getCallback()).to.be.a('function');
            expect((function () {})._.getCallback()).to.be.a('function');
        });
    });
}());
