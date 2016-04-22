(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isUndefined', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are undefined', function () {
            expect(lib.object.isUndefined(undefined)).to.equal(true);
            expect(lib.object.isUndefined(undefined, undefined)).to.equal(true);
            expect(lib.object.isUndefined(undefined, undefined, undefined)).to.equal(true);
            expect(lib.object.isUndefined(undefined, undefined, undefined, undefined)).to.equal(true);
            expect(lib.object.isUndefined(undefined, undefined, undefined, undefined)).to.equal(true);
            expect(lib.object.isUndefined()).to.equal(true);

            expect(lib.object.isUndefined(5)).to.equal(false);
            expect(lib.object.isUndefined('')).to.equal(false);
            expect(lib.object.isUndefined('string')).to.equal(false);
            expect(lib.object.isUndefined(function () {})).to.equal(false);
            expect(lib.object.isUndefined({})).to.equal(false);

            expect(lib.object.isUndefined(undefined, 5)).to.equal(false);
            expect(lib.object.isUndefined(undefined, '')).to.equal(false);
            expect(lib.object.isUndefined(undefined, 'string')).to.equal(false);
            expect(lib.object.isUndefined(undefined, function () {})).to.equal(false);
            expect(lib.object.isUndefined(undefined, {})).to.equal(false);

            expect(lib.object.isUndefined(undefined, undefined, 5)).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, '')).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, 'string')).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, function () {})).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, {})).to.equal(false);

            expect(lib.object.isUndefined(undefined, undefined, 5, undefined)).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, '', undefined)).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, 'string', undefined)).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, function () {}, undefined)).to.equal(false);
            expect(lib.object.isUndefined(undefined, undefined, {}, undefined)).to.equal(false);

            expect(lib.object.isUndefined(null)).to.equal(false);
            expect(lib.object.isUndefined(null, undefined)).to.equal(false);
            expect(lib.object.isUndefined(undefined, null)).to.equal(false);

            expect((5)._.isUndefined()).to.equal(false);
            expect(('string')._.isUndefined()).to.equal(false);
            expect(({})._.isUndefined()).to.equal(false);
            expect(([])._.isUndefined()).to.equal(false);
        });
    });

}());
