(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.regexpSafe', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should escape RegExp special characters (/[-\/\\^$*+?.()|[\]{}]/g)', function () {
            expect('-\/\\^$*+?.()|[\]{}'._.regexpSafe()).to.equal('\\-\\\/\\\\\\^\\$\\*\\+\\?\\.\\(\\)\\|\\[\\\]\\{\\}');
            expect(''._.regexpSafe()).to.equal('');
            expect('-'._.regexpSafe()).to.equal('\\-');
            expect('???'._.regexpSafe()).to.equal('\\?\\?\\?');
            expect('****'._.regexpSafe()).to.equal('\\*\\*\\*\\*');
        });
    });
}());
