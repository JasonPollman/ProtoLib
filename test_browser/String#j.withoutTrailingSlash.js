'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.withoutTrailingSlash', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should remove trailing slashes from a string', function () {
        expect('path/with/slashes'.jlib.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path/with/slashes/'.jlib.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path / with / slashes /'.jlib.withoutTrailingSlash()).to.equal('path / with / slashes ');
        expect('path/with/slashes////'.jlib.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect(''.jlib.withoutTrailingSlash()).to.equal('');
        expect('/'.jlib.withoutTrailingSlash()).to.equal('');
        expect('///////////////'.jlib.withoutTrailingSlash()).to.equal('');
    });
});
