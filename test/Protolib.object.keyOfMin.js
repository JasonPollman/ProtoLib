(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.keyOfMin', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return the key of the minmum value in an object or array', function () {
            expect([1, 4, 7, 5, 99, 1, 2]._.keyOfMin()).to.equal('5');
            expect(['a', 'e', 'i', 'q', 'b', 'z']._.keyOfMin()).to.equal('0');
            expect([1, 'a', 4, 'r', 999]._.keyOfMin()).to.equal('0');
            expect({ a: 43, b: 123, c: 0 }._.keyOfMin()).to.equal('c');

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

            var keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal('0');

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

            keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal('2');

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

            keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal('c');

            data = [
                {
                    name: 'foo',
                    value: 's'
                },
                {
                    name: 'bar',
                    value: 'a'
                },
                {
                    name: 'baz',
                    value: 'x'
                },
                {
                    name: 'hello',
                    value: 'z'
                },
                {
                    name: 'world',
                    value: 'b'
                }
            ];

            keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal('1');

            data = [
                {
                    name: 'foo',
                    value: [1, 2, 3, 4]
                },
                {
                    name: 'bar',
                    value: [1, 2, 3, 4]
                },
                {
                    name: 'baz',
                    value: [1, 2, 3, 4]
                },
                {
                    name: 'hello',
                    value: [1, 2, 3, 4]
                },
                {
                    name: 'world',
                    value: [1, 2, 3, 4]
                }
            ];

            keyOfMin = data._.keyOfMin(function (item) {
                return item._.keyOfMin();
            });

            expect(keyOfMin).to.equal('4');

            data = [
                {
                    name: 'foo',
                    value: [1, 2, 3, 4]
                },
                {
                    name: 'bar',
                    value: [5, 6, 7, 8]
                },
                {
                    name: 'baz',
                    value: [9, 10, 11, 12]
                },
                {
                    name: 'hello',
                    value: [13, 14, 15, 16]
                },
                {
                    name: 'world',
                    value: [17, 18, 19, 20]
                }
            ];

            keyOfMin = data._.keyOfMin(function (item) {
                return item._.min();
            });

            expect(keyOfMin).to.eql('0');

            data = [
                {
                    name: 'foo',
                    value: 'a'
                }
            ];

            keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal('0');

            data = [];

            keyOfMin = data._.keyOfMin(function (item) {
                return item.value;
            });

            expect(keyOfMin).to.equal(undefined);
        });

        it('It should simply return the object if not an array or object', function () {
            expect((5)._.keyOfMin()).to.equal(5);
            expect(('string')._.keyOfMin()).to.equal('string');
            expect((true)._.keyOfMin()).to.equal(true);
        });
    });
}());
