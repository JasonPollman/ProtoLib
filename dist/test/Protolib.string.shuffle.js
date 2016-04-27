(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.shuffle', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should shuffle strings', function () {
            expect('hello world'._.shuffle(' ')).to.match(/(^hello world$|^world hello$|^ helloworld$|^worldhello $|^ worldhello$|^helloworld $)/);
            expect('hello world'._.shuffle('hello ')).to.match(/^hello world$|^worldhello $/);

            expect('aaaaaa'._.shuffle()).to.equal('aaaaaa');
            expect('a a a a a a '._.shuffle('a ')).to.equal('a a a a a a ');
        });
    });

}());
