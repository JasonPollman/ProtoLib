'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#splice', function () {

    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should splice strings, like arrays', function () {
        expect('string'.splice(0, 1)).to.equal('tring');
        expect('string'.splice(1, 1)).to.equal('sring');
        expect('string'.splice(1, -1)).to.equal('sstring');
        expect('string'.splice(0, -1)).to.equal('g');
        expect('string'.splice(0, -5)).to.equal('tring');
        expect('string'.splice(5, -5)).to.equal('strinstring');

        expect('string'.splice(0, 0, 'add')).to.equal('addstring');
        expect('string'.splice(0, 1, 'add')).to.equal('addtring');
        expect('string'.splice(1, 0, 'add')).to.equal('saddtring');
        expect('string'.splice(1, 0, '')).to.equal('string');
        expect('string'.splice(1, 100, 'add')).to.equal('sadd');
        expect('string'.splice(0, 9999, 'add')).to.equal('add');
        expect('string'.splice(9999, 9999, 'add')).to.equal('stringadd');
        expect('string'.splice(-99, -99, 'add')).to.equal('addstring');
        expect('string'.splice(-99, 0, 'add')).to.equal('addstring');
        expect('string'.splice(0, -1, 'add')).to.equal('addg');
    });
});
