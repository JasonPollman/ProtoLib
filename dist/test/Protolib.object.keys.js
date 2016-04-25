(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.keys', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the correct key set for a string', function () {
            expect(('hello')._.keys()).to.eql(['0', '1', '2', '3', '4']);
            expect(('')._.keys()).to.eql([]);
            expect(('   ')._.keys()).to.eql(['0', '1', '2']);
        });

        it('It should return [] for booleans', function () {
            expect((true)._.keys()).to.eql([]);
            expect((false)._.keys()).to.eql([]);
        });

        it('It should return the correct key set for an array', function () {
            expect(([1, 2, 3, 4, 5])._.keys()).to.eql(['0', '1', '2', '3', '4']);
            expect(([1, 'a', {}, [], function () {}])._.keys()).to.eql(['0', '1', '2', '3', '4']);
            expect(([])._.keys()).to.eql([]);
            expect(([' '])._.keys()).to.eql(['0']);
        });

        it('It should return the correct key set for an object', function () {
            expect({}._.keys()).to.eql([]);
            expect({ foo: 'bar' }._.keys()).to.eql(['foo']);
            expect({ foo: 'bar', '1': 4 }._.keys()).to.eql(['1', 'foo']);
            expect({ foo: 'bar', bar: 'baz' }._.keys()).to.eql(['foo', 'bar']);
        });

        it('It should return an empty array for numbers and functions', function () {
            expect((1234)._.keys()).to.eql([]);
            expect((-1234)._.keys()).to.eql([]);
            expect((0)._.keys()).to.eql([]);
            expect(function () {}._.keys()).to.eql([]);
        });

        it('It should return the correct key set for an arguments object', function () {
            expect(arguments._.keys()).to.eql([]);
            (function () {
                expect(arguments._.keys()).to.eql(['0', '1', '2']);
            }(1, 2, 3));
        });
    });
}());
