'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.object.empty', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should correctly determine if an object is "empty"', function () {
        expect({}._.isEmpty()).to.equal(true);
        expect({ a: 0 }._.isEmpty()).to.equal(false);
        expect({ '0': null }._.isEmpty()).to.equal(false);
        expect(''._.isEmpty()).to.equal(true);
        expect(' '._.isEmpty()).to.equal(false);
        expect('\\'._.isEmpty()).to.equal(false);
        expect([]._.isEmpty()).to.equal(true);
        expect([null]._.isEmpty()).to.equal(false);
        expect([undefined]._.isEmpty()).to.equal(false);
        expect([1]._.isEmpty()).to.equal(false);
        expect((0)._.isEmpty()).to.equal(false);
        expect((1)._.isEmpty()).to.equal(false);
        expect((-1)._.isEmpty()).to.equal(false);
        expect((function () {})._.isEmpty()).to.equal(false);
    });
});
