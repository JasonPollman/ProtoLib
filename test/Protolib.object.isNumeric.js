(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isNumeric', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are numeric', function () {
            expect(lib.object.isNumeric(true)).to.equal(false);
            expect(lib.object.isNumeric(true, true)).to.equal(false);
            expect(lib.object.isNumeric(true, true, true)).to.equal(false);
            expect(lib.object.isNumeric(true, true, true, true)).to.equal(false);
            expect(lib.object.isNumeric(true, true, true, true)).to.equal(false);
            expect(lib.object.isNumeric()).to.equal(true);

            expect(lib.object.isNumeric(5)).to.equal(true);
            expect(lib.object.isNumeric('5')).to.equal(true);
            expect(lib.object.isNumeric(-5)).to.equal(true);
            expect(lib.object.isNumeric('-5')).to.equal(true);
            expect(lib.object.isNumeric(0.1235)).to.equal(true);
            expect(lib.object.isNumeric('.234')).to.equal(true);
            expect(lib.object.isNumeric('0.12341234')).to.equal(true);
            expect(lib.object.isNumeric(1e7)).to.equal(true);
            expect(lib.object.isNumeric(1.2134e7)).to.equal(true);
            expect(lib.object.isNumeric('1e7')).to.equal(true);
            expect(lib.object.isNumeric('1.2134e7')).to.equal(true);

            expect(lib.object.isNumeric(5, 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('5', 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric(-5, 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('-5', 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric(0.1235, 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('.234', 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('0.12341234', 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric(1e7, 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric(1.2134e7, 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('1e7', 1, '123', '.123')).to.equal(true);
            expect(lib.object.isNumeric('1.2134e7', 1, '123', '.123')).to.equal(true);

            expect(lib.object.isNumeric(5, 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('5', 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric(-5, 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('-5', 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric(0.1235, 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('.234', 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('0.12341234', 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric(1e7, 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric(1.2134e7, 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('1e7', 1, '123', '.123', 'false')).to.equal(false);
            expect(lib.object.isNumeric('1.2134e7', 1, '123', '.123', 'false')).to.equal(false);

            expect(lib.object.isNumeric(5, 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('5', 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric(-5, 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('-5', 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric(0.1235, 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('.234', 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('0.12341234', 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric(1e7, 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric(1.2134e7, 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('1e7', 1, '123', '.123', false)).to.equal(false);
            expect(lib.object.isNumeric('1.2134e7', 1, '123', '.123', false)).to.equal(false);

            expect(lib.object.isNumeric('1.2134e7', '0xFF', '123', '.123', '0x64')).to.equal(true);
            expect(lib.object.isNumeric('1.2134e7', '0xFF', '123', '.123', 'aq0x64!!!!!!!!!!!')).to.equal(false);

            expect(lib.object.isNumeric({})).to.equal(false);
            expect(lib.object.isNumeric([])).to.equal(false);
            expect(lib.object.isNumeric(function () {})).to.equal(false);

            expect((5)._.isNumeric()).to.equal(true);
        });
    });

}());
