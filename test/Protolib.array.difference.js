(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.difference', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should compute the difference from the given arrays', function () {
            expect([1, 2, 3, 4]._.difference()).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.difference([1, 2])).to.eql([3, 4]);
            expect([1, 2, 3]._.difference([1, 2, 3])).to.eql([]);
            expect([1, 2, 3]._.difference([1, 2, 5])).to.eql([3, 5]);

            expect([1, 2, 3]._.difference([1, 2, 5, 7, 8, 9])).to.eql([3, 5, 7, 8, 9]);

            expect([1, 2, 3]._.difference([1, 2, 5, 7, 8, 9], ['a', 'b'])).to.eql([3, 5, 7, 8, 9, 'a', 'b']);
            expect(['a', 1, 2, 3]._.difference([1, 2, 5, 7, 8, 9], ['a', 'b'])).to.eql([3, 5, 7, 8, 9, 'b']);
            expect(['a', 1, 2, 3]._.difference([1, 2, 'a', 5, 7, 8, 9], ['a', 'b'])).to.eql([3, 5, 7, 8, 9, 'b']);

            expect([1, 2, 3]._.difference([3, 4, 5, 6])).to.eql([1, 2, 4, 5, 6]);
            expect([1, 2, 3]._.difference([3, 4, 5, 6], [1, 7, 8, 9], ['a'])).to.eql([2, 4, 5, 6, 7, 8, 9, 'a']);

            expect([2, 2, 2, 1]._.difference([3, 3, 3, 1], [1])).to.eql([2, 2, 2, 3, 3, 3]);
            expect([2, 2, 1, 1]._.difference([3, 3, 1, 1], [1])).to.eql([2, 2, 3, 3]);
        });
    });
}());
