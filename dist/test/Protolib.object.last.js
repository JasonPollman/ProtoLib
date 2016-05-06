(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }


    describe('Protolib.object.last', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        // Create some test data
        var obj = { foo: 'bar', num: 2, bool: false },
            string = 'string',
            number = 124323,
            float  = 1324.234,
            func   = function () { console.log('HELLO WORLD!'); },
            subarr = [1, 2, 3];

        it('It should simply return booleans', function () {
            expect(true._.last()).to.equal(true);
            expect(false._.last()).to.equal(false);
        });

        it('It should return the last item in an object', function () {
            var o = obj._.last();
            expect(o).to.equal(false);
        });

        it('It should return the last item in an array', function () {
            var o = subarr._.last();
            expect(o).to.equal(3);
        });

        it('It should simply return a boolean', function () {
            var o = true._.last();
            expect(o).to.equal(true);

            o = false._.last();
            expect(o).to.equal(false);
        });

        it('It should return the last character in a string', function () {
            var o = string._.last();
            expect(o).to.equal('g');
        });

        it('It should return the last digit in a number', function () {
            var o = number._.last();
            expect(o).to.equal('3');

            o = float._.last();
            expect(o).to.equal('4');
        });

        it('It should return the last charcter of a function cast to a string', function () {
            var o = func._.last();
            expect(o).to.equal('}');
        });

        it('It should always return an array/object if the "n" argument is supplied', function () {
            var arr = [1];
            expect(arr._.last()).to.equal(1);
            expect(arr._.last(1)).to.eql([1]);

            arr = [];
            expect(arr._.last()).to.equal(undefined);
            expect(arr._.last(0)).to.eql([]);

            arr = [1, 2, 3, 4];
            expect(arr._.last()).to.equal(4);
            expect(arr._.last(1)).to.eql([4]);

            var obj = { foo: 1 };
            expect(obj._.last()).to.equal(1);
            expect(obj._.last(1)).to.eql({ foo: 1 });

            obj = {};
            expect(obj._.last()).to.equal(undefined);
            expect(obj._.last(0)).to.eql({});

            obj = obj = { foo: 1, bar: 7 };
            expect(obj._.last()).to.equal(7);
            expect(obj._.last(1)).to.eql({ bar: 7 });
        });

        it('It should return the last n items, if the a number argument is passed in as n', function () {
            expect(obj._.last(2)).to.eql({ num: 2, bool: false });
            expect(obj._.last(-2)).to.eql({});
            expect(obj._.last(0)).to.eql({});

            expect(subarr._.last(2)).to.eql([2, 3]);
            expect(subarr._.last(-2)).to.eql([3]); // Works like slice
            expect(subarr._.last(-1)).to.eql([2, 3]); // Works like slice
            expect(subarr._.last(0)).to.eql([]);

            expect(string._.last(2)).to.equal('ng');
            expect(string._.last(-2)).to.equal('ring'); // Works like slice
            expect(string._.last(0)).to.equal(null);
        });
    });

}());
