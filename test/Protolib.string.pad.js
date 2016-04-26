(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.pad', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should pad a string to the specified length', function () {
            expect('string'._.pad(  )).to.equal('string');
            expect('string'._.pad(1 )).to.equal('s');
            expect('string'._.pad(2 )).to.equal('st');
            expect('string'._.pad(7 )).to.equal('string ');
            expect('string'._.pad(10)).to.equal('string    ');
            expect('string'._.pad(15)).to.equal('string         ');
            expect('string'._.pad(-1)).to.equal('strin');
            expect('string'._.pad(0 )).to.equal('');

            expect('hello world!'._.pad(3)).to.equal('hel');
            expect('hello world!'._.pad(20)).to.equal('hello world!        ');

            // Custom pad string
            expect('hello world!'._.pad(3, '-')).to.equal('hel');
            expect('hello world!'._.pad(20, '-')).to.equal('hello world!--------');

            // If *pre* parameter is passed true...
            expect('hello world!'._.pad(3, '-', true)).to.equal('ld!');
            expect('hello world!'._.pad(20, '-', true)).to.equal('--------hello world!');
        });

        it('It should pad a string using the specified character', function () {
            expect('string'._.pad(null, '+')).to.equal('string');
            expect('string'._.pad(1   , '+')).to.equal('s');
            expect('string'._.pad(2   , '+')).to.equal('st');
            expect('string'._.pad(7   , '+')).to.equal('string+');
            expect('string'._.pad(10  , '+')).to.equal('string++++');
            expect('string'._.pad(15  , '+')).to.equal('string+++++++++');
            expect('string'._.pad(-1  , '+')).to.equal('strin');
            expect('string'._.pad(0   , '+')).to.equal('');
        });

        it('It should pre-pad a string if the post parameter is true', function () {
            expect('string'._.pad(null, '+', true)).to.equal('string');
            expect('string'._.pad(1   , '+', true)).to.equal('g');
            expect('string'._.pad(2   , '+', true)).to.equal('ng');
            expect('string'._.pad(7   , '+', true)).to.equal('+string');
            expect('string'._.pad(10  , '+', true)).to.equal('++++string');
            expect('string'._.pad(15  , '+', true)).to.equal('+++++++++string');
            expect('string'._.pad(-1  , '+', true)).to.equal('tring');
            expect('string'._.pad(0   , '+', true)).to.equal('');
        });
    });

}());
