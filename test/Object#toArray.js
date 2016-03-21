'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#toArray', function () {

    // Create some test data
    var obj = { foo: 'bar', num: 2, bool: false },
        string = 'string',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3],
        array  = [1, 2, subarr];

    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should convert objects to arrays', function () {
        var arr = obj.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.be.a('string');
        expect(arr[1]).to.be.a('number');
        expect(arr[2]).to.be.a('boolean');
    });

    it('It should convert strings to a char arrays', function () {
        var arr = string.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('s');
        expect(arr[1]).to.equal('t');
        expect(arr[2]).to.equal('r');
        expect(arr[3]).to.equal('i');
        expect(arr[4]).to.equal('n');
        expect(arr[5]).to.equal('g');
    });

    it('It should convert numbers to a char arrays', function () {
        var arr = number.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('1');
        expect(arr[1]).to.equal('2');
        expect(arr[2]).to.equal('4');
        expect(arr[3]).to.equal('3');
        expect(arr[4]).to.equal('2');
        expect(arr[5]).to.equal('3');

        arr = float.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('1');
        expect(arr[1]).to.equal('3');
        expect(arr[2]).to.equal('2');
        expect(arr[3]).to.equal('4');
        expect(arr[4]).to.equal('.');
        expect(arr[5]).to.equal('2');
        expect(arr[6]).to.equal('3');
        expect(arr[7]).to.equal('4');
    });

    it('It should convert booleans to a char arrays', function () {
        var arr = true.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('t');
        expect(arr[1]).to.equal('r');
        expect(arr[2]).to.equal('u');
        expect(arr[3]).to.equal('e');

        arr = false.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('f');
        expect(arr[1]).to.equal('a');
        expect(arr[2]).to.equal('l');
        expect(arr[3]).to.equal('s');
        expect(arr[4]).to.equal('e');
    });

    it('It should convert functions to a char arrays', function () {
        var arr = func.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('f');
        expect(arr[1]).to.equal('u');
        expect(arr[2]).to.equal('n');
        expect(arr[3]).to.equal('c');
    });

    it('It should simply return arrays', function () {
        var arr = array.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr).to.equal(array);
        expect(arr[0]).to.equal(1);
        expect(arr[1]).to.equal(2);
        expect(arr[2]).to.equal(subarr);
    });
});
