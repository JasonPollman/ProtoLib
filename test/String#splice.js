'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#splice', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should splice strings, like arrays', function () {
        expect('string'.jlib.splice(0, 1)).to.equal('tring');
        expect('string'.jlib.splice(1, 1)).to.equal('sring');
        expect('string'.jlib.splice(1, -1)).to.equal('sstring');
        expect('string'.jlib.splice(0, -1)).to.equal('g');
        expect('string'.jlib.splice(0, -5)).to.equal('tring');
        expect('string'.jlib.splice(5, -5)).to.equal('strinstring');

        expect('string'.jlib.splice(0, 0, 'add')).to.equal('addstring');
        expect('string'.jlib.splice(0, 1, 'add')).to.equal('addtring');
        expect('string'.jlib.splice(1, 0, 'add')).to.equal('saddtring');
        expect('string'.jlib.splice(1, 0, '')).to.equal('string');
        expect('string'.jlib.splice(1, 100, 'add')).to.equal('sadd');
        expect('string'.jlib.splice(0, 9999, 'add')).to.equal('add');
        expect('string'.jlib.splice(9999, 9999, 'add')).to.equal('stringadd');
        expect('string'.jlib.splice(-99, -99, 'add')).to.equal('addstring');
        expect('string'.jlib.splice(-99, 0, 'add')).to.equal('addstring');
        expect('string'.jlib.splice(0, -1, 'add')).to.equal('addg');
    });
});
