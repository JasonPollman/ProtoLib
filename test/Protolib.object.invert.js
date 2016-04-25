(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.invert', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should reverse strings', function () {
            expect('hello world'._.invert()).to.equal('dlrow olleh');
            expect(''._.invert()).to.equal('');
            expect('h'._.invert()).to.equal('h');
            expect('123'._.invert()).to.equal('321');
        });

        it('It should invert booleans', function () {
            expect(true._.invert()).to.equal(false);
            expect(false._.invert()).to.equal(true);
        });

        it('It should compute the inverse of a number', function () {
            expect((1)._.invert()).to.equal(1);
            expect((0)._.invert()).to.equal(Infinity);
            expect((2)._.invert()).to.equal(0.5);
            expect((100)._.invert()).to.equal(0.01);
            expect((-100)._.invert()).to.equal(-0.01);
            expect((0x64)._.invert()).to.equal(0.01);
        });

        it('It should invert the keys/values of an object', function () {
            expect(([ 9, 8, 7])._.invert()).to.eql({ 7: '2', 8: '1', 9: '0' });
            expect(([])._.invert()).to.eql({});
            expect(({})._.invert()).to.eql({});
            expect(({ foo: 1, bar: 2 })._.invert()).to.eql({ 1: 'foo', 2: 'bar' });
            expect(({ foo: 'foo', bar: 'bar' })._.invert()).to.eql({ foo: 'foo', bar: 'bar' });
            expect(({ foo: 'fooA', barB: 'bar' })._.invert()).to.eql({ fooA: 'foo', bar: 'barB' });
        });

        it('It should return a function that inverts the result of the given function', function () {
            var f = function () { return true; };
            var finverse = f._.invert();
            expect(finverse).to.be.a('function');
            expect(finverse()).to.equal(false);

            f = function () { return 5; };
            finverse = f._.invert();
            expect(finverse).to.be.a('function');
            expect(finverse()).to.equal(0.2);

            f = function () { return 0; };
            finverse = f._.invert();
            expect(finverse).to.be.a('function');
            expect(finverse()).to.equal(Infinity);

            f = function () { return 'abc'; };
            finverse = f._.invert();
            expect(finverse).to.be.a('function');
            expect(finverse()).to.equal('cba');

            f = function () { return function () { return false; }; };
            finverse = f._.invert();
            expect(finverse).to.be.a('function');
            expect(finverse()).to.be.a('function');
            expect(finverse()()).to.equal(true);
        });
    });

}());
