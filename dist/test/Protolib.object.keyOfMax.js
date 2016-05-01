(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.keyOfMax', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the key of the maximum value in an object or array', function () {
            expect([1, 4, 7, 5, 99, 1, 2]._.keyOfMax()).to.equal('4');
            expect(['a', 'e', 'i', 'q', 'b', 'z']._.keyOfMax()).to.equal('5');
            expect([1, 'a', 4, 'r', 999]._.keyOfMax()).to.equal('4');
            expect({ a: 43, b: 123, c: 0 }._.keyOfMax()).to.equal('b');

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

            var keyOfMax = data._.keyOfMax(function (item) {
                return item.value;
            });

            expect(keyOfMax).to.eql('2');

            data = [
                {
                    name: 'foo',
                    value: 2
                },
                {
                    name: 'bar',
                    value: 3
                },
                {
                    name: 'baz',
                    value: 1
                }
            ];

            keyOfMax = data._.keyOfMax(function (item) {
                return item.value;
            });

            expect(keyOfMax).to.eql('1');

            data = {
                a: {
                    name: 'foo',
                    value: 3
                },
                b: {
                    name: 'bar',
                    value: 2
                },
                c: {
                    name: 'baz',
                    value: 1
                }
            };

            keyOfMax = data._.keyOfMax(function (item) {
                return item.value;
            });

            expect(keyOfMax).to.eql('a');
        });

        it('It should simply return the object if not an array or object', function () {
            expect((5)._.keyOfMax()).to.equal(5);
            expect(('string')._.keyOfMax()).to.equal('string');
            expect((true)._.keyOfMax()).to.equal(true);
        });
    });
}());
