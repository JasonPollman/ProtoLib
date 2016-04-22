(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.size', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        // Create some test data
        var obj    = { foo: 'bar', num: 2, bool: false },
            eobj   = {},
            string = 'string',
            estr   = '',
            number = 124323,
            float  = 1324.234,
            func   = function () { console.log('HELLO WORLD!'); },
            subarr = [1, 2, 3],
            earr   = [];

        it('It should return the correct number of members given an object', function () {
            var o = obj._.size();
            expect(o).to.equal(3);

            o = eobj._.size();
            expect(o).to.equal(0);
        });

        it('It should return the correct number of members given undefined', function () {
            expect(lib.object.size(undefined)).to.equal(0);
            expect(lib.object.size(undefined, undefined)).to.equal(0);
            expect(lib.object.size()).to.equal(0);
        });

        it('It should return the correct number of members given null', function () {
            expect(lib.object.size(null)).to.equal(0);
            expect(lib.object.size(null, null)).to.equal(0);
        });

        it('It should return the correct number of members given an array', function () {
            var o = subarr._.size();
            expect(o).to.equal(3);

            o = earr._.size();
            expect(o).to.equal(0);
        });

        it('It should return the correct number of members given a string', function () {
            var o = string._.size();
            expect(o).to.equal(6);

            o = estr._.size();
            expect(o).to.equal(0);
        });

        it('It should return the correct number of members given a number', function () {
            var o = number._.size();
            expect(o).to.equal(6);

            o = float._.size();
            expect(o).to.equal(8);
        });

        it('It should return the correct number of members given a function', function () {
            var o = func._.size();
            expect(o).to.equal(1);
        });
    });
}());
