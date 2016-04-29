(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.randomNumberInRange', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a random number in the range [min, max]', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange(1.123, 10.57)).to.be.lessThan(10.57000000000001).and.greaterThan(1.12299999999999);
            }
        });

        it('It should return a random number in the range [min, max], #2', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange(0.001, 101.8)).to.be.lessThan(101.80000001).and.greaterThan(0.0009);
            }
        });

        it('It should return a random number in the range [min, max], #3', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange(-1000, 1000)).to.be.lessThan(1001).and.greaterThan(-1001);
            }
        });

        it('It should fill an omitted max range with Number.MAX_VALUE', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange(500.2)).to.be.lessThan(Number.MAX_VALUE).and.greaterThan(500.199999999999);
            }
        });

        it('It should fill an omitted min range with 0', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange(null, 500)).to.be.lessThan(500.0000001).and.greaterThan(-1);
            }
        });

        it('It should fill an omitted min range with 0, #2', function () {
            for(var i = 0; i < 10000; i++) {
                expect(lib.number.randomNumberInRange()).to.be.lessThan(Number.MAX_VALUE).and.greaterThan(-0.0000000000001);
            }
        });
    });
}());
