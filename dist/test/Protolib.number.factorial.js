(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.factorial', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the correct factorial computation', function () {
            expect((0)._.factorial()).to.equal(1);
            expect((1)._.factorial()).to.equal(1);
            expect((2)._.factorial()).to.equal(2);
            expect((3)._.factorial()).to.equal(6);
            expect((4)._.factorial()).to.equal(24);
            expect((5)._.factorial()).to.equal(120);
            expect((6)._.factorial()).to.equal(720);
            expect((7)._.factorial()).to.equal(5040);
            expect((8)._.factorial()).to.equal(40320);
            expect((9)._.factorial()).to.equal(362880);
            expect((10)._.factorial()).to.equal(3628800);

            expect((50)._.factorial()).to.equal(3.0414093201713376e+64);
            expect((99)._.factorial()).to.equal(9.33262154439441e+155);

            expect((170)._.factorial()).to.equal(7.257415615307994e+306);

            expect((171)._.factorial()).to.equal(Infinity);

            expect((-1)._.factorial()).to.be.NaN;
            expect((-10)._.factorial()).to.be.NaN;
            expect((-99999)._.factorial()).to.be.NaN;
        });
    });
}());
