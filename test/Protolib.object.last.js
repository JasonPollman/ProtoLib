'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.object.last', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    // Create some test data
    var obj = { foo: 'bar', num: 2, bool: false },
        string = 'string',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3];

    it('It should return the last item in an object', function () {
        var o = obj._.last();
        expect(o).to.equal(false);
    });

    it('It should return the last item in an array', function () {
        var o = subarr._.last();
        expect(o).to.equal(3);
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
});
