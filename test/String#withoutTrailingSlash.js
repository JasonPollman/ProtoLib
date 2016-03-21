'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#withoutTrailingSlash', function () {

    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should remove trailing slashes from a string', function () {
        expect('path/with/slashes'.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path/with/slashes/'.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path / with / slashes /'.withoutTrailingSlash()).to.equal('path / with / slashes ');
        expect('path/with/slashes////'.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect(''.withoutTrailingSlash()).to.equal('');
        expect('/'.withoutTrailingSlash()).to.equal('');
        expect('///////////////'.withoutTrailingSlash()).to.equal('');
    });
});
