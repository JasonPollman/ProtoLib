(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.randomString', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a random string less with the given length', function () {
            var possible = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSUVWXYZ_ `~!@#$%^&*()_+\\|][\';/.,|}{":?><';

            for(var i = 0; i < 100; i++) {
                var s = lib.string.randomString(5);
                expect(s.length).to.equal(5);

                for(var n = 0; n < s.length; s++) {
                    expect(possible.indexOf(s[n])).to.be.greaterThan(-1);
                }
            }
        });

        it('It should respect the possible parameter', function () {
            var possible = '0123456789', i, n, s;

            for(i = 0; i < 100; i++) {
                s = lib.string.randomString(50, possible);
                expect(s.length).to.equal(50);

                for(n = 0; n < s.length; s++) {
                    expect(possible.indexOf(s[n])).to.be.greaterThan(-1);
                }
            }

            possible = 'a';
            for(i = 0; i < 100; i++) {
                s = lib.string.randomString(100, possible);
                expect(s.length).to.equal(100);

                for(n = 0; n < s.length; s++) {
                    expect(possible.indexOf(s[n])).to.be.greaterThan(-1);
                }
            }
        });

        it('It should default to a length of 10', function () {
            var possible = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSUVWXYZ_ `~!@#$%^&*()_+\\|][\';/.,|}{":?><', i, n, s;

            for(i = 0; i < 100; i++) {
                s = lib.string.randomString();
                expect(s.length).to.equal(10);

                for(n = 0; n < s.length; s++) {
                    expect(possible.indexOf(s[n])).to.be.greaterThan(-1);
                }
            }
        });

        it('It should return an empty string if length < 0 or length === 0', function () {
            var i, s;

            for(i = 0; i < 100; i++) {
                s = lib.string.randomString(-1);
                expect(s.length).to.equal(0);
                expect(s).to.equal('');

                s = lib.string.randomString(0);
                expect(s.length).to.equal(0);
                expect(s).to.equal('');
            }
        });
    });
}());
