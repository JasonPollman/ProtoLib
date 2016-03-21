'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Object#random', function () {
    before(function () {
        require(path.join(__dirname, '..'));
    });

    it('It should return a random character from a string', function () {
        expect('random'.random()).to.match(/[random]{1}/);
        expect(''.random()).to.equal('');
        expect('a'.random()).to.equal('a');
        expect('                              '.random()).to.equal(' ');
        expect('r   a   n   d   o   m'.random()).to.match(/[random ]{1}/);
    });

    it('It should return a random digit from a number', function () {
        expect((123456879).random()).to.match(/[1-9]{1}/).and.to.be.a('number');
        expect((1).random()).equal(1);
        expect((0).random()).equal(0);
        expect((-1).random()).equal(-1);
        expect((-123456789).random()).match(/-[1-9]{1}/).and.to.be.a('number');
    });

    it('It should return a random value from an array', function () {
        expect([1, 2, 3, 4, 5].random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect(['1', '2', '3', '4', '5'].random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect(['one', 'two', 'three'].random()).to.match(/(one|two|three)/).and.to.be.a('string');
        expect([1, 2, 3, 4, 5, 'hello', 'world'].random()).to.match(/[1-5]{1}|hello|world/);
    });

    it('It should return a random value from an object', function () {
        expect({ a: 1, b: 2, c: 3, d: 4, e: 5 }.random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect({ a: '1', b: '2', c: '3', d: '4', e: '5' }.random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect({ key: 'one', keyOne: 'two', keyTwo: 'three'}.random()).to.match(/(one|two|three)/).and.to.be.a('string');
    });
});
