(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.destroy', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = (require('../')).get('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should remove the handle from Object.prototype and free the ProtoLib instance for garbage collection', function () {
            var ProtoLib = typeof window === 'object' && window.ProtoLib ? window.ProtoLib : require('../');
            var lib2 = ProtoLib.get('_');

            expect(lib2).to.equal(lib);
            expect(ProtoLib.destroy('_')).to.equal(ProtoLib);

            expect((5)._).to.be.an('undefined');
            expect('string'._).to.be.an('undefined');

            var lib3 = ProtoLib.get('_');
            expect(lib3).to.not.equal(lib);
            expect(lib3).to.not.equal(lib2);

            expect((5)._).to.be.an('object');
            expect('string'._).to.be.an('object');

            expect((5)._.choose).to.be.a('function');
            expect('string'._.reverse).to.be.a('function');
        });
    });
}());
