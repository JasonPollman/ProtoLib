'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#j.members', function () {

    // Create some test data
    var obj    = { foo: 'bar', num: 2, bool: false },
        eobj   = {},
        string = 'string',
        estr   = '',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3],
        earr   = [];

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should return the correct number of members given an object', function () {
        var o = obj.jlib.size();
        expect(o).to.equal(3);

        o = eobj.jlib.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given an array', function () {
        var o = subarr.jlib.size();
        expect(o).to.equal(3);

        o = earr.jlib.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a string', function () {
        var o = string.jlib.size();
        expect(o).to.equal(6);

        o = estr.jlib.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a number', function () {
        var o = number.jlib.size();
        expect(o).to.equal(6);

        o = float.jlib.size();
        expect(o).to.equal(8);
    });

    it('It should return the correct number of members given a function', function () {
        var o = func.jlib.size();
        expect(o).to.equal(1);
    });
});
