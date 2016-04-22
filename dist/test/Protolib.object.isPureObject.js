(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.isPureObject', function () {

        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        it('It should return true if and only if all arguments are objects (and not arrays)', function () {
            expect(lib.object.isPureObject({})).to.equal(true);
            expect(lib.object.isPureObject({}, {})).to.equal(true);
            expect(lib.object.isPureObject({}, {}, {})).to.equal(true);
            expect(lib.object.isPureObject({}, { foo: 'bar' }, { foo: 'bar' }, {})).to.equal(true);
            expect(lib.object.isPureObject({}, [1], [1,2,3], ['a', 1, {}])).to.equal(false);
            expect(lib.object.isPureObject()).to.equal(true);

            expect(lib.object.isPureObject(5)).to.equal(false);
            expect(lib.object.isPureObject('')).to.equal(false);
            expect(lib.object.isPureObject('string')).to.equal(false);
            expect(lib.object.isPureObject(function () {})).to.equal(false);
            expect(lib.object.isPureObject({})).to.equal(true);

            expect(lib.object.isPureObject({}, 5)).to.equal(false);
            expect(lib.object.isPureObject({}, '')).to.equal(false);
            expect(lib.object.isPureObject({}, 'string')).to.equal(false);
            expect(lib.object.isPureObject({}, function () {})).to.equal(false);
            expect(lib.object.isPureObject({}, {})).to.equal(true);

            expect(lib.object.isPureObject({}, {}, 5)).to.equal(false);
            expect(lib.object.isPureObject({}, {}, '')).to.equal(false);
            expect(lib.object.isPureObject({}, {}, 'string')).to.equal(false);
            expect(lib.object.isPureObject({}, {}, function () {})).to.equal(false);
            expect(lib.object.isPureObject({}, {}, [])).to.equal(false);

            expect(lib.object.isPureObject({}, {}, 5, true)).to.equal(false);
            expect(lib.object.isPureObject({}, {}, '', {})).to.equal(false);
            expect(lib.object.isPureObject({}, {}, 'string', true)).to.equal(false);
            expect(lib.object.isPureObject({}, {}, function () {}, true)).to.equal(false);
            expect(lib.object.isPureObject({}, {}, {}, true)).to.equal(false);

            expect((5)._.isPureObject()).to.equal(false);
            expect(('string')._.isPureObject()).to.equal(false);
            expect(([])._.isPureObject()).to.equal(false);
            expect(({})._.isPureObject()).to.equal(true);
            expect(true._.isPureObject()).to.equal(false);
            expect(false._.isPureObject()).to.equal(false);
        });
    });

}());
