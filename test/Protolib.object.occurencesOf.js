(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }


    describe('Protolib.object.occurencesOf', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the expected number of occurences in strings', function () {
            expect('hello world'._.occurencesOf('h')).to.equal(1);
            expect('hello world'._.occurencesOf('l')).to.equal(3);
            expect('hello world'._.occurencesOf()).to.equal(0);
            expect('hello world'._.occurencesOf(undefined)).to.equal(0);
            expect('hello world'._.occurencesOf('hello')).to.equal(1);
            expect('hello world'._.occurencesOf('zzz')).to.equal(0);
            expect('hello world'._.occurencesOf(' ')).to.equal(1);
            expect(' hello world '._.occurencesOf(' hello world ')).to.equal(1);
            expect(' hello world '._.occurencesOf(' ')).to.equal(3);

            expect('hello world'._.occurencesOf(function () {})).to.equal(0);
            expect('hello world'._.occurencesOf({})).to.equal(0);
            expect('hello world'._.occurencesOf([])).to.equal(0);
        });

        it('It should return the expected number of occurences in arrays', function () {
            var obj  = { foo: 'bar' },
                data = [1, 2, 3, 4, 6, 7, 7, 'a', 'b', null, undefined, {}, function () {}, obj, obj, [], undefined];

            expect(data._.occurencesOf('a')).to.equal(1);
            expect(data._.occurencesOf('b')).to.equal(1);
            expect(data._.occurencesOf(1)).to.equal(1);
            expect(data._.occurencesOf(7)).to.equal(2);
            expect(data._.occurencesOf(null)).to.equal(1);
            expect(data._.occurencesOf(undefined)).to.equal(2);
            expect(data._.occurencesOf(obj)).to.equal(2);
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

            expect(data._.occurencesOf('a')).to.equal(1);
            expect(data._.occurencesOf('b')).to.equal(1);
            expect(data._.occurencesOf(1)).to.equal(1);
            expect(data._.occurencesOf(7)).to.equal(2);
            expect(data._.occurencesOf(null)).to.equal(1);
            expect(data._.occurencesOf(undefined)).to.equal(2);
            expect(data._.occurencesOf(obj)).to.equal(2);
        });

        it('It should treat numbers like strings', function () {
            expect((1234)._.occurencesOf(1)).to.equal(1);
            expect((1234)._.occurencesOf(2)).to.equal(1);
            expect((1234)._.occurencesOf(3)).to.equal(1);
            expect((1234)._.occurencesOf(4)).to.equal(1);

            expect((11234)._.occurencesOf(1)).to.equal(2);
            expect((12234)._.occurencesOf(2)).to.equal(2);
            expect((1233334)._.occurencesOf(3)).to.equal(4);
            expect((12344444)._.occurencesOf(4)).to.equal(5);

            expect((5679)._.occurencesOf('5')).to.equal(1);
            expect((5679)._.occurencesOf('6')).to.equal(1);
            expect((5679)._.occurencesOf('7')).to.equal(1);
            expect((5679)._.occurencesOf('9')).to.equal(1);

            expect((5679)._.occurencesOf('5')).to.equal(1);
            expect((55679)._.occurencesOf('5')).to.equal(2);
            expect((555679)._.occurencesOf('5')).to.equal(3);
            expect((5555679)._.occurencesOf('5')).to.equal(4);

            expect((-5679)._.occurencesOf('-5')).to.equal(1);
            expect((-55679)._.occurencesOf('-5')).to.equal(1);
            expect((-555679)._.occurencesOf('-5')).to.equal(1);
            expect((-5555679)._.occurencesOf('-5')).to.equal(1);

            expect((-5679)._.occurencesOf('-')).to.equal(1);
            expect((-55679)._.occurencesOf('-')).to.equal(1);
            expect((-555679)._.occurencesOf('-')).to.equal(1);
            expect((-5555679)._.occurencesOf('-')).to.equal(1);
        });
    });
}());
