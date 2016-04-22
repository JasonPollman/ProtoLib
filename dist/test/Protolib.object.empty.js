(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.object.empty', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should correctly determine if an object is "empty"', function () {
            expect({}._.isEmpty()).to.equal(true);
            expect({ a: 0 }._.isEmpty()).to.equal(false);
            expect({ '0': null }._.isEmpty()).to.equal(false);
            expect(''._.isEmpty()).to.equal(true);
            expect(' '._.isEmpty()).to.equal(false);
            expect('\\'._.isEmpty()).to.equal(false);
            expect([]._.isEmpty()).to.equal(true);
            expect([null]._.isEmpty()).to.equal(false);
            expect([undefined]._.isEmpty()).to.equal(false);
            expect([1]._.isEmpty()).to.equal(false);
            expect((0)._.isEmpty()).to.equal(false);
            expect((1)._.isEmpty()).to.equal(false);
            expect((-1)._.isEmpty()).to.equal(false);
            expect((function () {})._.isEmpty()).to.equal(false);
        });
    });
}());
