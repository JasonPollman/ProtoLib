'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.repeat', function () {

    before(function () {
        require(path.join(__dirname, '..'))('j');
    });

    it('It should repeat strings as expected', function () {
        expect('*'.j.repeat(-Infinity)).to.equal('*');
        expect('*'.j.repeat(-1)).to.equal('*');
        expect('*'.j.repeat(0)).to.equal('*');
        expect('*'.j.repeat(1)).to.equal('*');
        expect('*'.j.repeat(2)).to.equal('**');
        expect('*'.j.repeat(3)).to.equal('***');
        expect('*'.j.repeat(4)).to.equal('****');
        expect('*'.j.repeat(20)).to.equal('********************');
        expect('*'.j.repeat(Infinity)).to.equal('*');

        expect('hello world '.j.repeat(2)).to.equal('hello world hello world ');

        expect('*'.j.repeat('a')).to.equal('*');
        expect('*'.j.repeat(null)).to.equal('*');
        expect('*'.j.repeat(undefined)).to.equal('*');
        expect('*'.j.repeat(function () {})).to.equal('*');
        expect('*'.j.repeat({})).to.equal('*');
        expect('*'.j.repeat([])).to.equal('*');
    });
});
