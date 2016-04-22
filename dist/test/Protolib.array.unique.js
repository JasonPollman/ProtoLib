(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.unique', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return a new array of unique items', function () {
            expect([]._.unique()).to.eql([]);
            expect([1, 2, 3]._.unique()).to.eql([1, 2, 3]);
            expect([1, 2, 3, 3]._.unique()).to.eql([1, 2, 3]);
            expect([1, 2, 2, 3, 3]._.unique()).to.eql([1, 2, 3]);
            expect([1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3]._.unique()).to.eql([1, 2, 3]);

            expect(['a', 'a', 1, 1]._.unique()).to.eql(['a', 1]);
            expect(['a', 1, 'a', 1]._.unique()).to.eql(['a', 1]);
            expect(['a', 1]._.unique()).to.eql(['a', 1]);

            var arr = ['a', 1];
            expect(arr._.unique()).to.not.equal(arr);
        });
    });
}());
