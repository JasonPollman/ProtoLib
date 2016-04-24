(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.descending', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should sort an array in descending order', function () {
            var arr = [];
            expect(arr._.descending()).to.eql([]);
            expect(arr._.descending()).to.equal(arr);

            arr = [3, 4, 1, 2, 9, 0, 4];
            expect(arr._.descending()).to.eql([9, 4, 4, 3, 2, 1, 0]);
            expect(arr._.descending()).to.equal(arr);

            arr = ['z', 'y', 'x', 'w', 'v', 'u', 't'];
            expect(arr._.descending()).to.eql(['z', 'y', 'x', 'w', 'v', 'u', 't']);
            expect(arr._.descending()).to.equal(arr);

            arr = [3, 'q', 4, 'a', 'c', 1, 2, 9, 0, 4];
            expect(arr._.descending()).to.eql(['q', 'c', 'a', 9, 4, 4, 3, 2, 1, 0]);
            expect(arr._.descending()).to.equal(arr);

            arr = [3, 'q', 4, {}, 'a', 'c', 1, 2, 9, 0, 4, {}, [], []];
            expect(arr._.descending()).to.eql(['q', 'c', 'a', {}, {}, 9, 4, 4, 3, 2, 1, 0, [], []]);
            expect(arr._.descending()).to.equal(arr);
        });
    });
}());
