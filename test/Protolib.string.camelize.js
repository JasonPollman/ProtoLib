(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.camelize', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should camelize strings as expected', function () {
            expect('string'._.camelize()).to.equal('string');
            expect('string_two'._.camelize()).to.equal('stringTwo');
            expect('string three'._.camelize()).to.equal('stringThree');
            expect('string***four'._.camelize()).to.equal('stringFour');
            expect('one two three'._.camelize()).to.equal('oneTwoThree');
            expect('one_two three'._.camelize()).to.equal('oneTwoThree');
            expect('String'._.camelize()).to.equal('string');
            expect(''._.camelize()).to.equal('');
            expect('oneTwoThree'._.camelize()).to.equal('oneTwoThree');
            expect('***oneTwoThree***fourFiveSix'._.camelize()).to.equal('oneTwoThreeFourFiveSix');
            expect('A_B_C_D_E'._.camelize()).to.equal('aBCDE');
            expect('a_b_c_d_e'._.camelize()).to.equal('aBCDE');
            expect('$_a_b_c_d_e'._.camelize()).to.equal('$ABCDE');
            expect('$a_b_c_d_e'._.camelize()).to.equal('$ABCDE');
            expect('$ a b c d_e'._.camelize()).to.equal('$ABCDE');
            expect('$a b c d_e'._.camelize()).to.equal('$ABCDE');
            expect('hello $ world $'._.camelize()).to.equal('hello$World$');
            expect('   hello              world $ '._.camelize()).to.equal('helloWorld$');
            expect('_   _   _   _   ______________ '._.camelize()).to.equal('');
            expect('h'._.camelize()).to.equal('h');
            expect('        h'._.camelize()).to.equal('h');
            expect('h         '._.camelize()).to.equal('h');
            expect('  _ $$$  '._.camelize()).to.equal('$$$');
            expect('  _ $$$hello   world '._.camelize()).to.equal('$$$HelloWorld');
        });

        it('It should camelize strings as expected (statically, using arguments)', function () {
            expect(lib.string.camelize('one two three', null)).to.eql(['oneTwoThree', null]);
            expect(lib.string.camelize('one two three', null, undefined, 1234)).to.eql(['oneTwoThree', null, undefined, '1234']);
            expect(lib.string.camelize('one two three', null, undefined, 1234, function this_function () {})).to.eql(['oneTwoThree', null, undefined, '1234', 'functionThisFunction']);
        });
    });
}());
