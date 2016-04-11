'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.titleCase', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should capitalize the first word of each letter in a string', function () {
        expect('string string string'._.titleCase()).to.equal('String String String');
        expect('String String String'._.titleCase()).to.equal('String String String');
        expect('_string string string'._.titleCase()).to.equal('_string String String');
        expect('the lazy brown fox jumped over'._.titleCase()).to.equal('The Lazy Brown Fox Jumped Over');
        expect(''._.titleCase()).to.equal('');
    });
});
