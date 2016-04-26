(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.max', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the maximum value in an object or array', function () {
            expect([1, 4, 7, 5, 99, 1, 2]._.max()).to.equal(99);
            expect(['a', 'e', 'i', 'q', 'b', 'z']._.max()).to.equal('z');
            expect([1, 'a', 4, 'r', 999]._.max()).to.equal(999);
            expect({ a: 43, b: 123, c: 0 }._.max()).to.equal(123);

            var data = [
                {
                    name: 'foo',
                    value: 1
                },
                {
                    name: 'bar',
                    value: 2
                },
                {
                    name: 'baz',
                    value: 3
                }
            ];

            var max = data._.max(function (item) {
                return item.value;
            });

            expect(max).to.eql({ name: 'baz', value: 3 });
        });

        it('It should simply return the object if not an array or object', function () {
            expect((5)._.max()).to.equal(5);
            expect(('string')._.max()).to.equal('string');
            expect((true)._.max()).to.equal(true);
        });
    });
}());
