(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.copy', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return a shallow copy of arrays', function () {
            var arr = [];
            expect(arr._.copy()).to.eql([]);
            expect(arr._.copy()).to.not.equal(arr);

            arr = [1, 2, 3];
            expect(arr._.copy()).to.eql([1, 2, 3]);
            expect(arr._.copy()).to.not.equal(arr);

            arr = [1, 2, 3, 'a', 'b', 'c'];
            expect(arr._.copy()).to.eql([1, 2, 3, 'a', 'b', 'c']);
            expect(arr._.copy()).to.not.equal(arr);

            var func = function () {};
            arr = [1, 2, 3, 'a', 'b', 'c', func];
            expect(arr._.copy()).to.eql([1, 2, 3, 'a', 'b', 'c', func]);
            expect(arr._.copy()).to.not.equal(arr);

            arr = [func, 1, 2, 3, func, 'a', 'b', 'c', func];
            expect(arr._.copy()).to.eql([func, 1, 2, 3, func, 'a', 'b', 'c', func]);
            expect(arr._.copy()).to.not.equal(arr);

            var obj = { foo: 'bar' };
            arr = [func, 1, 2, 3, obj, func, 'a', 'b', 'c', func, obj];
            expect(arr._.copy()).to.eql([func, 1, 2, 3, { foo: 'bar' }, func, 'a', 'b', 'c', func, { foo: 'bar' }]);
            expect(arr._.copy()).to.eql([func, 1, 2, 3, obj, func, 'a', 'b', 'c', func, obj]);
            expect(arr._.copy()).to.not.equal(arr);
        });

        it('It should return a shallow copy of objects', function () {
            var obj = { a: 1, b: 2, c: 3};
            expect(obj._.copy()).to.eql({ a: 1, b: 2, c: 3});
            expect(obj._.copy()).to.not.equal(obj);

            obj = { a: 1, b: 2, c: 3, d: 'a', e: 'b', f: 'c' };
            expect(obj._.copy()).to.eql({ a: 1, b: 2, c: 3, d: 'a', e: 'b', f: 'c' });
            expect(obj._.copy()).to.not.equal(obj);

            var func = function () {};
            obj = { a: 1, b: 2, c: 3, d: 'a', e: 'b', f: 'c', g: func };
            expect(obj._.copy()).to.eql({ a: 1, b: 2, c: 3, d: 'a', e: 'b', f: 'c', g: func });
            expect(obj._.copy()).to.not.equal(obj);

            var arr = [1, 2, 3];
            obj = [func, 1, 2, 3, arr, func, 'a', 'b', 'c', func, arr];
            expect(obj._.copy()).to.eql([func, 1, 2, 3, [1, 2, 3], func, 'a', 'b', 'c', func, [1, 2, 3]]);
            expect(obj._.copy()).to.eql([func, 1, 2, 3, arr, func, 'a', 'b', 'c', func, arr]);
            expect(obj._.copy()).to.not.equal(obj);
        });

    });
}());
