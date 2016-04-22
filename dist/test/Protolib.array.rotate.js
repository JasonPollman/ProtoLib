(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.rotate', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should rotate arrays left/right based on the first argument', function () {
            expect([1, 2, 3, 4]._.rotate('left', 1)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate('left', 2)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate('left', 3)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate('left', 4)).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.rotate('left', 5)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate('left', 6)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate('left', 7)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate('left', 8)).to.eql([1, 2, 3, 4]);

            expect([1, 2, 3, 4]._.rotate('right', 1)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate('right', 2)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate('right', 3)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate('right', 4)).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.rotate('right', 5)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate('right', 6)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate('right', 7)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate('right', 8)).to.eql([1, 2, 3, 4]);
        });

        it('It should default to rotate left if no string argument is passed in first', function () {
            expect([1, 2, 3, 4]._.rotate(1)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate(2)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate(3)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate(4)).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.rotate(5)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotate(6)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotate(7)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotate(8)).to.eql([1, 2, 3, 4]);
        });

        it('It should rotate left when using Protolib.array.rotateLeft', function () {
            expect([1, 2, 3, 4]._.rotateLeft(1)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotateLeft(2)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotateLeft(3)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotateLeft(4)).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.rotateLeft(5)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotateLeft(6)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotateLeft(7)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotateLeft(8)).to.eql([1, 2, 3, 4]);
        });

        it('It should rotate right when using Protolib.array.rotateRight', function () {
            expect([1, 2, 3, 4]._.rotateRight(1)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotateRight(2)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotateRight(3)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotateRight(4)).to.eql([1, 2, 3, 4]);
            expect([1, 2, 3, 4]._.rotateRight(5)).to.eql([4, 1, 2, 3]);
            expect([1, 2, 3, 4]._.rotateRight(6)).to.eql([3, 4, 1, 2]);
            expect([1, 2, 3, 4]._.rotateRight(7)).to.eql([2, 3, 4, 1]);
            expect([1, 2, 3, 4]._.rotateRight(8)).to.eql([1, 2, 3, 4]);
        });
    });
}());
