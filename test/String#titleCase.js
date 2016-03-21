'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#titleCase', function () {

    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should capitalize the first word of each letter in a string with a length > 3', function () {
        expect('string string string'.titleCase()).to.equal('String String String');
        expect('String String String'.titleCase()).to.equal('String String String');
        expect('_string string string'.titleCase()).to.equal('_string String String');
        expect('the lazy brown fox jumped over'.titleCase()).to.equal('The Lazy Brown fox Jumped Over');
        expect(''.titleCase()).to.equal('');
    });
});
