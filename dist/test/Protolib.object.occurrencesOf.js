(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }


    describe('Protolib.object.occurrencesOf', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the expected number of occurences in strings', function () {
            expect('hello world'._.occurrencesOf('h')).to.equal(1);
            expect('hello world'._.occurrencesOf('l')).to.equal(3);
            expect('hello world'._.occurrencesOf()).to.equal(0);
            expect('hello world'._.occurrencesOf(undefined)).to.equal(0);
            expect('hello world'._.occurrencesOf('hello')).to.equal(1);
            expect('hello world'._.occurrencesOf('zzz')).to.equal(0);
            expect('hello world'._.occurrencesOf(' ')).to.equal(1);
            expect(' hello world '._.occurrencesOf(' hello world ')).to.equal(1);
            expect(' hello world '._.occurrencesOf(' ')).to.equal(3);

            expect('hello world'._.occurrencesOf(function () {})).to.equal(0);
            expect('hello world'._.occurrencesOf({})).to.equal(0);
            expect('hello world'._.occurrencesOf([])).to.equal(0);
        });

        it('It should return the expected number of occurences in arrays', function () {
            var obj  = { foo: 'bar' },
                data = [1, 2, 3, 4, 6, 7, 7, 'a', 'b', null, undefined, {}, function () {}, obj, obj, [], undefined];

            expect(data._.occurrencesOf('a')).to.equal(1);
            expect(data._.occurrencesOf('b')).to.equal(1);
            expect(data._.occurrencesOf(1)).to.equal(1);
            expect(data._.occurrencesOf(7)).to.equal(2);
            expect(data._.occurrencesOf(null)).to.equal(1);
            expect(data._.occurrencesOf(undefined)).to.equal(2);
            expect(data._.occurrencesOf(obj)).to.equal(2);
        });

        it('It should return 0 for booleans', function () {
            expect(true._.occurrencesOf('a')).to.equal(0);
            expect(true._.occurrencesOf(undefined)).to.equal(0);
            expect(true._.occurrencesOf(null)).to.equal(0);
            expect(true._.occurrencesOf(0)).to.equal(0);
            expect(true._.occurrencesOf('t')).to.equal(0);

            expect(false._.occurrencesOf('a')).to.equal(0);
            expect(false._.occurrencesOf(undefined)).to.equal(0);
            expect(false._.occurrencesOf(null)).to.equal(0);
            expect(false._.occurrencesOf(0)).to.equal(0);
            expect(false._.occurrencesOf('t')).to.equal(0);
        });

        it('It should return the expected number of occurences in objects', function () {
            var obj  = { foo: 'bar' },
                data = {
                    a: 'a',
                    b: 'b',
                    c: 1,
                    d: 7,
                    e: 7,
                    f: 5,
                    g: null,
                    h: undefined,
                    i: undefined,
                    j: obj,
                    k: 234,
                    l: obj
                };

            expect(data._.occurrencesOf('a')).to.equal(1);
            expect(data._.occurrencesOf('b')).to.equal(1);
            expect(data._.occurrencesOf(1)).to.equal(1);
            expect(data._.occurrencesOf(7)).to.equal(2);
            expect(data._.occurrencesOf(null)).to.equal(1);
            expect(data._.occurrencesOf(undefined)).to.equal(2);
            expect(data._.occurrencesOf(obj)).to.equal(2);
        });

        it('It should treat numbers like strings', function () {
            expect((1234)._.occurrencesOf(1)).to.equal(1);
            expect((1234)._.occurrencesOf(2)).to.equal(1);
            expect((1234)._.occurrencesOf(3)).to.equal(1);
            expect((1234)._.occurrencesOf(4)).to.equal(1);

            expect((11234)._.occurrencesOf(1)).to.equal(2);
            expect((12234)._.occurrencesOf(2)).to.equal(2);
            expect((1233334)._.occurrencesOf(3)).to.equal(4);
            expect((12344444)._.occurrencesOf(4)).to.equal(5);

            expect([1, 1, 1, 1, 3]._.occurrencesOf(1)).to.equal(4);
            expect([1, 1, 1, 1, 3]._.occurrencesOf('1')).to.equal(0);
            expect('racecar'._.occurrencesOf('r')).to.equal(2);

            expect((5679)._.occurrencesOf('5')).to.equal(1);
            expect((5679)._.occurrencesOf('6')).to.equal(1);
            expect((5679)._.occurrencesOf('7')).to.equal(1);
            expect((5679)._.occurrencesOf('9')).to.equal(1);

            expect((5679)._.occurrencesOf('5')).to.equal(1);
            expect((55679)._.occurrencesOf('5')).to.equal(2);
            expect((555679)._.occurrencesOf('5')).to.equal(3);
            expect((5555679)._.occurrencesOf('5')).to.equal(4);

            expect((-5679)._.occurrencesOf('-5')).to.equal(1);
            expect((-55679)._.occurrencesOf('-5')).to.equal(1);
            expect((-555679)._.occurrencesOf('-5')).to.equal(1);
            expect((-5555679)._.occurrencesOf('-5')).to.equal(1);

            expect((-5679)._.occurrencesOf('-')).to.equal(1);
            expect((-55679)._.occurrencesOf('-')).to.equal(1);
            expect((-555679)._.occurrencesOf('-')).to.equal(1);
            expect((-5555679)._.occurrencesOf('-')).to.equal(1);
        });
    });
}());
