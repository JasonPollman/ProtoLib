(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.newlineToBreak', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should replace \\n (or \\r\\n) with <br>', function () {
            var s = 'this\nis\na\ntest';
            expect(s._.newlineToBreak()).to.equal('this<br>is<br>a<br>test');

            expect(''._.newlineToBreak()).to.equal('');
            expect('\n'._.newlineToBreak()).to.equal('<br>');
            expect('\r\n'._.newlineToBreak()).to.equal('<br>');
            expect('\n\n\r\n\n\n'._.newlineToBreak()).to.equal('<br><br><br><br><br>');
            expect('\n word \n'._.newlineToBreak()).to.equal('<br> word <br>');
        });
    });
}());
