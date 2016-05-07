(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.withPlaceholders', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should add commas to numeric values', function () {
            expect((0)._.withPlaceholders()).to.equal('0');
            expect((1)._.withPlaceholders()).to.equal('1');
            expect((1.2345)._.withPlaceholders()).to.equal('1.2345');
            expect((100.199)._.withPlaceholders()).to.equal('100.199');
            expect((1000)._.withPlaceholders()).to.equal('1,000');
            expect((199999)._.withPlaceholders()).to.equal('199,999');
            expect((1999999)._.withPlaceholders()).to.equal('1,999,999');
            expect((1000000000)._.withPlaceholders()).to.equal('1,000,000,000');
            expect((1000000000.00)._.withPlaceholders()).to.equal('1,000,000,000');
            expect((1000000000.01)._.withPlaceholders()).to.equal('1,000,000,000.01');
            expect((1000000000.99)._.withPlaceholders()).to.equal('1,000,000,000.99');
            expect((1000000000.50)._.withPlaceholders()).to.equal('1,000,000,000.5');

            expect((-1000000000.50)._.withPlaceholders()).to.equal('-1,000,000,000.5');
            expect((-0.123)._.withPlaceholders()).to.equal('-0.123');
            expect((-0.161)._.withPlaceholders()).to.equal('-0.161');
            expect((-0.164)._.withPlaceholders()).to.equal('-0.164');
            expect((-0.165)._.withPlaceholders()).to.equal('-0.165');
            expect((-0.1655)._.withPlaceholders()).to.equal('-0.1655');
            expect((-0.00)._.withPlaceholders()).to.equal('0');
            expect((-0.00001)._.withPlaceholders()).to.equal('-0.00001');
            expect((-0.000001)._.withPlaceholders()).to.equal('-0.000001');

            expect((-0.45)._.withPlaceholders()).to.equal('-0.45');
            expect((0.45)._.withPlaceholders()).to.equal('0.45');

            expect((-0.777)._.withPlaceholders()).to.equal('-0.777');
            expect((0.777)._.withPlaceholders()).to.equal('0.777');

            expect((777777777)._.withPlaceholders()).to.equal('777,777,777');

            expect((999999999999999)._.withPlaceholders()).to.equal('999,999,999,999,999');
            expect((-999999999999999)._.withPlaceholders()).to.equal('-999,999,999,999,999');

            expect((1000)._.withPlaceholders()).to.equal('1,000');
            expect((1234567.89)._.withPlaceholders()).to.equal('1,234,567.89');
            expect((1234567.8912)._.withPlaceholders()).to.equal('1,234,567.8912');
        });
    });
}());
