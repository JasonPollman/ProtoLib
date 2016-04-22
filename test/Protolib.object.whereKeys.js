(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.whereKeys', function () {

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
            expect('hello world'._.whereKeys(function (k, i) {
                return i === 'l';
            })).to.equal('lll');

            expect('hello world'._.whereKeys(function (k) {
                return k > 1;
            })).to.equal('llo world');

            expect('hello world'._.whereKeys(function (k, i) {
                return k > 1 && i !== 'l';
            })).to.equal('o word');

            expect('hello world'._.whereKeys(function (k, i) {
                return i !== 'l';
            })).to.equal('heo word');

            expect(''._.whereKeys(function () {
                return true;
            })).to.equal('');

            expect('xxxxxxxx'._.whereKeys(function () {
                return false;
            })).to.equal('');
        });

        it('It should will evaluate each item against the predicate using == if anything except a function is passed as the predicate', function () {
            expect('hello world'._.whereKeys(null)).to.equal('');
            expect('hello world'._.whereKeys(undefined)).to.equal('');
            expect('hello world'._.whereKeys(1)).to.equal('e');
            expect('hello world'._.whereKeys('')).to.equal('');
            expect('hello world'._.whereKeys(true)).to.equal('e');
            expect('hello world'._.whereKeys(false)).to.equal('h');
            expect((123456)._.whereKeys(null)).to.equal('');
            expect((123456)._.whereKeys(undefined)).to.equal('');
            expect((123456)._.whereKeys(1)).to.equal('2');
            expect((123456)._.whereKeys('')).to.equal('');
            expect((123456)._.whereKeys(true)).to.equal('2');
            expect((123456000)._.whereKeys(false)).to.equal('1');
            expect([1,2,3,4]._.whereKeys(true)).to.eql([2]);
            expect([1,2,3,4]._.whereKeys(false)).to.eql([1]);
            expect([1,2,3,4,0,false]._.whereKeys(false)).to.eql([1]);
        });

        it('It should filter numbers (like strings) using a predicate function', function () {
            expect((1234561)._.whereKeys(function (k, i) {
                return i === 1;
            })).to.equal('11');

            expect((-1234561)._.whereKeys(function (k, i) {
                return isNaN(parseInt(i));
            })).to.equal('-');

            expect((-1234561000)._.whereKeys(function (k, i) {
                return i > 0;
            })).to.equal('1234561');

            expect((-1234561000)._.whereKeys(function () {
                return false;
            })).to.equal('');
        });

        it('It should filter arrays using a predicate function', function () {
            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.whereKeys(function (k, i) {
                return typeof i === 'number';
            })).to.eql([1, 2, 3, 4]);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.whereKeys(function (k, i) {
                return typeof i === 'string';
            })).to.eql(['a', 'b']);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.whereKeys(function (k, i) {
                return typeof i === 'object';
            })).to.eql([[], [], {}, {}]);

            expect([1, 2, 3, 4, 'a', 'b', [], [], {}, {}]._.whereKeys(function () {
                return false;
            })).to.eql([]);
        });

        it('It should filter objects using a predicate function', function () {
            expect({ foo: 'bar', '1': 7 }._.whereKeys(function (k, i) {
                return i === 'bar';
            })).to.eql({ foo: 'bar' });

            expect({ foo: 'bar', '1': 7 }._.whereKeys(function () {
                return true;
            })).to.eql({ foo: 'bar', '1': 7 });

            expect({ foo: 'bar', '1': 7 }._.whereKeys(function () {
                return false;
            })).to.eql({});
        });
    });

}());
