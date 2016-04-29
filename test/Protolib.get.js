(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.get', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = (require('../')).get('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should re-use ProtoLib instances based on the handle', function () {
            var ProtoLib = typeof window === 'object' && window.ProtoLib ? window.ProtoLib : require('../');
            var lib2 = ProtoLib.get('_'),
                lib3 = ProtoLib.get('dot'),
                lib4 = ProtoLib.get('.');

            expect(lib2).to.equal(lib);
            expect(lib3).to.not.equal(lib);
            expect(lib4).to.not.equal(lib);

            expect('string'.dot.reverse()).to.equal('gnirts');
            expect('string'._.reverse()).to.equal('gnirts');
            expect('string'['.'].reverse()).to.equal('gnirts');
        });
    });
}());
