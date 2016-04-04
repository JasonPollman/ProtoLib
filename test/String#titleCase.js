'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#titleCase', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should capitalize the first word of each letter in a string', function () {
        expect('string string string'.jlib.titleCase()).to.equal('String String String');
        expect('String String String'.jlib.titleCase()).to.equal('String String String');
        expect('_string string string'.jlib.titleCase()).to.equal('_string String String');
        expect('the lazy brown fox jumped over'.jlib.titleCase()).to.equal('The Lazy Brown Fox Jumped Over');
        expect(''.jlib.titleCase()).to.equal('');
    });
});
