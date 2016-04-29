(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.to', function () {
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
            for(var i = 0; i < 1000; i++) {
                expect((0)._.to(100)).to.be.lessThan(101).and.greaterThan(-1);
            }
        });

        it('It should return a random number in the range [min, max], #2', function () {
            for(var i = 0; i < 1000; i++) {
                expect((-1)._.to(-1)).to.equal(-1);
            }
        });

        it('It should return a random number in the range [min, max], #3', function () {
            for(var i = 0; i < 1000; i++) {
                expect((-1.001)._.to(-1.001)).to.equal(-1.001);
            }
        });

        it('It should return a random number in the range [min, max], #4', function () {
            for(var i = 0; i < 1000; i++) {
                expect((-10)._.to(-10)).to.be.lessThan(11).and.greaterThan(-11);
            }
        });

        it('It should return a random number in the range [min, max], #5', function () {
            for(var i = 0; i < 1000; i++) {
                expect((-1000)._.to()).to.be.lessThan(Number.MAX_VALUE).and.greaterThan(-1001);
            }
        });
    });
}());
