(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.array.intersect', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should compute the intersection of the given arrays', function () {
            expect([1, 2, 3, 4]._.intersect()).to.eql([1, 2, 3, 4]);

            expect([1, 2, 3, 4]._.intersect([1, 2, 3])).to.eql([1, 2, 3]);
            expect([1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 3])).to.eql([1, 2, 2, 3]);
            expect([1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 2, 2, 2, 3])).to.eql([1, 2, 2, 2, 3]);
            expect([1, 1, 1, 1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 2, 2, 2, 3])).to.eql([1, 2, 2, 2, 3]);
            expect([1, 1, 1, 1, 2, 2, 2, 3, 4]._.intersect([1, 1, 2, 2, 2, 2, 2, 3])).to.eql([1, 1, 2, 2, 2, 3]);

            expect([1, 2, 3]._.intersect([1, 2, 3], [1, 2, 3])).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3], [1, 2, 3])).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3, 4], [1, 2, 3])).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3, 4], [1, 2, 3, 4])).to.eql([1, 2, 3, 4]);

            var obj = {};
            expect(['a', 2, obj, 4]._.intersect()).to.eql(['a', 2, obj, 4]);

            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj])).to.eql(['a', 2, obj]);
            expect(['a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, obj])).to.eql(['a', 2, 2, obj]);
            expect(['a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, 2, 2, 2, obj])).to.eql(['a', 2, 2, 2, obj]);
            expect(['a', 'a', 'a', 'a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, 2, 2, 2, obj])).to.eql(['a', 2, 2, 2, obj]);
            expect(['a', 'a', 'a', 'a', 2, 2, 2, obj, 4]._.intersect(['a', 'a', 2, 2, 2, 2, 2, obj])).to.eql(['a', 'a', 2, 2, 2, obj]);

            expect(['a', 2, obj]._.intersect(['a', 2, obj], ['a', 2, obj])).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj], ['a', 2, obj])).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj, 4], ['a', 2, obj])).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj, 4], ['a', 2, obj, 4])).to.eql(['a', 2, obj, 4]);

            expect(['a', {}, obj, 4]._.intersect()).to.eql(['a', {}, obj, 4]);

            expect(['a', {}, obj, 4]._.intersect(['a', {}, obj])).to.eql(['a', obj]);
            expect(['a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, obj])).to.eql(['a', obj]);
            expect(['a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, {}, {}, {}, obj])).to.eql(['a', obj]);
            expect(['a', 'a', 'a', 'a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, {}, {}, {}, obj])).to.eql(['a', obj]);
            expect(['a', 'a', 'a', 'a', {}, {}, {}, obj, 4]._.intersect(['a', 'a', {}, {}, {}, {}, {}, obj])).to.eql(['a', 'a', obj]);

            expect(['a', {}, obj]._.intersect(['a', {}, obj], ['a', {}, obj])).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(['a', {}, obj], ['a', {}, obj])).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(['a', {}, obj, 4], ['a', {}, obj])).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(['a', {}, obj, 4], ['a', {}, obj, 4])).to.eql(['a', obj, 4]);
        });

        it('It should ignore non-array arguments', function () {
            expect([1, 2, 3, 4]._.intersect(1, null, {})).to.eql([1, 2, 3, 4]);

            expect([1, 2, 3, 4]._.intersect([1, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 3]);
            expect([1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 2, 3]);
            expect([1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 2, 2, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 2, 2, 3]);
            expect([1, 1, 1, 1, 2, 2, 2, 3, 4]._.intersect([1, 2, 2, 2, 2, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 2, 2, 3]);
            expect([1, 1, 1, 1, 2, 2, 2, 3, 4]._.intersect([1, 1, 2, 2, 2, 2, 2, 3], 1, null, 'a', {})).to.eql([1, 1, 2, 2, 2, 3]);

            expect([1, 2, 3]._.intersect([1, 2, 3], [1, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3], [1, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3, 4], [1, 2, 3], 1, null, 'a', {})).to.eql([1, 2, 3]);
            expect([1, 2, 3, 4]._.intersect([1, 2, 3, 4], [1, 2, 3, 4], 1, null, 'a', {})).to.eql([1, 2, 3, 4]);

            var obj = {};
            expect(['a', 2, obj, 4]._.intersect(1, null, 'a', {})).to.eql(['a', 2, obj, 4]);

            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj], 1, null, 'a', {})).to.eql(['a', 2, obj]);
            expect(['a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, obj], 1, null, 'a', {})).to.eql(['a', 2, 2, obj]);
            expect(['a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, 2, 2, 2, obj], 1, null, 'a', {})).to.eql(['a', 2, 2, 2, obj]);
            expect(['a', 'a', 'a', 'a', 2, 2, 2, obj, 4]._.intersect(['a', 2, 2, 2, 2, 2, obj], 1, null, 'a', {})).to.eql(['a', 2, 2, 2, obj]);
            expect(['a', 'a', 'a', 'a', 2, 2, 2, obj, 4]._.intersect(['a', 'a', 2, 2, 2, 2, 2, obj], 1, null, 'a', {})).to.eql(['a', 'a', 2, 2, 2, obj]);

            expect(['a', 2, obj]._.intersect(['a', 2, obj], ['a', 2, obj], 1, null, 'a', {})).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj], ['a', 2, obj], 1, null, 'a', {})).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj, 4], ['a', 2, obj], 1, null, 'a', {})).to.eql(['a', 2, obj]);
            expect(['a', 2, obj, 4]._.intersect(['a', 2, obj, 4], ['a', 2, obj, 4], 1, null, 'a', {})).to.eql(['a', 2, obj, 4]);

            expect(['a', {}, obj, 4]._.intersect(1, null, 'a', {})).to.eql(['a', {}, obj, 4]);

            expect(['a', {}, obj, 4]._.intersect(['a', {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, {}, {}, {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', 'a', 'a', 'a', {}, {}, {}, obj, 4]._.intersect(['a', {}, {}, {}, {}, {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', 'a', 'a', 'a', {}, {}, {}, obj, 4]._.intersect(['a', 'a', {}, {}, {}, {}, {}, obj], 1, null, 'a', {})).to.eql(['a', 'a', obj]);

            expect(['a', {}, obj]._.intersect(function () {}, ['a', {}, obj], ['a', {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(function () {}, ['a', {}, obj], ['a', {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(function () {}, ['a', {}, obj, 4], ['a', {}, obj], 1, null, 'a', {})).to.eql(['a', obj]);
            expect(['a', {}, obj, 4]._.intersect(function () {}, ['a', {}, obj, 4], ['a', {}, obj, 4], 1, null, 'a', {})).to.eql(['a', obj, 4]);
        });
    });
}());
