(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isArray', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are arrays', function () {
            expect(lib.object.isArray([])).to.equal(true);
            expect(lib.object.isArray([], [])).to.equal(true);
            expect(lib.object.isArray([], [], [])).to.equal(true);
            expect(lib.object.isArray([], [], [], [])).to.equal(true);
            expect(lib.object.isArray([], [1], [1,2,3], ['a', 1, []])).to.equal(true);
            expect(lib.object.isArray()).to.equal(true);

            expect(lib.object.isArray(5)).to.equal(false);
            expect(lib.object.isArray('')).to.equal(false);
            expect(lib.object.isArray('string')).to.equal(false);
            expect(lib.object.isArray(function () {})).to.equal(false);
            expect(lib.object.isArray({})).to.equal(false);

            expect(lib.object.isArray([], 5)).to.equal(false);
            expect(lib.object.isArray([], '')).to.equal(false);
            expect(lib.object.isArray([], 'string')).to.equal(false);
            expect(lib.object.isArray([], function () {})).to.equal(false);
            expect(lib.object.isArray([], {})).to.equal(false);

            expect(lib.object.isArray([], [], 5)).to.equal(false);
            expect(lib.object.isArray([], [], '')).to.equal(false);
            expect(lib.object.isArray([], [], 'string')).to.equal(false);
            expect(lib.object.isArray([], [], function () {})).to.equal(false);
            expect(lib.object.isArray([], [], {})).to.equal(false);

            expect(lib.object.isArray([], [], 5, true)).to.equal(false);
            expect(lib.object.isArray([], [], '', [])).to.equal(false);
            expect(lib.object.isArray([], [], 'string', true)).to.equal(false);
            expect(lib.object.isArray([], [], function () {}, true)).to.equal(false);
            expect(lib.object.isArray([], [], {}, true)).to.equal(false);

            expect((5)._.isArray()).to.equal(false);
            expect(('string')._.isArray()).to.equal(false);
            expect(({})._.isArray()).to.equal(false);
            expect(([])._.isArray()).to.equal(true);
            expect(true._.isArray()).to.equal(false);
            expect(false._.isArray()).to.equal(false);
        });
    });

}());
