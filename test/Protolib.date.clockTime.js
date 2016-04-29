(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.date.clockTime', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a string in the HH:MM:SS:MSEC format', function () {
            var date = new Date('4/26/2016 8:32:00 GMT-0400');
            expect(date._.clockTime()).to.equal('20:32:00.000');

            date = new Date('4/26/2016 11:32:15 GMT-0400');
            expect(date._.clockTime(true)).to.equal('23:32:15');
            expect(lib.date.clockTime(date, true)).to.equal('23:32:15');
        });
    });
}());
