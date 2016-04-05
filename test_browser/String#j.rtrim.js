'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.rtrim', function () {

    before(function () {
        require(path.join(__dirname, '..'))('j');
    });

    it('It should right trim whitespace', function () {
        expect('hello world               '.j.rtrim()).to.equal('hello world');
        expect('hello world\n          \n     '.j.rtrim()).to.equal('hello world');
        expect('hello world               \n'.j.rtrim()).to.equal('hello world');
        expect('hello world        \r\n       '.j.rtrim()).to.equal('hello world');
        expect('hello world\ \ \ \            '.j.rtrim()).to.equal('hello world');
        expect('hello world'.j.rtrim()).to.equal('hello world');
    });

    it('It should right trim using a custom delimiter', function () {
        expect('hello worldTRIM_ME'.j.rtrim('TRIM_ME')).to.equal('hello world');
        expect('hello world TRIM_ME'.j.rtrim('(TRIM_ME| )')).to.equal('hello world ');
        expect('hello world TRIM_ME'.j.rtrim(' TRIM_ME')).to.equal('hello world');
        expect('hello world TRIM_ME'.j.rtrim(' TRIM_ME ')).to.equal('hello world TRIM_ME');
        expect('hello world TRIM_ME '.j.rtrim('(TRIM_ME| )')).to.equal('hello world TRIM_ME');
        expect('hello world TRIM_ME'.j.rtrim('\[TRIME_ \]+')).to.equal('hello world');
        expect('hello world      '.j.rtrim(undefined)).to.equal('hello world');
        expect('hello world      '.j.rtrim(null)).to.equal('hello world');
        expect('hello world      '.j.rtrim(0)).to.equal('hello world');
        expect('hello world      '.j.rtrim(12343)).to.equal('hello world');
        expect('hello world      '.j.rtrim(function () {})).to.equal('hello world');
    });
});
