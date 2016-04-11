'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.object.isBoolean', function () {

    var lib;
    before(function () {
        lib = new (require(path.join(__dirname, '..')))('_');
    });

    it('It should return true if and only if all arguments are booleans', function () {
        expect(lib.object.isBoolean(true)).to.equal(true);
        expect(lib.object.isBoolean(true, true)).to.equal(true);
        expect(lib.object.isBoolean(true, true, true)).to.equal(true);
        expect(lib.object.isBoolean(true, true, true, true)).to.equal(true);
        expect(lib.object.isBoolean(true, true, true, true)).to.equal(true);
        expect(lib.object.isBoolean()).to.equal(true);

        expect(lib.object.isBoolean(5)).to.equal(false);
        expect(lib.object.isBoolean('')).to.equal(false);
        expect(lib.object.isBoolean('string')).to.equal(false);
        expect(lib.object.isBoolean(function () {})).to.equal(false);
        expect(lib.object.isBoolean({})).to.equal(false);

        expect(lib.object.isBoolean(true, 5)).to.equal(false);
        expect(lib.object.isBoolean(true, '')).to.equal(false);
        expect(lib.object.isBoolean(true, 'string')).to.equal(false);
        expect(lib.object.isBoolean(true, function () {})).to.equal(false);
        expect(lib.object.isBoolean(true, {})).to.equal(false);

        expect(lib.object.isBoolean(true, true, 5)).to.equal(false);
        expect(lib.object.isBoolean(true, true, '')).to.equal(false);
        expect(lib.object.isBoolean(true, true, 'string')).to.equal(false);
        expect(lib.object.isBoolean(true, true, function () {})).to.equal(false);
        expect(lib.object.isBoolean(true, true, {})).to.equal(false);

        expect(lib.object.isBoolean(true, true, 5, true)).to.equal(false);
        expect(lib.object.isBoolean(true, true, '', true)).to.equal(false);
        expect(lib.object.isBoolean(true, true, 'string', true)).to.equal(false);
        expect(lib.object.isBoolean(true, true, function () {}, true)).to.equal(false);
        expect(lib.object.isBoolean(true, true, {}, true)).to.equal(false);

        expect(lib.object.isBoolean(null)).to.equal(false);
        expect(lib.object.isBoolean(null, true)).to.equal(false);
        expect(lib.object.isBoolean(true, null)).to.equal(false);

        expect(lib.object.isBoolean(false)).to.equal(true);
        expect(lib.object.isBoolean(false, false)).to.equal(true);
        expect(lib.object.isBoolean(false, false, false)).to.equal(true);
        expect(lib.object.isBoolean(false, false, false, false)).to.equal(true);
        expect(lib.object.isBoolean(true, false, true, false)).to.equal(true);
        expect(lib.object.isBoolean()).to.equal(true);

        expect(lib.object.isBoolean(5)).to.equal(false);
        expect(lib.object.isBoolean('')).to.equal(false);
        expect(lib.object.isBoolean('string')).to.equal(false);
        expect(lib.object.isBoolean(function () {})).to.equal(false);
        expect(lib.object.isBoolean({})).to.equal(false);

        expect(lib.object.isBoolean(false, 5)).to.equal(false);
        expect(lib.object.isBoolean(false, '')).to.equal(false);
        expect(lib.object.isBoolean(false, 'string')).to.equal(false);
        expect(lib.object.isBoolean(false, function () {})).to.equal(false);
        expect(lib.object.isBoolean(false, {})).to.equal(false);

        expect(lib.object.isBoolean(false, false, 5)).to.equal(false);
        expect(lib.object.isBoolean(false, false, '')).to.equal(false);
        expect(lib.object.isBoolean(false, false, 'string')).to.equal(false);
        expect(lib.object.isBoolean(false, false, function () {})).to.equal(false);
        expect(lib.object.isBoolean(false, false, {})).to.equal(false);

        expect(lib.object.isBoolean(false, false, 5, true)).to.equal(false);
        expect(lib.object.isBoolean(false, false, '', true)).to.equal(false);
        expect(lib.object.isBoolean(false, false, 'string', true)).to.equal(false);
        expect(lib.object.isBoolean(false, false, function () {}, true)).to.equal(false);
        expect(lib.object.isBoolean(false, false, {}, true)).to.equal(false);

        expect(lib.object.isBoolean(null)).to.equal(false);
        expect(lib.object.isBoolean(null, false)).to.equal(false);
        expect(lib.object.isBoolean(false, null)).to.equal(false);

        expect((5)._.isBoolean()).to.equal(false);
        expect(('string')._.isBoolean()).to.equal(false);
        expect(({})._.isBoolean()).to.equal(false);
        expect(([])._.isBoolean()).to.equal(false);
        expect(true._.isBoolean()).to.equal(true);
        expect(false._.isBoolean()).to.equal(true);
    });
});
