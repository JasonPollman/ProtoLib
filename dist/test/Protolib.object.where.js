(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.where', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should filter strings using a predicate function', function () {
            expect('hello world'._.where(function (i) {
                return i === 'l';
            })).to.equal('lll');

            expect('hello world'._.where(function (i, k) {
                return k > 1;
            })).to.equal('llo world');

            expect('hello world'._.where(function (i, k) {
                return k > 1 && i !== 'l';
            })).to.equal('o word');

            expect('hello world'._.where(function (i) {
                return i !== 'l';
            })).to.equal('heo word');

            expect(''._.where(function () {
                return true;
            })).to.equal('');

            expect('xxxxxxxx'._.where(function () {
                return false;
            })).to.equal('');
        });

        it('It should will evaluate each item against the predicate using == if anything except a function is passed as the predicate', function () {
            expect('hello world'._.where(null)).to.equal('');
            expect('hello world'._.where(undefined)).to.equal('');
            expect('hello world'._.where(1)).to.equal('');
            expect('hello world'._.where('')).to.equal('');
            expect('hello world'._.where(true)).to.equal('');
            expect('hello world'._.where(false)).to.equal(' ');
            expect((123456)._.where(null)).to.equal('');
            expect((123456)._.where(undefined)).to.equal('');
            expect((123456)._.where(1)).to.equal('1');
            expect((123456)._.where('')).to.equal('');
            expect((123456)._.where(true)).to.equal('1');
            expect((123456000)._.where(false)).to.equal('000');
            expect([1,2,3,4]._.where(true)).to.eql([1]);
            expect([1,2,3,4]._.where(false)).to.eql([]);
            expect([1,2,3,4,0,false]._.where(false)).to.eql([0, false]);
        });

        it('It should filter numbers (like strings) using a predicate function', function () {
            expect((1234561)._.where(function (i) {
                return i === 1;
            })).to.equal('11');

            expect((-1234561)._.where(function (i) {
                return isNaN(parseInt(i));
            })).to.equal('-');

            expect((-1234561000)._.where(function (i) {
                return i > 0;
            })).to.equal('1234561');

            expect((-1234561000)._.where(function () {
                return false;
            })).to.equal('');
        });

        it('It should filter arrays using a predicate function', function () {
            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.where(function (i) {
                return typeof i === 'number';
            })).to.eql([1, 2, 3, 4]);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.where(function (i) {
                return typeof i === 'string';
            })).to.eql(['a', 'b']);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.where(function (i) {
                return typeof i === 'object';
            })).to.eql([[], [], {}, {}]);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.where(function () {
                return false;
            })).to.eql([]);
        });

        it('It should filter objects using a predicate function', function () {
            expect({ foo: 'bar', '1': 7 }._.where(function (i) {
                return i === 'bar';
            })).to.eql({ foo: 'bar' });

            expect({ foo: 'bar', '1': 7 }._.where(function () {
                return true;
            })).to.eql({ foo: 'bar', '1': 7 });

            expect({ foo: 'bar', '1': 7 }._.where(function () {
                return false;
            })).to.eql({});

            var foo, bar;
            foo = [1, 2, 3, 4];

            bar = foo._.where(item => item > 2);
            expect(bar).to.eql([3, 4]);

            bar = foo._.where(() => true);
            expect(bar).to.eql([1, 2, 3, 4]);

            foo = {
                a: [1, 2, 3],
                b: 'a string',
                c: function () {},
                d: null,
                e: { z: 9, y: 8 }
            };

            bar = foo._.where((item, key) => key === 'a');      // bar = { a: [1, 2, 3] }
            expect(bar).to.eql({ a: [1, 2, 3] });

            bar = foo._.where(function (item, key) {            // bar = { b: 'a string' }
                return typeof item !== 'object' && key !== 'c';
            });
            expect(bar).to.eql({ b: 'a string' });

            bar = lib.object.where(null, function () {
                return false;
            });
            expect(bar).to.equal(null);

            bar = lib.object.where(5, function () {
                return false;
            });
            expect(bar).to.equal('');
        });
    });

}());
