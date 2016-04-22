(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.ltrim', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should left trim whitespace', function () {
            expect('               hello world'._.ltrim()).to.equal('hello world');
            expect('\n          \n     hello world'._.ltrim()).to.equal('hello world');
            expect('               \nhello world'._.ltrim()).to.equal('hello world');
            expect('        \r\n       hello world'._.ltrim()).to.equal('hello world');
            expect('\ \ \ \            hello world'._.ltrim()).to.equal('hello world');
            expect('hello world'._.ltrim()).to.equal('hello world');
            expect('hello world   '._.ltrim()).to.equal('hello world   ');
            expect('hello world\n '._.ltrim()).to.equal('hello world\n ');
        });

        it('It should left trim using a custom delimiter', function () {
            expect('TRIM_MEhello world'._.ltrim('TRIM_ME')).to.equal('hello world');
            expect('TRIM_ME hello world'._.ltrim('(TRIM_ME| )')).to.equal(' hello world');
            expect('TRIM_ME hello world'._.ltrim('TRIM_ME ')).to.equal('hello world');
            expect('TRIM_ME hello world'._.ltrim(' TRIM_ME ')).to.equal('TRIM_ME hello world');
            expect('TRIM_ME hello world'._.ltrim('(TRIM_ME| )')).to.equal(' hello world');
            expect('TRIM_ME hello world'._.ltrim('\[TRIME_ \]+')).to.equal('hello world');
            expect('TRIM_ME hello world   '._.ltrim('\[TRIME_ \]+')).to.equal('hello world   ');
            expect('      hello world'._.ltrim(undefined)).to.equal('hello world');
            expect('      hello world'._.ltrim(null)).to.equal('hello world');
            expect('      hello world'._.ltrim(0)).to.equal('hello world');
            expect('      hello world'._.ltrim(12343)).to.equal('hello world');
            expect('      hello world'._.ltrim(function () {})).to.equal('hello world');
        });
    });
}());
