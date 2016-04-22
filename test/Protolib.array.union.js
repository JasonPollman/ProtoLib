(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.union', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should create a new array with containing the union of all array arguments', function () {
            expect([1, 2]._.union([3, 4])).to.eql([1, 2, 3, 4]);
            expect([2, 1]._.union([3, 4])).to.eql([2, 1, 3, 4]);
            expect([2, 1]._.union([3, 4], [5, 6])).to.eql([2, 1, 3, 4, 5, 6]);
            expect([2, 1]._.union([3, 4], [5, 6], null, 'test', [8, 9, 0])).to.eql([2, 1, 3, 4, 5, 6, 8, 9, 0]);
            expect([1, 2]._.union(['a', 'b'])).to.eql([1, 2, 'a', 'b']);
            expect([]._.union([3, 4])).to.eql([3, 4]);
            expect([]._.union([])).to.eql([]);
            expect([]._.union([], [], [])).to.eql([]);
            expect([]._.union([], ['test'], [])).to.eql(['test']);
        });
    });
}());
