(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.rtrim', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should right trim whitespace', function () {
            expect('hello world               '._.rtrim()).to.equal('hello world');
            expect('hello world\n          \n     '._.rtrim()).to.equal('hello world');
            expect('hello world               \n'._.rtrim()).to.equal('hello world');
            expect('hello world        \r\n       '._.rtrim()).to.equal('hello world');
            expect('hello world\ \ \ \            '._.rtrim()).to.equal('hello world');
            expect('hello world'._.rtrim()).to.equal('hello world');
        });

        it('It should right trim using a custom delimiter', function () {
            expect('hello worldTRIM_ME'._.rtrim('TRIM_ME')).to.equal('hello world');
            expect('hello world TRIM_ME'._.rtrim('(TRIM_ME| )')).to.equal('hello world ');
            expect('hello world TRIM_ME'._.rtrim(' TRIM_ME')).to.equal('hello world');
            expect('hello world TRIM_ME'._.rtrim(' TRIM_ME ')).to.equal('hello world TRIM_ME');
            expect('hello world TRIM_ME '._.rtrim('(TRIM_ME| )')).to.equal('hello world TRIM_ME');
            expect('hello world TRIM_ME'._.rtrim('\[TRIME_ \]+')).to.equal('hello world');
            expect('hello world      '._.rtrim(undefined)).to.equal('hello world');
            expect('hello world      '._.rtrim(null)).to.equal('hello world');
            expect('hello world      '._.rtrim(0)).to.equal('hello world');
            expect('hello world      '._.rtrim(12343)).to.equal('hello world');
            expect('hello world      '._.rtrim(function () {})).to.equal('hello world');
        });
    });
}());
