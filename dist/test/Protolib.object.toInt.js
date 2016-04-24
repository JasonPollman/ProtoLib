(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.toInt', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should parse strings and numbers as floats', function () {
            expect('x'._.toInt()).to.be.NaN;
            expect('123'._.toInt()).to.equal(123);
            expect('123.1478'._.toInt()).to.equal(123);
            expect((123.1478)._.toInt()).to.equal(123);
            expect('-123'._.toInt()).to.equal(-123);

            // Parse int doesn't like e notation
            expect('1e3'._.toInt()).to.equal(1);
            expect('2e3'._.toInt()).to.equal(2);
            expect('1.000256e3'._.toInt()).to.equal(1);

            expect(new String('123')._.toInt()).to.equal(123);

            expect('0x64'._.toInt()).to.equal(100);
            expect('0xFF'._.toInt()).to.equal(255);
        });

        it('It should return NaN for objects', function () {
            expect({}._.toInt()).to.be.NaN;
            expect([]._.toInt()).to.be.NaN;
            expect(function () {}._.toInt()).to.be.NaN;
        });

        it('It should return an array for all arguments', function () {
            expect(lib.object.toInt(1, 'a', '123')).to.eql([1, NaN, 123]);
            expect(lib.object.toInt()).to.eql([]);
            expect(lib.object.toInt(1, 'a', '123', '435.123', '1.0000e4')).to.eql([1, NaN, 123, 435, 1]);
        });
    });

}());
