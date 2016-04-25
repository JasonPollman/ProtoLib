(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('ProtoLib.object.every', function () {

        // Create some test data
        var obj = {
                foo      : 'bar',
                numeric  : 1,
                bool     : false,
                nan      : NaN,
                zero     : 0,
                negative : -1,
                obj      : { foo: 'bar' },
                self     : null,
                array    : [1, 2, 3, 4],
                func     : function () {
                    console.log('HELLO WORLD');
                }
            };

            obj.self = obj;
            var arr = ['bar', 1, false, NaN, 0, -1, { foo: 'bar' }, obj, [1, 2, 3, 4], function () { console.log('HELLO WORLD'); }];

        arr.push(arr);
        obj.arr = arr;

        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should iterate over objects and arrays as exprected', function () {
            expect(Object._.every).to.be.an.instanceof(Function);
            var isArr, currentObj;

            var everyCallback = function (value, key, iteration) {
                expect(this).to.equal(currentObj);

                switch(iteration) {
                    case 0:
                        if(!isArr) expect(key).to.equal('foo');
                        expect(value).to.equal('bar');
                        break;

                    case 1:
                        if(!isArr) expect(key).to.equal('numeric');
                        expect(value).to.equal(1);
                        break;

                    case 2:
                        if(!isArr) expect(key).to.equal('bool');
                        expect(value).to.equal(false);
                        break;

                    case 3:
                        if(!isArr) expect(key).to.equal('nan');
                        expect(value).to.not.be.a('NaN');
                        break;

                    case 4:
                        if(!isArr) expect(key).to.equal('zero');
                        expect(value).to.equal(0);
                        break;

                    case 5:
                        if(!isArr) expect(key).to.equal('negative');
                        expect(value).to.equal(-1);
                        break;

                    case 6:
                        if(!isArr) expect(key).to.equal('obj');
                        expect(value).to.have.keys(['foo']);
                        break;

                    case 7:
                        if(!isArr) expect(key).to.equal('self');
                        expect(value).to.equal(obj);
                        break;

                    case 8:
                        if(!isArr) expect(key).to.equal('array');
                        expect(value).to.an.instanceof(Array);
                        expect(value.length).to.equal(4);

                        var i = 0;
                        value._.every(function (val, key, iteration) {
                            expect(this).to.an.instanceof(Array);
                            expect(this.length).to.equal(4);
                            expect(val === i && i === iteration && iteration === key);
                        });
                        break;

                    case 9:
                        if(!isArr) expect(key).to.equal('func');
                        expect(value).to.an.instanceof(Function);
                        break;
                }
            };

            isArr = false; currentObj = obj;
            obj._.every(everyCallback);

            isArr = true; currentObj = arr;
            arr._.every(everyCallback);

            var nobj = { a: 1, b: 2, c: 3 },
                keys = [],
                vals = [];

            nobj._.every((val, key) => {
                vals.push(val);
                keys.push(key);
            });
            expect(vals).to.eql([1, 2, 3]);
            expect(keys).to.eql(['a', 'b', 'c']);

            var didLoopThroughAllItems = nobj._.every((val) => {
                if(val === 3) return false;
            });
            expect(didLoopThroughAllItems).to.equal(false);

            didLoopThroughAllItems = nobj._.every((val) => {
                if(val === 999) return false;
            });
            expect(didLoopThroughAllItems).to.equal(true);
        });

        it('It should break when the provided callback returns false', function () {
            expect(Object._.every).to.be.an.instanceof(Function);

            var i = 0;
            var res = [0, 1, 2, 3, 4, 5]._.every(function (value) {
                expect(i++).to.equal(value);
                if(i === 2) return false;
            });

            expect(res).to.equal(false);
        });

        it('It should iterate over strings as expected', function () {
            expect(Object._.every).to.be.an.instanceof(Function);
            var string = 'somereallyreallyreallylongstring';

            string._.every(function (char) {
                expect(this).to.equal('somereallyreallyreallylongstring');
                expect(char).to.be.a('string');
                expect(char).to.have.length(1);
            });

            var character;
            string._.every(function (char, k, i) {
                expect(this).to.equal('somereallyreallyreallylongstring');
                expect(char).to.be.a('string');
                expect(char).to.have.length(1);
                if(i === 9) {
                    character = char;
                    return false;
                }
            });
        });

        it('It should iterate over numbers as expected', function () {
            expect(Object._.every).to.be.an.instanceof(Function);
            var numbers = [
                    1235435234,
                    123123.123,
                    123e2,
                    0x00234,
                    0,
                    -123,
                    -123e56,
                    -11234.123123
                ],
                currentNumber;

            var numberCallback = function (digit, k, i) {
                expect(this).to.equal(currentNumber);
                if(digit !== '.' && digit !== '-' && digit !== 'e' && digit !== '+') {
                    expect(digit).to.be.a('number');
                    expect(digit).lt(10);
                    expect(digit).gte(0);
                }
                else if(this < 0 && i === 0) {
                    expect(digit).to.equal('-');
                }
            };

            for(var i = 0; i < 8; i++) {
                currentNumber = numbers[i];
                currentNumber._.every(numberCallback);
            }
        });

        it('It should iterate over functions as if they were strings', function () {
            expect(Object._.every).to.be.an.instanceof(Function);

            var func = function () { console.log('HELLO WORLD'); };
            func._.every(function (char, k, i) {
                expect(this).to.equal(func);
                expect(char).to.be.a('string');
                switch(i) {
                    case 0:
                        expect(char).to.equal('f');
                        break;

                    case 1:
                        expect(char).to.equal('u');
                        break;

                    case 2:
                        expect(char).to.equal('n');
                        break;

                    case 3:
                        expect(char).to.equal('c');
                        break;

                    case 4:
                        expect(char).to.equal('t');
                        break;

                    case 27:
                        expect(char).to.equal('H');
                        break;

                    case 33:
                        expect(char).to.equal('W');
                        break;
                }
            });
        });

        it('It should iterate over booleans as if they were strings', function () {
            expect(Object._.every).to.be.an.instanceof(Function);

            true._.every(function (char, k, i) {
                expect(this).to.equal(true);
                expect(char).to.be.a('string');
                switch(i) {
                    case 0:
                        expect(char).to.equal('t');
                        break;

                    case 1:
                        expect(char).to.equal('r');
                        break;

                    case 2:
                        expect(char).to.equal('u');
                        break;

                    case 3:
                        expect(char).to.equal('e');
                        break;
                }
            });

            false._.every(function (char, k, i) {
                expect(this).to.equal(false);
                expect(char).to.be.a('string');
                switch(i) {
                    case 0:
                        expect(k == i && i === 0).to.be.true; // jshint ignore:line
                        expect(char).to.equal('f');
                        break;

                    case 1:
                        expect(k == i && i === 1).to.be.true; // jshint ignore:line
                        expect(char).to.equal('a');
                        break;

                    case 2:
                        expect(char).to.equal('l');
                        break;

                    case 3:
                        expect(char).to.equal('s');
                        break;

                    case 4:
                        expect(char).to.equal('e');
                        break;
                }
            });
        });
    });
}());
