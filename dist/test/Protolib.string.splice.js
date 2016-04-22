(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.splice', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should splice strings, like arrays', function () {
            expect('string'._.splice(0, 1)).to.equal('tring');
            expect('string'._.splice(1, 1)).to.equal('sring');
            expect('string'._.splice(1, -1)).to.equal('sstring');
            expect('string'._.splice(0, -1)).to.equal('g');
            expect('string'._.splice(0, -5)).to.equal('tring');
            expect('string'._.splice(5, -5)).to.equal('strinstring');

            expect('string'._.splice(0, 0, 'add')).to.equal('addstring');
            expect('string'._.splice(0, 1, 'add')).to.equal('addtring');
            expect('string'._.splice(1, 0, 'add')).to.equal('saddtring');
            expect('string'._.splice(1, 0, '')).to.equal('string');
            expect('string'._.splice(1, 100, 'add')).to.equal('sadd');
            expect('string'._.splice(0, 9999, 'add')).to.equal('add');
            expect('string'._.splice(9999, 9999, 'add')).to.equal('stringadd');
            expect('string'._.splice(-99, -99, 'add')).to.equal('addstring');
            expect('string'._.splice(-99, 0, 'add')).to.equal('addstring');
            expect('string'._.splice(0, -1, 'add')).to.equal('addg');
        });
    });

}());
