(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.ascending', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should sort an array in ascending order', function () {
            var arr = [];
            expect(arr._.ascending()).to.eql([]);
            expect(arr._.ascending()).to.equal(arr);

            arr = [3, 4, 1, 2, 9, 0, 4];
            expect(arr._.ascending()).to.eql([0, 1, 2, 3, 4, 4, 9]);
            expect(arr._.ascending()).to.equal(arr);

            arr = ['z', 'y', 'x', 'w', 'v', 'u', 't'];
            expect(arr._.ascending()).to.eql(['t', 'u', 'v', 'w', 'x', 'y', 'z']);
            expect(arr._.ascending()).to.equal(arr);

            arr = [3, 'q', 4, 'a', 'c', 1, 2, 9, 0, 4];
            expect(arr._.ascending()).to.eql([0, 1, 2, 3, 4, 4, 9, 'a', 'c', 'q']);
            expect(arr._.ascending()).to.equal(arr);

            arr = [3, 'q', 4, {}, 'a', 'c', 1, 2, 9, 0, 4, {}, [], []];
            expect(arr._.ascending()).to.eql([[], [], 0, 1, 2, 3, 4, 4, 9, {}, {}, 'a', 'c', 'q']);
            expect(arr._.ascending()).to.equal(arr);
        });
    });
}());
