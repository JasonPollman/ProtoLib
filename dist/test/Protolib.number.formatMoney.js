(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.number.formatMoney', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should format a number in the U.S. Dollar format by default', function () {
            expect((0)._.formatMoney()).to.equal('$0.00');
            expect((1)._.formatMoney()).to.equal('$1.00');
            expect((1.2345)._.formatMoney()).to.equal('$1.23');
            expect((100.199)._.formatMoney()).to.equal('$100.20');
            expect((1000)._.formatMoney()).to.equal('$1,000.00');
            expect((199999)._.formatMoney()).to.equal('$199,999.00');
            expect((1999999)._.formatMoney()).to.equal('$1,999,999.00');
            expect((1000000000)._.formatMoney()).to.equal('$1,000,000,000.00');
            expect((1000000000.00)._.formatMoney()).to.equal('$1,000,000,000.00');
            expect((1000000000.01)._.formatMoney()).to.equal('$1,000,000,000.01');
            expect((1000000000.99)._.formatMoney()).to.equal('$1,000,000,000.99');
            expect((1000000000.50)._.formatMoney()).to.equal('$1,000,000,000.50');

            expect((-1000000000.50)._.formatMoney()).to.equal('-$1,000,000,000.50');
            expect((-0.123)._.formatMoney()).to.equal('-$0.12');
            expect((-0.161)._.formatMoney()).to.equal('-$0.16');
            expect((-0.164)._.formatMoney()).to.equal('-$0.16');
            expect((-0.165)._.formatMoney()).to.equal('-$0.17');
            expect((-0.1655)._.formatMoney()).to.equal('-$0.17');
            expect((-0.00)._.formatMoney()).to.equal('$0.00');
            expect((-0.00001)._.formatMoney()).to.equal('$0.00');
            expect((-0.0000000001)._.formatMoney()).to.equal('$0.00');

            expect((-0.45)._.formatMoney()).to.equal('-$0.45');
            expect((0.45)._.formatMoney()).to.equal('$0.45');

            expect((-0.777)._.formatMoney()).to.equal('-$0.78');
            expect((0.777)._.formatMoney()).to.equal('$0.78');

            expect((999999999999999)._.formatMoney()).to.equal('$999,999,999,999,999.00');
            expect((-999999999999999)._.formatMoney()).to.equal('-$999,999,999,999,999.00');

            expect((1000)._.formatMoney()).to.equal('$1,000.00');
            expect((1234567.89)._.formatMoney()).to.equal('$1,234,567.89');
            expect((1000)._.formatMoney('£')).to.equal('£1,000.00');
            expect((1234567.89)._.formatMoney('£')).to.equal('£1,234,567.89');
        });

        it('It should format number into money format using a custom currency symbol', function () {
            expect((0)._.formatMoney('£')).to.equal('£0.00');
            expect((1)._.formatMoney('£')).to.equal('£1.00');
            expect((1.2345)._.formatMoney('£')).to.equal('£1.23');
            expect((100.199)._.formatMoney('£')).to.equal('£100.20');
            expect((1000)._.formatMoney('£')).to.equal('£1,000.00');
            expect((199999)._.formatMoney('£')).to.equal('£199,999.00');
            expect((1999999)._.formatMoney('£')).to.equal('£1,999,999.00');
            expect((1000000000)._.formatMoney('£')).to.equal('£1,000,000,000.00');
            expect((1000000000.00)._.formatMoney('£')).to.equal('£1,000,000,000.00');
            expect((1000000000.01)._.formatMoney('£')).to.equal('£1,000,000,000.01');
            expect((1000000000.99)._.formatMoney('£')).to.equal('£1,000,000,000.99');
            expect((1000000000.50)._.formatMoney('£')).to.equal('£1,000,000,000.50');

            expect((-1000000000.50)._.formatMoney('£')).to.equal('-£1,000,000,000.50');
            expect((-0.123)._.formatMoney('£')).to.equal('-£0.12');
            expect((-0.161)._.formatMoney('£')).to.equal('-£0.16');
            expect((-0.164)._.formatMoney('£')).to.equal('-£0.16');
            expect((-0.165)._.formatMoney('£')).to.equal('-£0.17');
            expect((-0.1655)._.formatMoney('£')).to.equal('-£0.17');
            expect((-0.00)._.formatMoney('£')).to.equal('£0.00');
            expect((-0.00001)._.formatMoney('£')).to.equal('£0.00');
            expect((-0.0000000001)._.formatMoney('£')).to.equal('£0.00');

            expect((-0.45)._.formatMoney('£')).to.equal('-£0.45');
            expect((0.45)._.formatMoney('£')).to.equal('£0.45');

            expect((-0.777)._.formatMoney('£')).to.equal('-£0.78');
            expect((0.777)._.formatMoney('£')).to.equal('£0.78');

            expect((999999999999999)._.formatMoney('£')).to.equal('£999,999,999,999,999.00');
            expect((-999999999999999)._.formatMoney('£')).to.equal('-£999,999,999,999,999.00');
        });
    });
}());
