(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.object.uniqueId', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should return a uniqueId for non-literals', function () {
            var ids = [];

            var obj = { foo: 'bar' };
            var id = (obj)._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ({})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ({})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ({})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ({})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ({})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = ([])._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = (function () {})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = (function () {})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = (function () {})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            id = (function () {})._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            var f = function () {};
            id = (f)._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            var nid = (f)._.uniqueId();
            expect(ids.indexOf(nid)).to.equal(ids.length - 1);

            var o = {};
            id = (o)._.uniqueId();
            expect(id).to.be.a('string');
            expect(ids.indexOf(id)).to.equal(-1);
            ids.push(id);

            nid = (o)._.uniqueId();
            expect(ids.indexOf(nid)).to.equal(ids.length - 1);
            expect(ids.indexOf(obj._.uniqueId())).to.equal(0);

            expect((4)._.uniqueId).to.throw(Error);
            expect(('string')._.uniqueId).to.throw(Error);
            expect(({})._.uniqueId).to.not.throw(Error);
        });
    });
}());
