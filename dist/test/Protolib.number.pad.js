(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.pad', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should pad a number with zeros to the specified length', function () {
            expect((123456)._.pad(  )).to.equal('123456');
            expect((123456)._.pad(1 )).to.equal('6');
            expect((123456)._.pad(2 )).to.equal('56');
            expect((123456)._.pad(7 )).to.equal('0123456');
            expect((123456)._.pad(10)).to.equal('0000123456');
            expect((123456)._.pad(15)).to.equal('000000000123456');
            expect((123456)._.pad(-1)).to.equal('23456');
            expect((123456)._.pad(0 )).to.equal('');
        });
    });
}());
