'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.pad', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should pad a string to the specified length', function () {
        expect('string'.jlib.pad(  )).to.equal('string');
        expect('string'.jlib.pad(1 )).to.equal('s');
        expect('string'.jlib.pad(2 )).to.equal('st');
        expect('string'.jlib.pad(7 )).to.equal('string ');
        expect('string'.jlib.pad(10)).to.equal('string    ');
        expect('string'.jlib.pad(15)).to.equal('string         ');
        expect('string'.jlib.pad(-1)).to.equal('strin');
        expect('string'.jlib.pad(0 )).to.equal('');
    });

    it('It should pad a string using the specified character', function () {
        expect('string'.jlib.pad(null, '+')).to.equal('string');
        expect('string'.jlib.pad(1   , '+')).to.equal('s');
        expect('string'.jlib.pad(2   , '+')).to.equal('st');
        expect('string'.jlib.pad(7   , '+')).to.equal('string+');
        expect('string'.jlib.pad(10  , '+')).to.equal('string++++');
        expect('string'.jlib.pad(15  , '+')).to.equal('string+++++++++');
        expect('string'.jlib.pad(-1  , '+')).to.equal('strin');
        expect('string'.jlib.pad(0   , '+')).to.equal('');
    });

    it('It should pre-pad a string if the post parameter is true', function () {
        expect('string'.jlib.pad(null, '+', true)).to.equal('string');
        expect('string'.jlib.pad(1   , '+', true)).to.equal('g');
        expect('string'.jlib.pad(2   , '+', true)).to.equal('ng');
        expect('string'.jlib.pad(7   , '+', true)).to.equal('+string');
        expect('string'.jlib.pad(10  , '+', true)).to.equal('++++string');
        expect('string'.jlib.pad(15  , '+', true)).to.equal('+++++++++string');
        expect('string'.jlib.pad(-1  , '+', true)).to.equal('tring');
        expect('string'.jlib.pad(0   , '+', true)).to.equal('');
    });
});
