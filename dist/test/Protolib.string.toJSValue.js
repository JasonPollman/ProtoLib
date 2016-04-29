(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.toJSValue', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should convert "true" to true', function () {
            expect('true'._.toJSValue()).to.equal(true);
            expect(' true'._.toJSValue()).to.equal(true);
            expect('true '._.toJSValue()).to.equal(true);
            expect('  true  '._.toJSValue()).to.equal(true);
            expect('  True  '._.toJSValue()).to.equal('  True  ');
            expect('True'._.toJSValue()).to.equal('True');
        });

        it('It should convert "false" to false', function () {
            expect('false'._.toJSValue()).to.equal(false);
            expect(' false'._.toJSValue()).to.equal(false);
            expect('false '._.toJSValue()).to.equal(false);
            expect('  false  '._.toJSValue()).to.equal(false);
            expect('  False  '._.toJSValue()).to.equal('  False  ');
            expect('False'._.toJSValue()).to.equal('False');
        });

        it('It should convert "null" to null', function () {
            expect('null'._.toJSValue()).to.equal(null);
            expect(' null'._.toJSValue()).to.equal(null);
            expect('null '._.toJSValue()).to.equal(null);
            expect('  null  '._.toJSValue()).to.equal(null);
            expect('  Null  '._.toJSValue()).to.equal('  Null  ');
            expect('Null'._.toJSValue()).to.equal('Null');
        });

        it('It should convert "undefined" to undefined', function () {
            expect('undefined'._.toJSValue()).to.equal(undefined);
            expect(' undefined'._.toJSValue()).to.equal(undefined);
            expect('undefined '._.toJSValue()).to.equal(undefined);
            expect('  undefined  '._.toJSValue()).to.equal(undefined);
            expect('  Undefined  '._.toJSValue()).to.equal('  Undefined  ');
            expect('Undefined'._.toJSValue()).to.equal('Undefined');
        });

        it('It should convert numeric values to numbers', function () {
            expect('5'._.toJSValue()).to.equal(5);
            expect('0'._.toJSValue()).to.equal(0);
            expect('0.001'._.toJSValue()).to.equal(0.001);
            expect('.001'._.toJSValue()).to.equal(0.001);
            expect('5.3.1'._.toJSValue()).to.equal('5.3.1');
        });

        it('It should convert string to JS values', function () {
            expect('true'._.toJSValue()).to.equal(true);
            expect('false'._.toJSValue()).to.equal(false);

            expect('  true  '._.toJSValue()).to.equal(true);
            expect('  false  '._.toJSValue()).to.equal(false);

            expect('True'._.toJSValue()).to.equal('True');
            expect('falsE'._.toJSValue()).to.equal('falsE');

            expect('null'._.toJSValue()).to.equal(null);
            expect('undefined'._.toJSValue()).to.equal(undefined);

            expect('5.46'._.toJSValue()).to.equal(5.46);
        });
    });
}());
