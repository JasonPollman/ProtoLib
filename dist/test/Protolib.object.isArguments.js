(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isArguments', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are arguments objects', function () {
            var args = arguments;

            expect(lib.object.isArguments(arguments)).to.equal(true);
            expect(lib.object.isArguments(arguments, arguments)).to.equal(true);
            expect(lib.object.isArguments(arguments, arguments, arguments)).to.equal(true);
            expect(lib.object.isArguments(arguments, arguments, arguments, arguments)).to.equal(true);
            expect(lib.object.isArguments(arguments, arguments, arguments, args, args)).to.equal(true);
            expect(lib.object.isArguments()).to.equal(true);

            expect(lib.object.isArguments(5)).to.equal(false);
            expect(lib.object.isArguments('')).to.equal(false);
            expect(lib.object.isArguments('string')).to.equal(false);
            expect(lib.object.isArguments(function () {})).to.equal(false);
            expect(lib.object.isArguments({})).to.equal(false);

            expect(lib.object.isArguments(arguments, 5)).to.equal(false);
            expect(lib.object.isArguments(arguments, '')).to.equal(false);
            expect(lib.object.isArguments(arguments, 'string')).to.equal(false);
            expect(lib.object.isArguments(arguments, function () {})).to.equal(false);
            expect(lib.object.isArguments(arguments, {})).to.equal(false);

            expect(lib.object.isArguments(arguments, arguments, 5)).to.equal(false);
            expect(lib.object.isArguments(arguments, arguments, '')).to.equal(false);
            expect(lib.object.isArguments(arguments, arguments, 'string')).to.equal(false);
            expect(lib.object.isArguments(arguments, arguments, function () {})).to.equal(false);
            expect(lib.object.isArguments(arguments, arguments, {})).to.equal(false);

            expect(lib.object.isArguments(arguments, null, 5, null)).to.equal(false);
            expect(lib.object.isArguments(arguments, null, '', null)).to.equal(false);
            expect(lib.object.isArguments(arguments, null, 'string', null)).to.equal(false);
            expect(lib.object.isArguments(arguments, null, function () {}, null)).to.equal(false);
            expect(lib.object.isArguments(null, null, {}, null)).to.equal(false);

            expect(lib.object.isArguments(undefined)).to.equal(false);
            expect(lib.object.isArguments(undefined, null)).to.equal(false);
            expect(lib.object.isArguments(arguments, undefined)).to.equal(false);

            expect((5)._.isArguments()).to.equal(false);
            expect(('string')._.isArguments()).to.equal(false);
            expect(({})._.isArguments()).to.equal(false);
            expect(([])._.isArguments()).to.equal(false);
            expect(arguments._.isArguments()).to.equal(true);
        });
    });

}());
