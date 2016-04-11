'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.string.ellipses', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should add ellipses to a string with length > the specified length', function () {
        expect('hello world'._.ellipses(3)).to.equal('...');
        expect('hello world'._.ellipses(4)).to.equal('h...');
        expect('hello world'._.ellipses(5)).to.equal('he...');
        expect('hello world'._.ellipses(6)).to.equal('hel...');
        expect('hello world'._.ellipses(9)).to.equal('hello ...');
        expect('hello world'._.ellipses(11)).to.equal('hello world');
        expect('hello world'._.ellipses(12)).to.equal('hello world');
        expect('hello world'._.ellipses(15)).to.equal('hello world');
        expect('hello world'._.ellipses(' ')).to.equal('hello world');
        expect('hello world'._.ellipses(null)).to.equal('hello world');
        expect('hello world'._.ellipses(undefined)).to.equal('hello world');
        expect('hello world'._.ellipses({})).to.equal('hello world');
        expect('hello world'._.ellipses(-1)).to.equal('');
        expect('hello world'._.ellipses(-2)).to.equal('');
        expect('hello world'._.ellipses(-10)).to.equal('');
        expect('hello world'._.ellipses(0)).to.equal('');
        expect('hello world'._.ellipses()).to.equal('hello world');
    });

    it('It should add ellipses to the front of a string if "front" is specified', function () {
        expect('hello world'._.ellipses(3, 'front')).to.equal('...');
        expect('hello world'._.ellipses(4, 'front')).to.equal('...h');
        expect('hello world'._.ellipses(5, 'front')).to.equal('...he');
        expect('hello world'._.ellipses(6, 'front')).to.equal('...hel');
        expect('hello world'._.ellipses(9, 'front')).to.equal('...hello ');
        expect('hello world'._.ellipses(11, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(12, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(15, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(' ', 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(null, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(undefined, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses({}, 'front')).to.equal('hello world');
        expect('hello world'._.ellipses(-1, 'front')).to.equal('');
        expect('hello world'._.ellipses(-2, 'front')).to.equal('');
        expect('hello world'._.ellipses(-10, 'front')).to.equal('');
        expect('hello world'._.ellipses(0, 'front')).to.equal('');
    });

    it('It should allow for custom ellipses', function () {
        expect('hello world'._.ellipses(3, 'front', '``')).to.equal('``h');
        expect('hello world'._.ellipses(4, 'front', '``')).to.equal('``he');
        expect('hello world'._.ellipses(5, 'front', '``')).to.equal('``hel');
        expect('hello world'._.ellipses(6, 'front', '``')).to.equal('``hell');
        expect('hello world'._.ellipses(9, 'front', '``')).to.equal('``hello w');
        expect('hello world'._.ellipses(11, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(12, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(15, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(' ', 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(null, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(undefined, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses({}, 'front', '``')).to.equal('hello world');
        expect('hello world'._.ellipses(-1, 'front', '``')).to.equal('');
        expect('hello world'._.ellipses(-2, 'front', '``')).to.equal('');
        expect('hello world'._.ellipses(-10, 'front', '``')).to.equal('');
        expect('hello world'._.ellipses(0, 'front', '``')).to.equal('');
    });
});
