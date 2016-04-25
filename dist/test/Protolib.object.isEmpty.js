(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isEmpty', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should recognize null and undefined as "empty"', function () {
            expect(lib.object.isEmpty(undefined)).to.equal(true);
            expect(lib.object.isEmpty(null)).to.equal(true);

            expect(lib.object.isEmpty(undefined, null, undefined)).to.equal(true);
            expect(lib.object.isEmpty(null, null, undefined)).to.equal(true);

            expect(lib.object.isEmpty(undefined, 1)).to.equal(false);
            expect(lib.object.isEmpty(null, 1)).to.equal(false);
        });

        it('It should recognize strings, functions, and all numbers as "not empty"', function () {
            expect(lib.object.isEmpty(1)).to.equal(false);
            expect(lib.object.isEmpty('a')).to.equal(false);
            expect(lib.object.isEmpty('')).to.equal(false);
            expect(lib.object.isEmpty(function () {})).to.equal(false);
            expect(lib.object.isEmpty(0)).to.equal(false);
            expect(lib.object.isEmpty(-1)).to.equal(false);
        });

        it('It should recognize objects that have (their own) keys as "not empty"', function () {
            expect(lib.object.isEmpty({ foo: 'bar' })).to.equal(false);
            expect(lib.object.isEmpty({ foo: 'bar', '1': 7 })).to.equal(false);
            expect(lib.object.isEmpty([1, 2, 3, 'a'])).to.equal(false);
        });

        it('It should recognize objects that have no keys as "empty"', function () {
            expect(lib.object.isEmpty({})).to.equal(true);
            expect(lib.object.isEmpty([])).to.equal(true);
        });
    });

}());
