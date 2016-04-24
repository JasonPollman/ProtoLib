(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.histogram', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a histogram of characters for strings', function () {
            expect('hello world'._.histogram()).to.eql({ h: 1, e: 1, l: 3, o: 2, ' ': 1, w: 1, r: 1, d: 1 });
            expect(''._.histogram()).to.eql({});
            expect('       '._.histogram()).to.eql({ ' ': 7 });
            expect('aaaaa'._.histogram()).to.eql({ a: 5 });
            expect('!@#$%^&*()_+'._.histogram()).to.eql({ '!': 1, '@': 1, '#': 1,'$': 1, '%': 1, '^': 1, '&': 1, '*': 1, '(': 1, ')': 1, '_': 1, '+': 1 });
            expect('function'._.histogram()).to.eql({ f: 1, u: 1, n: 2, c: 1, t: 1, i: 1, o: 1 });
        });

        it('It should return a histogram of an array\'s members', function () {
            expect([1, 2, 3, 4, 5]._.histogram()).to.eql({ '1': 1, '2': 1, '3': 1, '4': 1, '5': 1 });
            expect([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]._.histogram()).to.eql({ '1': 2, '2': 2, '3': 2, '4': 2, '5': 2 });
            expect([7, 1, 7, 2, 7, 3, 7, 4, 7, 5, 7, 1, 7, 2, 7, 3, 7, 4, 7, 5]._.histogram()).to.eql({ '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '7': 10 });

            expect([1, 'a', 2, 'b', 3, 'c', 'c']._.histogram()).to.eql({ '1': 1, '2': 1, '3': 1, a: 1, b: 1, c: 2});
            expect([function () {}, function () {}]._.histogram()).to.eql({ 'function': 2 });
            expect([null, function () {}, null, function () {}, null]._.histogram()).to.eql({ 'function': 2, 'null': 3 });
            expect([undefined, null, undefined, function () {}, undefined, null, undefined, function () {}, null]._.histogram()).to.eql({ 'function': 2, 'null': 3, 'undefined': 4 });
            expect([null, function () {}, null, function () {}, null]._.histogram()).to.eql({ 'function': 2, 'null': 3 });
            expect([{}, {}, {}, [], []]._.histogram()).to.eql({ 'object': 3, 'array': 2 });

            var obj = {}, arr = [];
            expect([obj, obj, {}, [], arr]._.histogram()).to.eql({ 'object': 3, 'array': 2 });
        });

        it('It should return a histogram of an objects\'s members', function () {
            expect({ a: 1, b: 1, c: 1, d: 2 }._.histogram()).to.eql({ 1: 3, 2: 1 });
            expect({ a: 1, b: 1, c: 1, d: 2, e: null }._.histogram()).to.eql({ 1: 3, 2: 1, 'null': 1 });
            expect({ a: 1, b: 1, c: 1, d: 2, e: null, f: undefined }._.histogram()).to.eql({ 1: 3, 2: 1, 'null': 1, 'undefined': 1 });
            expect({ a: 1, b: 1, c: 1, d: 2, e: null, f: undefined, function () {} }._.histogram()).to.eql({ 1: 3, 2: 1, 'null': 1, 'undefined': 1, 'function': 1 });
            expect({ a: 'foo', b: 'foo', c: 'foo', d: 'foo', e: 'foo' }._.histogram()).to.eql({ 'foo': 5 });
        });

        it('It should treat numbers and functions like strings', function () {
            expect((1234)._.histogram()).to.eql({ 1: 1, 2: 1, 3: 1, 4: 1 });
            expect((-1234)._.histogram()).to.eql({ 1: 1, 2: 1, 3: 1, 4: 1, '-': 1 });
            expect(function () {}._.histogram()).to.eql({ f: 1, u: 1, n: 2, c: 1, t: 1, i: 1, o: 1, '(': 1, ')': 1, '{': 1, '}': 1, ' ': 2 });
        });
    });

}());
