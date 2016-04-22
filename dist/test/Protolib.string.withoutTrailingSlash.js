(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.withoutTrailingSlash', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
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
}());
