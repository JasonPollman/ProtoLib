(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.setHandle', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = (require('../')).get('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should allow the user to modify the ProtoLib instance\'s handle', function () {
            expect('test'._.reverse()).to.equal('tset');
            lib.setHandle('pl');
            expect('test'._).to.be.an('undefined');
            expect('test'.pl).to.be.an('object');
            expect('test'.pl.reverse).to.be.a('function');
            expect('test'.pl.reverse()).to.equal('tset');
            lib.setHandle('lib');
            expect('test'._).to.be.an('undefined');
            expect('test'.pl).to.be.an('undefined');
            expect('test'.lib).to.be.an('object');
            expect('test'.lib.reverse).to.be.a('function');
            expect('test'.lib.reverse()).to.equal('tset');
            lib.setHandle('_');
            expect('test'._).to.be.an('object');
            expect('test'.pl).to.be.an('undefined');
            expect('test'.lib).to.be.an('undefined');
            expect('test'._.reverse).to.be.a('function');
            expect('test'._.reverse()).to.equal('tset');
        });
    });
}());
