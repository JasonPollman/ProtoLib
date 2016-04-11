'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.withTrailingSlash', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should add a trailing slash to a string, but replace multiple trailing slashes with a single one', function () {
        expect('path/with/slashes'._.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path/with/slashes/'._.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path / with / slashes /'._.withTrailingSlash()).to.equal('path / with / slashes /');
        expect('path/with/slashes////'._.withTrailingSlash()).to.equal('path/with/slashes/');
        expect(''._.withTrailingSlash()).to.equal('/');
        expect('/'._.withTrailingSlash()).to.equal('/');
        expect('///////////////'._.withTrailingSlash()).to.equal('/');
    });
});
