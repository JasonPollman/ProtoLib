'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#last', function () {

    // Create some test data
    var obj = { foo: 'bar', num: 2, bool: false },
        string = 'string',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3];

    before(function () {
        require(path.join(__dirname, '..'))('jl');
    });

    it('It should return the last item in an object', function () {
        var o = obj.jl.last();
        expect(o).to.equal(false);
    });

    it('It should return the last item in an array', function () {
        var o = subarr.jl.last();
        expect(o).to.equal(3);
    });

    it('It should return the last character in a string', function () {
        var o = string.jl.last();
        expect(o).to.equal('g');
    });

    it('It should return the last digit in a number', function () {
        var o = number.jl.last();
        expect(o).to.equal('3');

        o = float.jl.last();
        expect(o).to.equal('4');
    });

    it('It should return the last charcter of a function cast to a string', function () {
        var o = func.jl.last();
        expect(o).to.equal('}');
    });
});
