(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.without', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should create a new array with all occurences of the given arguments removed', function () {
            expect([1, 2, 3, 4]._.without(1)).eql([2, 3, 4]);
            expect([1, 2, 3, 4]._.without(1, 2)).eql([3, 4]);
            expect([1, 2, 3, 4]._.without(1, 2, 3)).eql([4]);
            expect([1, 2, 3, 4]._.without(1, 2, 3, 4)).eql([]);

            expect([0, 1, 2, 3, 4]._.without(1)).eql([0, 2, 3, 4]);
            expect([0, 1, 2, 3, 4]._.without(1, 2)).eql([0, 3, 4]);
            expect([0, 1, 2, 3, 4]._.without(1, 2, 3)).eql([0, 4]);
            expect([0, 1, 2, 3, 4]._.without(1, 2, 3, 4)).eql([0]);

            expect([0, 1, 2, 3, 4]._.without(0, 1)).eql([2, 3, 4]);
            expect([0, 1, 2, 3, 4]._.without(0, 1, 2)).eql([3, 4]);
            expect([0, 1, 2, 3, 4]._.without(0, 1, 2, 3)).eql([4]);
            expect([0, 1, 2, 3, 4]._.without(0, 1, 2, 3, 4)).eql([]);

            expect(['a', 'b', '', '', 'c', '', 'd']._.without('')).eql(['a', 'b', 'c', 'd']);

            expect([1, 2, 3, 4]._.without('1')).eql([1, 2, 3, 4]);

            expect([1, null, null, null, 2, 3, 'a', 'b']._.without(null)).eql([1, 2, 3, 'a', 'b']);
            expect([1, null, null, null, 2, 3, 'a', 'b']._.without(null)).not.eql([3, 2, 1, 'a', 'b']);

            expect([1, null, undefined, null, null, 2, 3, 'a', 'b']._.without(null)).not.eql([3, 2, 1, 'a', 'b']);
            expect([1, undefined, null, null, null, 2, 3, 'a', 'b']._.without(null)).not.eql([3, 2, 1, 'a', 'b']);

            expect([]._.without()).to.eql([]);
            expect([undefined]._.without()).to.eql([undefined]);
            expect([undefined]._.without(undefined)).to.eql([]);
            expect([undefined]._.without(null)).to.eql([undefined]);
            expect([null]._.without(undefined)).to.eql([null]);

            expect([1, null, 2, null, undefined]._.without(null, undefined)).to.eql([1, 2]);

            expect([1, 2, 3]._.without(2, 3)).to.eql([1]);
            expect(['a', 'b', 'c']._.without('e')).to.eql(['a', 'b', 'c']);

            var obj = { foo: 'bar' };
            expect([obj, 1, 'a string', obj, obj]._.without(obj)).to.eql([1, 'a string']);
        });
    });
}());
