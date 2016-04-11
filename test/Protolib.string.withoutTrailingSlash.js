'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.withoutTrailingSlash', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should remove trailing slashes from a string', function () {
        expect('path/with/slashes'._.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path/with/slashes/'._.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path / with / slashes /'._.withoutTrailingSlash()).to.equal('path / with / slashes ');
        expect('path/with/slashes////'._.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect(''._.withoutTrailingSlash()).to.equal('');
        expect('/'._.withoutTrailingSlash()).to.equal('');
        expect('///////////////'._.withoutTrailingSlash()).to.equal('');
    });
});
