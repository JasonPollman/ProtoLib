'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.withTrailingSlash', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should add a trailing slash to a string, but replace multiple trailing slashes with a single one', function () {
        expect('path/with/slashes'.jlib.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path/with/slashes/'.jlib.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path / with / slashes /'.jlib.withTrailingSlash()).to.equal('path / with / slashes /');
        expect('path/with/slashes////'.jlib.withTrailingSlash()).to.equal('path/with/slashes/');
        expect(''.jlib.withTrailingSlash()).to.equal('/');
        expect('/'.jlib.withTrailingSlash()).to.equal('/');
        expect('///////////////'.jlib.withTrailingSlash()).to.equal('/');
    });
});
