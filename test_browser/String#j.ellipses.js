'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.ellipses', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should add ellipses to a string with length > the specified length', function () {
        expect('hello world'.jlib.ellipses(3)).to.equal('...');
        expect('hello world'.jlib.ellipses(4)).to.equal('h...');
        expect('hello world'.jlib.ellipses(5)).to.equal('he...');
        expect('hello world'.jlib.ellipses(6)).to.equal('hel...');
        expect('hello world'.jlib.ellipses(9)).to.equal('hello ...');
        expect('hello world'.jlib.ellipses(11)).to.equal('hello world');
        expect('hello world'.jlib.ellipses(12)).to.equal('hello world');
        expect('hello world'.jlib.ellipses(15)).to.equal('hello world');
        expect('hello world'.jlib.ellipses(' ')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(null)).to.equal('hello world');
        expect('hello world'.jlib.ellipses(undefined)).to.equal('hello world');
        expect('hello world'.jlib.ellipses({})).to.equal('hello world');
        expect('hello world'.jlib.ellipses(-1)).to.equal('');
        expect('hello world'.jlib.ellipses(-2)).to.equal('');
        expect('hello world'.jlib.ellipses(-10)).to.equal('');
        expect('hello world'.jlib.ellipses(0)).to.equal('');
        expect('hello world'.jlib.ellipses()).to.equal('hello world');
    });

    it('It should add ellipses to the front of a string if "front" is specified', function () {
        expect('hello world'.jlib.ellipses(3, 'front')).to.equal('...');
        expect('hello world'.jlib.ellipses(4, 'front')).to.equal('...h');
        expect('hello world'.jlib.ellipses(5, 'front')).to.equal('...he');
        expect('hello world'.jlib.ellipses(6, 'front')).to.equal('...hel');
        expect('hello world'.jlib.ellipses(9, 'front')).to.equal('...hello ');
        expect('hello world'.jlib.ellipses(11, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(12, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(15, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(' ', 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(null, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(undefined, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses({}, 'front')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(-1, 'front')).to.equal('');
        expect('hello world'.jlib.ellipses(-2, 'front')).to.equal('');
        expect('hello world'.jlib.ellipses(-10, 'front')).to.equal('');
        expect('hello world'.jlib.ellipses(0, 'front')).to.equal('');
    });

    it('It should allow for custom ellipses', function () {
        expect('hello world'.jlib.ellipses(3, 'front', '``')).to.equal('``h');
        expect('hello world'.jlib.ellipses(4, 'front', '``')).to.equal('``he');
        expect('hello world'.jlib.ellipses(5, 'front', '``')).to.equal('``hel');
        expect('hello world'.jlib.ellipses(6, 'front', '``')).to.equal('``hell');
        expect('hello world'.jlib.ellipses(9, 'front', '``')).to.equal('``hello w');
        expect('hello world'.jlib.ellipses(11, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(12, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(15, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(' ', 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(null, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(undefined, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses({}, 'front', '``')).to.equal('hello world');
        expect('hello world'.jlib.ellipses(-1, 'front', '``')).to.equal('');
        expect('hello world'.jlib.ellipses(-2, 'front', '``')).to.equal('');
        expect('hello world'.jlib.ellipses(-10, 'front', '``')).to.equal('');
        expect('hello world'.jlib.ellipses(0, 'front', '``')).to.equal('');
    });
});
