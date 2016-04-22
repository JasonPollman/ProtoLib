(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.titleCase', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should capitalize the first word of each letter in a string', function () {
            expect('string string string'._.titleCase()).to.equal('String String String');
            expect('String String String'._.titleCase()).to.equal('String String String');
            expect('_string string string'._.titleCase()).to.equal('_string String String');
            expect('the lazy brown fox jumped over'._.titleCase()).to.equal('The Lazy Brown Fox Jumped Over');
            expect(''._.titleCase()).to.equal('');
        });
    });
}());
