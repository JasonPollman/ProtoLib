(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.toNumber', function () {

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
            expect('x'._.toNumber()).to.be.NaN;
            expect('123'._.toNumber()).to.equal(123);
            expect('123.1478'._.toNumber()).to.equal(123.1478);
            expect((123.1478)._.toNumber()).to.equal(123.1478);
            expect('-123'._.toNumber()).to.equal(-123);
            expect('1e3'._.toNumber()).to.equal(1000);
            expect('1.000256e3'._.toNumber()).to.equal(1000.256);
            expect(new String('123')._.toNumber()).to.equal(123);

            // Parsing hex string to float always returns 0.
            expect('0x64'._.toNumber()).to.equal(0);
            expect('0xFF'._.toNumber()).to.equal(0);
        });

        it('It should return NaN for objects', function () {
            expect({}._.toNumber()).to.be.NaN;
            expect([]._.toNumber()).to.be.NaN;
            expect(function () {}._.toNumber()).to.be.NaN;
        });

        it('It should return an array for all arguments', function () {
            expect(lib.object.toNumber(1, 'a', '123')).to.eql([1, NaN, 123]);
            expect(lib.object.toNumber()).to.eql([]);
            expect(lib.object.toNumber(1, 'a', '123', '435.123', '1e4')).to.eql([1, NaN, 123, 435.123, 10000]);
        });
    });

}());
