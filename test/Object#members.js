'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#members', function () {

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
        require(path.join(__dirname, '..'));
    });

    it('It should return the correct number of members given an object', function () {
        var o = obj.members();
        expect(o).to.equal(3);

        o = eobj.members();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given an array', function () {
        var o = subarr.members();
        expect(o).to.equal(3);

        o = earr.members();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a string', function () {
        var o = string.members();
        expect(o).to.equal(6);

        o = estr.members();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a number', function () {
        var o = number.members();
        expect(o).to.equal(6);

        o = float.members();
        expect(o).to.equal(8);
    });

    it('It should return the correct number of members given a function', function () {
        var o = func.members();
        expect(o).to.equal(1);
    });
});
