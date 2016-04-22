(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.makeUnique', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should modify the array by removing duplicates', function () {

            var arr = [];
            expect(arr._.makeUnique()).to.eql([]);
            expect(arr._.makeUnique()).to.eql(arr);

            arr = [1, 2, 3, 4, 4, 4, 4, 3, 2, 1, 1, 2, 3];
            expect(arr._.makeUnique()).to.eql([1, 2, 3, 4]);
            expect(arr._.makeUnique()).to.equal(arr);

            arr = [1, 'a', 1, 'a', {}, {}, {}];
            expect(arr._.makeUnique()).to.eql([1, 'a', {}, {}, {}]);
            expect(arr._.makeUnique()).to.equal(arr);

            var obj = { foo: 'bar' };
            arr = [1, 'a', 1, 'a', obj, obj, {}];
            expect(arr._.makeUnique()).to.eql([1, 'a', { foo: 'bar' }, {}]);
            expect(arr._.makeUnique()).to.equal(arr);

            obj = [1, 2, 3, 4];
            arr = [1, 'a', 1, 'a', obj, obj, {}];
            expect(arr._.makeUnique()).to.eql([1, 'a', [1, 2, 3, 4], {}]);
            expect(arr._.makeUnique()).to.equal(arr);

            obj = [1, 2, 3, 4, 1, 'a'];
            arr = [1, 'a', 1, 'a', obj._.makeUnique(), obj, {}];
            expect(arr._.makeUnique()).to.eql([1, 'a', [1, 2, 3, 4, 'a'], {}]);
            expect(arr._.makeUnique()).to.equal(arr);
        });
    });
}());
