(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.withTrailingSlash', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
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
}());
