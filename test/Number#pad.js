'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Number#pad', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should pad a number with zeros to the specified length', function () {
        expect((123456).jlib.pad(  )).to.equal('123456');
        expect((123456).jlib.pad(1 )).to.equal('6');
        expect((123456).jlib.pad(2 )).to.equal('56');
        expect((123456).jlib.pad(7 )).to.equal('0123456');
        expect((123456).jlib.pad(10)).to.equal('0000123456');
        expect((123456).jlib.pad(15)).to.equal('000000000123456');
        expect((123456).jlib.pad(-1)).to.equal('23456');
        expect((123456).jlib.pad(0 )).to.equal('');
    });

});
