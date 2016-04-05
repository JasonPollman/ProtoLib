'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.lcFirst', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should lowercase the first letter of a string', function () {
        expect('string'.jlib.lcFirst()).to.equal('string');
        expect('String'.jlib.lcFirst()).to.equal('string');
        expect('string string'.jlib.lcFirst()).to.equal('string string');
        expect('String string'.jlib.lcFirst()).to.equal('string string');
        expect('string String'.jlib.lcFirst()).to.equal('string String');
        expect('_string'.jlib.lcFirst()).to.equal('_string');
        expect(''.jlib.lcFirst()).to.equal('');
    });
});
