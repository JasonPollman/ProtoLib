(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.randomIntInRange', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a random integer in the range [min, max]', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange(1, 10)).to.be.lessThan(11).and.greaterThan(0);
            }
        });

        it('It should return a random integer in the range [min, max], #2', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange(0, 101)).to.be.lessThan(102).and.greaterThan(-1);
            }
        });

        it('It should return a random integer in the range [min, max], #3', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange(-1000, 1000)).to.be.lessThan(1001).and.greaterThan(-1001);
            }
        });

        it('It should fill an omitted max range with Number.MAX_VALUE', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange(500)).to.be.lessThan(Number.MAX_VALUE).and.greaterThan(499);
            }
        });

        it('It should fill an omitted min range with 0', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange(null, 500)).to.be.lessThan(501).and.greaterThan(-1);
            }
        });

        it('It should fill an omitted min range with 0, #2', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomIntInRange()).to.be.lessThan(Number.MAX_VALUE).and.greaterThan(-1);
            }
        });
    });
}());
