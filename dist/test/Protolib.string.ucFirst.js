(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.ucFirst', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should capitalize the first letter of a string', function () {
            expect('string'._.ucFirst()).to.equal('String');
            expect('String'._.ucFirst()).to.equal('String');
            expect('string string'._.ucFirst()).to.equal('String string');
            expect('String string'._.ucFirst()).to.equal('String string');
            expect('string String'._.ucFirst()).to.equal('String String');
            expect('_string'._.ucFirst()).to.equal('_string');
            expect(''._.ucFirst()).to.equal('');
        });
    });
}());
