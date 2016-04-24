(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.toArray', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        // Create some test data
        var obj = { foo: 'bar', num: 2, bool: false },
            string = 'string',
            number = 124323,
            float  = 1324.234,
            func   = function () { console.log('HELLO WORLD!'); },
            subarr = [1, 2, 3],
            array  = [1, 2, subarr];

        it('It should convert objects to arrays', function () {
            var arr = obj._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.be.a('string');
            expect(arr[1]).to.be.a('number');
            expect(arr[2]).to.be.a('boolean');
        });

        it('It should convert strings to a char arrays', function () {
            var arr = string._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal('s');
            expect(arr[1]).to.equal('t');
            expect(arr[2]).to.equal('r');
            expect(arr[3]).to.equal('i');
            expect(arr[4]).to.equal('n');
            expect(arr[5]).to.equal('g');
        });

        it('It should convert numbers to an array of digits', function () {
            var arr = number._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal(1);
            expect(arr[1]).to.equal(2);
            expect(arr[2]).to.equal(4);
            expect(arr[3]).to.equal(3);
            expect(arr[4]).to.equal(2);
            expect(arr[5]).to.equal(3);

            arr = float._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal(1);
            expect(arr[1]).to.equal(3);
            expect(arr[2]).to.equal(2);
            expect(arr[3]).to.equal(4);
            expect(arr[4]).to.equal('.');
            expect(arr[5]).to.equal(2);
            expect(arr[6]).to.equal(3);
            expect(arr[7]).to.equal(4);
        });

        it('It should convert booleans to a char arrays', function () {
            var arr = true._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal('t');
            expect(arr[1]).to.equal('r');
            expect(arr[2]).to.equal('u');
            expect(arr[3]).to.equal('e');

            arr = false._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal('f');
            expect(arr[1]).to.equal('a');
            expect(arr[2]).to.equal('l');
            expect(arr[3]).to.equal('s');
            expect(arr[4]).to.equal('e');
        });

        it('It should convert functions to a char arrays', function () {
            var arr = func._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr[0]).to.equal('f');
            expect(arr[1]).to.equal('u');
            expect(arr[2]).to.equal('n');
            expect(arr[3]).to.equal('c');
        });

        it('It should simply return arrays', function () {
            var arr = array._.toArray();
            expect(arr).to.be.instanceof(Array);
            expect(arr).to.equal(array);
            expect(arr[0]).to.equal(1);
            expect(arr[1]).to.equal(2);
            expect(arr[2]).to.equal(subarr);
        });

        it('It should convert an object to an array', function () {
            expect({ foo: 1, bar: 2, baz: 3}._.toArray()).to.eql([1, 2, 3]);
            expect({}._.toArray()).to.eql([]);

            var f = function () {};
            expect({ foo: 1, bar: 2, baz: 3, func: f }._.toArray()).to.eql([1, 2, 3, f]);
        });

        it('It should convert a string to a char array', function () {
            expect('hello world'._.toArray()).to.eql(['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']);
            expect(''._.toArray()).to.eql([]);
            expect('   '._.toArray()).to.eql([' ', ' ', ' ']);
        });

        it('It should split a number by digits', function () {
            expect((1234)._.toArray()).to.eql([1, 2, 3, 4]);
            expect((-1234)._.toArray()).to.eql(['-', 1, 2, 3, 4]);
            expect((0)._.toArray()).to.eql([0]);
            expect((1e7)._.toArray()).to.eql([1, 0, 0, 0, 0, 0, 0, 0]);
        });

        it('It should operate on functions as strings', function () {
            expect((function () {})._.toArray()).to.eql(['f', 'u', 'n', 'c', 't', 'i', 'o', 'n', ' ', '(', ')', ' ', '{', '}']);
        });
    });
}());
