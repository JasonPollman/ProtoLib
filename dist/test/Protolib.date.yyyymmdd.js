(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.date.yyyymmdd', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a string in the YYYY-MM-DD format', function () {
            var date = new Date('4/28/2016');
            expect(date._.yyyymmdd()).to.equal('2016-04-28');
            expect(date._.yyyymmdd('.')).to.equal('2016.04.28');
            expect(lib.date.yyyymmdd(date, '.')).to.equal('2016.04.28');

            date = new Date('12/28/2304');
            expect(date._.yyyymmdd()).to.equal('2304-12-28');
            expect(date._.yyyymmdd('.')).to.equal('2304.12.28');
            expect(lib.date.yyyymmdd(date, '.')).to.equal('2304.12.28');
        });
    });
}());
