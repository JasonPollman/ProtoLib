(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isString', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are strings', function () {
            expect(lib.object.isString()).to.equal(true);
            expect(lib.object.isString('string')).to.equal(true);
            expect(lib.object.isString('string', 'string')).to.equal(true);
            expect(lib.object.isString('string', 'string', 'string')).to.equal(true);
            expect(lib.object.isString('string', 'string', 'string', 'string')).to.equal(true);
            expect(lib.object.isString('string', [1], [1,2,3], ['a', 1, 'string'])).to.equal(false);
            expect(lib.object.isString()).to.equal(true);

            expect(lib.object.isString(5)).to.equal(false);
            expect(lib.object.isString('')).to.equal(true);
            expect(lib.object.isString(function () {})).to.equal(false);
            expect(lib.object.isString('string')).to.equal(true);
            expect(lib.object.isString({})).to.equal(false);

            expect(lib.object.isString('string', 5)).to.equal(false);
            expect(lib.object.isString(function () {}, '')).to.equal(false);
            expect(lib.object.isString(function () {}, 'string')).to.equal(false);
            expect(lib.object.isString('string', 'string')).to.equal(true);
            expect(lib.object.isString('string', {})).to.equal(false);

            expect(lib.object.isString('string', 'string', 5)).to.equal(false);
            expect(lib.object.isString(function () {}, 'string', '')).to.equal(false);
            expect(lib.object.isString([], 'string', 'string')).to.equal(false);
            expect(lib.object.isString('string', 'string', 'string')).to.equal(true);
            expect(lib.object.isString('string', 'string', {})).to.equal(false);

            expect(lib.object.isString('string', 'string', 5, true)).to.equal(false);
            expect(lib.object.isString('string', [], '', 'string')).to.equal(false);
            expect(lib.object.isString('string', 'string', 'string', true)).to.equal(false);
            expect(lib.object.isString('string', 'string', 'string', true)).to.equal(false);
            expect(lib.object.isString('string', 'string', {}, true)).to.equal(false);

            expect((5)._.isString()).to.equal(false);
            expect(('string')._.isString()).to.equal(true);
            expect(({})._.isString()).to.equal(false);
            expect(([])._.isString()).to.equal(false);
            expect((function () {})._.isString()).to.equal(false);
            expect(true._.isString()).to.equal(false);
            expect(false._.isString()).to.equal(false);
        });
    });

}());
