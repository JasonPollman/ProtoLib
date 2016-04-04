'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#isEmpty', function () {
    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should correctly determine if an object is "empty"', function () {
        expect({}.jlib.isEmpty()).to.equal(true);
        expect({ a: 0 }.jlib.isEmpty()).to.equal(false);
        expect({ '0': null }.jlib.isEmpty()).to.equal(false);
        expect(''.jlib.isEmpty()).to.equal(true);
        expect(' '.jlib.isEmpty()).to.equal(false);
        expect('\\'.jlib.isEmpty()).to.equal(false);
        expect([].jlib.isEmpty()).to.equal(true);
        expect([null].jlib.isEmpty()).to.equal(false);
        expect([undefined].jlib.isEmpty()).to.equal(false);
        expect([1].jlib.isEmpty()).to.equal(false);
        expect((0).jlib.isEmpty()).to.equal(false);
        expect((1).jlib.isEmpty()).to.equal(false);
        expect((-1).jlib.isEmpty()).to.equal(false);
        expect((function () {}).jlib.isEmpty()).to.equal(false);
    });
});
