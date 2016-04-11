'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.lcFirst', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should lowercase the first letter of a string', function () {
        expect('string'._.lcFirst()).to.equal('string');
        expect('String'._.lcFirst()).to.equal('string');
        expect('string string'._.lcFirst()).to.equal('string string');
        expect('String string'._.lcFirst()).to.equal('string string');
        expect('string String'._.lcFirst()).to.equal('string String');
        expect('_string'._.lcFirst()).to.equal('_string');
        expect(''._.lcFirst()).to.equal('');
    });
});
