'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#isEmpty', function () {
    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should correctly determine if an object is "empty"', function () {
        expect({}.isEmpty()).to.equal(true);
        expect({ a: 0 }.isEmpty()).to.equal(false);
        expect({ '0': null }.isEmpty()).to.equal(false);
        expect(''.isEmpty()).to.equal(true);
        expect(' '.isEmpty()).to.equal(false);
        expect('\\'.isEmpty()).to.equal(false);
        expect([].isEmpty()).to.equal(true);
        expect([null].isEmpty()).to.equal(false);
        expect([undefined].isEmpty()).to.equal(false);
        expect([1].isEmpty()).to.equal(false);
        expect((0).isEmpty()).to.equal(false);
        expect((1).isEmpty()).to.equal(false);
        expect((-1).isEmpty()).to.equal(false);
        expect((function () {}).isEmpty()).to.equal(false);
    });
});
