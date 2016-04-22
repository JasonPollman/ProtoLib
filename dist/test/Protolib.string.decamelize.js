(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.decamelize', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should decamelize strings as expected', function () {
            expect('helloWorld'._.decamelize()).to.equal('hello world');
            expect('oneTwoThree'._.decamelize()).to.equal('one two three');
            expect('   helloWorld   '._.decamelize()).to.equal('hello world');
            expect('$$$ helloWorld$$$'._.decamelize()).to.equal('$ $ $ hello world $ $ $');
            expect(' $$$ helloWorld$$$'._.decamelize()).to.equal('$ $ $ hello world $ $ $');
            expect(' one two three '._.decamelize()).to.equal('one two three');
        });

        it('It should decamelize strings as expected (statically, using arguments)', function () {
            expect(lib.string.decamelize('oneTwoThree', null)).to.eql(['one two three', null]);
            expect(lib.string.decamelize('oneTwoThree', null, undefined, 1234)).to.eql(['one two three', null, undefined, '1234']);
            expect(lib.string.decamelize('oneTwoThree', null, undefined, 1234, function this_function () {})).to.eql(['one two three', null, undefined, '1234', 'function this_function() {}']);
            expect(lib.string.decamelize('oneTwoThree', null, undefined, 1234, function thisFunction () {})).to.eql(['one two three', null, undefined, '1234', 'function this function() {}']);
        });
    });
}());
