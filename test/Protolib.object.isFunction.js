(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isFunction', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are functions', function () {
            expect(lib.object.isFunction(function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, function () {}, function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, function () {}, function () {}, function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, [1], [1,2,3], ['a', 1, function () {}])).to.equal(false);
            expect(lib.object.isFunction()).to.equal(true);

            expect(lib.object.isFunction(5)).to.equal(false);
            expect(lib.object.isFunction('')).to.equal(false);
            expect(lib.object.isFunction('string')).to.equal(false);
            expect(lib.object.isFunction(function () {})).to.equal(true);
            expect(lib.object.isFunction({})).to.equal(false);

            expect(lib.object.isFunction(function () {}, 5)).to.equal(false);
            expect(lib.object.isFunction(function () {}, '')).to.equal(false);
            expect(lib.object.isFunction(function () {}, 'string')).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, {})).to.equal(false);

            expect(lib.object.isFunction(function () {}, function () {}, 5)).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, '')).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, 'string')).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, function () {})).to.equal(true);
            expect(lib.object.isFunction(function () {}, function () {}, {})).to.equal(false);

            expect(lib.object.isFunction(function () {}, function () {}, 5, true)).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, '', function () {})).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, 'string', true)).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, function () {}, true)).to.equal(false);
            expect(lib.object.isFunction(function () {}, function () {}, {}, true)).to.equal(false);

            expect((5)._.isFunction()).to.equal(false);
            expect(('string')._.isFunction()).to.equal(false);
            expect(({})._.isFunction()).to.equal(false);
            expect((function () {})._.isFunction()).to.equal(true);
            expect(true._.isFunction()).to.equal(false);
            expect(false._.isFunction()).to.equal(false);
        });
    });

}());
