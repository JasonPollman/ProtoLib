'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.ucFirst', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should capitalize the first letter of a string', function () {
        expect('string'._.ucFirst()).to.equal('String');
        expect('String'._.ucFirst()).to.equal('String');
        expect('string string'._.ucFirst()).to.equal('String string');
        expect('String string'._.ucFirst()).to.equal('String string');
        expect('string String'._.ucFirst()).to.equal('String String');
        expect('_string'._.ucFirst()).to.equal('_string');
        expect(''._.ucFirst()).to.equal('');
    });
});
