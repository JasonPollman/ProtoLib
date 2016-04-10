'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Stdp.isNull', function () {

    var stdp;
    before(function () {
        stdp = require(path.join(__dirname, '..'))('p');
    });

    console.log(stdp);
    it('It should return true if and only if all arguments are null', function () {
        expect(stdp.allNull(null)).to.equal(true);
        expect(stdp.allNull(null, null)).to.equal(true);
        expect(stdp.allNull(null, null, null)).to.equal(true);
        expect(stdp.allNull(null, null, null, null)).to.equal(true);
        expect(stdp.allNull(null, null, null, null)).to.equal(true);
        expect(stdp.allNull()).to.equal(true);
    });
});
