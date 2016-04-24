(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.choose', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the correct number of combinations', function () {
            expect((3)._.choose(2)).to.equal(3);
            expect((3)._.choose(2)).to.equal(3);
            expect((2)._.choose(3)).to.equal(0);
            expect((0)._.choose(0)).to.equal(1);

            for(var i = 0; i < 999; i++) {
                expect((i)._.choose(1)).to.equal(i);
                expect((i)._.choose(i)).to.equal(1);
            }

            expect((5)._.choose(3)).to.equal(10);
            expect((7)._.choose(3)).to.equal(35);
            expect((100)._.choose(3)).to.equal(161700);
            expect((1000)._.choose(3)).to.equal(166167000);

            expect((1000)._.choose(170)).to.equal(3.271846727950154e+196);
            expect((9999)._.choose(171)).to.equal(Infinity);
        });
    });
}());
