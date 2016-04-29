(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.tabsToSpan', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should replace \\t with <span class="tab"></span>', function () {
            var s = 'this\tis\ta\ttest';
            expect(s._.tabsToSpan()).to.equal('this<span class="tab"></span>is<span class="tab"></span>a<span class="tab"></span>test');

            expect(''._.tabsToSpan()).to.equal('');
            expect('\t'._.tabsToSpan()).to.equal('<span class="tab"></span>');
            expect('\t\t\t'._.tabsToSpan()).to.equal('<span class="tab"></span><span class="tab"></span><span class="tab"></span>');
            expect('\t word \t'._.tabsToSpan()).to.equal('<span class="tab"></span> word <span class="tab"></span>');
        });
    });
}());
