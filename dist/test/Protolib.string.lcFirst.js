(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.lcFirst', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should lowercase the first letter of a string', function () {
            expect('string'._.lcFirst()).to.equal('string');
            expect('String'._.lcFirst()).to.equal('string');
            expect('string string'._.lcFirst()).to.equal('string string');
            expect('String string'._.lcFirst()).to.equal('string string');
            expect('string String'._.lcFirst()).to.equal('string String');
            expect('_string'._.lcFirst()).to.equal('_string');
            expect(''._.lcFirst()).to.equal('');
        });
    });
}());
