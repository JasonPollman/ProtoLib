'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('Protolib.object.random', function () {
    before(function () {
        new (require(path.join(__dirname, '..')))('_');
    });

    it('It should return a random character from a string', function () {
        expect('random'._.random()).to.match(/[random]{1}/);
        expect(''._.random()).to.equal('');
        expect('a'._.random()).to.equal('a');
        expect('                              '._.random()).to.equal(' ');
        expect('r   a   n   d   o   m'._.random()).to.match(/[random ]{1}/);
    });

    it('It should return a random digit from a number', function () {
        expect((123456879)._.random()).to.match(/[1-9]{1}/).and.to.be.a('number');
        expect((1)._.random()).equal(1);
        expect((0)._.random()).equal(0);
        expect((-1)._.random()).equal(-1);
        expect((-123456789)._.random()).match(/-[1-9]{1}/).and.to.be.a('number');
    });

    it('It should return a random value from an array', function () {
        expect([1, 2, 3, 4, 5]._.random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect(['1', '2', '3', '4', '5']._.random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect(['one', 'two', 'three']._.random()).to.match(/(one|two|three)/).and.to.be.a('string');
        expect([1, 2, 3, 4, 5, 'hello', 'world']._.random()).to.match(/[1-5]{1}|hello|world/);
    });

    it('It should return a random value from an object', function () {
        expect({ a: 1, b: 2, c: 3, d: 4, e: 5 }._.random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect({ a: '1', b: '2', c: '3', d: '4', e: '5' }._.random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect({ key: 'one', keyOne: 'two', keyTwo: 'three'}._.random()).to.match(/(one|two|three)/).and.to.be.a('string');
    });
});
