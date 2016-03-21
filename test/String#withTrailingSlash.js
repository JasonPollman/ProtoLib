'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#withTrailingSlash', function () {

    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should add a trailing slash to a string, but replace multiple trailing slashes with a single one', function () {
        expect('path/with/slashes'.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path/with/slashes/'.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path / with / slashes /'.withTrailingSlash()).to.equal('path / with / slashes /');
        expect('path/with/slashes////'.withTrailingSlash()).to.equal('path/with/slashes/');
        expect(''.withTrailingSlash()).to.equal('/');
        expect('/'.withTrailingSlash()).to.equal('/');
        expect('///////////////'.withTrailingSlash()).to.equal('/');
    });
});
