(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.intersectString', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the characters only common to both strings', function () {
            expect('hello'._.intersectString('world')).to.equal('lo');
            expect('aaa'._.intersectString('aaa')).to.equal('aaa');
            expect('aaa'._.intersectString('aa')).to.equal('aa');
            expect(''._.intersectString('world')).to.equal('');
            expect(''._.intersectString('')).to.equal('');
            expect('1'._.intersectString('1')).to.equal('1');
            expect('hello'._.intersectString('hello')).to.equal('hello');
        });
    });

}());
