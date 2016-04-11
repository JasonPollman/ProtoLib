'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.repeat', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should repeat strings as expected', function () {
        expect('*'._.repeat(-Infinity)).to.equal('*');
        expect('*'._.repeat(-1)).to.equal('*');
        expect('*'._.repeat(0)).to.equal('*');
        expect('*'._.repeat(1)).to.equal('*');
        expect('*'._.repeat(2)).to.equal('**');
        expect('*'._.repeat(3)).to.equal('***');
        expect('*'._.repeat(4)).to.equal('****');
        expect('*'._.repeat(20)).to.equal('********************');
        expect('*'._.repeat(Infinity)).to.equal('*');

        expect('hello world '._.repeat(2)).to.equal('hello world hello world ');

        expect('*'._.repeat('a')).to.equal('*');
        expect('*'._.repeat(null)).to.equal('*');
        expect('*'._.repeat(undefined)).to.equal('*');
        expect('*'._.repeat(function () {})).to.equal('*');
        expect('*'._.repeat({})).to.equal('*');
        expect('*'._.repeat([])).to.equal('*');
    });
});
