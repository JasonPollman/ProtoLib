'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Array#without', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should create a new array with all occurences of the given arguments removed', function () {
        expect([1, 2, 3, 4].jlib.without(1)).eql([2, 3, 4]);
        expect([1, 2, 3, 4].jlib.without(1, 2)).eql([3, 4]);
        expect([1, 2, 3, 4].jlib.without(1, 2, 3)).eql([4]);
        expect([1, 2, 3, 4].jlib.without(1, 2, 3, 4)).eql([]);

        expect([0, 1, 2, 3, 4].jlib.without(1)).eql([0, 2, 3, 4]);
        expect([0, 1, 2, 3, 4].jlib.without(1, 2)).eql([0, 3, 4]);
        expect([0, 1, 2, 3, 4].jlib.without(1, 2, 3)).eql([0, 4]);
        expect([0, 1, 2, 3, 4].jlib.without(1, 2, 3, 4)).eql([0]);

        expect([0, 1, 2, 3, 4].jlib.without(0, 1)).eql([2, 3, 4]);
        expect([0, 1, 2, 3, 4].jlib.without(0, 1, 2)).eql([3, 4]);
        expect([0, 1, 2, 3, 4].jlib.without(0, 1, 2, 3)).eql([4]);
        expect([0, 1, 2, 3, 4].jlib.without(0, 1, 2, 3, 4)).eql([]);

        expect(['a', 'b', '', '', 'c', '', 'd'].jlib.without('')).eql(['a', 'b', 'c', 'd']);

        expect([1, 2, 3, 4].jlib.without('1')).eql([1, 2, 3, 4]);

        expect([1, null, null, null, 2, 3, 'a', 'b'].jlib.without(null)).eql([1, 2, 3, 'a', 'b']);
        expect([1, null, null, null, 2, 3, 'a', 'b'].jlib.without(null)).not.eql([3, 2, 1, 'a', 'b']);

        expect([1, null, undefined, null, null, 2, 3, 'a', 'b'].jlib.without(null)).not.eql([3, 2, 1, 'a', 'b']);
        expect([1, undefined, null, null, null, 2, 3, 'a', 'b'].jlib.without(null)).not.eql([3, 2, 1, 'a', 'b']);

        expect([].jlib.without()).to.eql([]);
        expect([undefined].jlib.without()).to.eql([undefined]);
        expect([undefined].jlib.without(undefined)).to.eql([]);
        expect([undefined].jlib.without(null)).to.eql([undefined]);
        expect([null].jlib.without(undefined)).to.eql([null]);

        expect([1, null, 2, null, undefined].jlib.without(null, undefined)).to.eql([1, 2]);
    });
});
