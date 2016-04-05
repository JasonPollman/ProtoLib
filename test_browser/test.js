'use strict';

var expect = chai.expect;
describe('Array#j.without', function () {
    it('It should create a new array with all occurences of the given arguments removed', function () {
        expect([1, 2, 3, 4].j.without(1)).eql([2, 3, 4]);
        expect([1, 2, 3, 4].j.without(1, 2)).eql([3, 4]);
        expect([1, 2, 3, 4].j.without(1, 2, 3)).eql([4]);
        expect([1, 2, 3, 4].j.without(1, 2, 3, 4)).eql([]);

        expect([0, 1, 2, 3, 4].j.without(1)).eql([0, 2, 3, 4]);
        expect([0, 1, 2, 3, 4].j.without(1, 2)).eql([0, 3, 4]);
        expect([0, 1, 2, 3, 4].j.without(1, 2, 3)).eql([0, 4]);
        expect([0, 1, 2, 3, 4].j.without(1, 2, 3, 4)).eql([0]);

        expect([0, 1, 2, 3, 4].j.without(0, 1)).eql([2, 3, 4]);
        expect([0, 1, 2, 3, 4].j.without(0, 1, 2)).eql([3, 4]);
        expect([0, 1, 2, 3, 4].j.without(0, 1, 2, 3)).eql([4]);
        expect([0, 1, 2, 3, 4].j.without(0, 1, 2, 3, 4)).eql([]);

        expect(['a', 'b', '', '', 'c', '', 'd'].j.without('')).eql(['a', 'b', 'c', 'd']);

        expect([1, 2, 3, 4].j.without('1')).eql([1, 2, 3, 4]);

        expect([1, null, null, null, 2, 3, 'a', 'b'].j.without(null)).eql([1, 2, 3, 'a', 'b']);
        expect([1, null, null, null, 2, 3, 'a', 'b'].j.without(null)).not.eql([3, 2, 1, 'a', 'b']);

        expect([1, null, undefined, null, null, 2, 3, 'a', 'b'].j.without(null)).not.eql([3, 2, 1, 'a', 'b']);
        expect([1, undefined, null, null, null, 2, 3, 'a', 'b'].j.without(null)).not.eql([3, 2, 1, 'a', 'b']);

        expect([].j.without()).to.eql([]);
        expect([undefined].j.without()).to.eql([undefined]);
        expect([undefined].j.without(undefined)).to.eql([]);
        expect([undefined].j.without(null)).to.eql([undefined]);
        expect([null].j.without(undefined)).to.eql([null]);

        expect([1, null, 2, null, undefined].j.without(null, undefined)).to.eql([1, 2]);
    });
});

describe('Number#j.pad', function () {
    it('It should pad a number with zeros to the specified length', function () {
        expect((123456).j.pad(  )).to.equal('123456');
        expect((123456).j.pad(1 )).to.equal('6');
        expect((123456).j.pad(2 )).to.equal('56');
        expect((123456).j.pad(7 )).to.equal('0123456');
        expect((123456).j.pad(10)).to.equal('0000123456');
        expect((123456).j.pad(15)).to.equal('000000000123456');
        expect((123456).j.pad(-1)).to.equal('23456');
        expect((123456).j.pad(0 )).to.equal('');
    });
});

describe('Object#j.each', function () {

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

    it('It should iterate over objects and arrays as exprected', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);
        var isArr, currentObj;

        var eachCallback = function (value, key, iteration) {
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
                    value.j.each(function (val, key, iteration) {
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
        obj.j.each(eachCallback);

        isArr = true; currentObj = arr;
        arr.j.each(eachCallback);
    });

    it('It should break when the exit() argument is called', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);
        var i = 0, exitCalled = false, resI = null;

        var res = [0, 1, 2, 3, 4, 5].j.each(function (value, key, iteration, exit) {
            expect(i).to.equal(value);
            i++;
            if(i === 2) exit(function () {
                resI       = i;
                exitCalled = true;
            });
        });

        res();
        expect(exitCalled).to.equal(true);
        expect(resI).to.equal(2);
    });

    it('It should iterate over strings as expected', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);
        var string = 'somereallyreallyreallylongstring';

        string.j.each(function (char) {
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });

        var c = string.j.each(function (char, k, i, exit) {
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
            if(i === 9) exit(char);
        });

        expect(c).to.equal('y');

        c = string.j.each(function (char, k, i, exit) {
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
            if(i === 9) exit(char, 'arg2', 'arg3');
        });

        expect(c).to.be.an.instanceof(Array);
        expect(c[0]).to.be.equal('y');
        expect(c[1]).to.be.equal('arg2');
        expect(c[2]).to.be.equal('arg3');
    });

    it('It should iterate over start and end ranges as expected', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);
        var string = 'somereallyreallyreallylongstring';

        var val = '';
        string.j.each(1, 2, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('om');

        val = '';
        string.j.each(2, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('mereallyreallyreallylongstring');

        val = '';
        string.j.each(-20, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('somereallyreallyreallylongstring');

        val = '';
        string.j.each(-20, 2000, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('somereallyreallyreallylongstring');

        val = '';
        string.j.each(-20, -1000, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('');

        val = '';
        string.j.each(100000, 1, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('');

        val = '';
        string.j.each(200, -100, function (char) {
            val += char;
            expect(this).to.equal('somereallyreallyreallylongstring');
            expect(char).to.be.a('string');
            expect(char).to.have.length(1);
        });
        expect(val).to.equal('');
    });

    it('It should iterate over numbers as expected', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);
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
            currentNumber.j.each(numberCallback);
        }
    });

    it('It should iterate over functions as if they were strings', function () {
        expect(Object.j.each).to.be.an.instanceof(Function);

        var func = function () { console.log('HELLO WORLD'); };
        func.j.each(function (char, k, i) {
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
        expect(Object.j.each).to.be.an.instanceof(Function);

        true.j.each(function (char, k, i) {
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

        false.j.each(function (char, k, i) {
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

describe('Object#j.findChildAtPath', function () {

    // Create some test data
    var a = {
            b: {
                c: {
                    d: {
                        d1 : 1,
                        d2 : 2,
                        e: [
                            'foo',
                            'bar'
                        ]
                    },
                    c1: 1,
                    c2: 2
                },
                b1: 1,
                b2: 2
            },
            a1: 1,
            a2: 2
        },
        arr = [1, 2, 3, [9, 8, 7]];

    it('It should find children of objects as expected', function () {
        var c;

        c = a.j.findChildAtPath('a');
        expect(c).to.equal(null);

        c = a.j.findChildAtPath(123);
        expect(c).to.equal(null);

        c = a.j.findChildAtPath(function () {});
        expect(c).to.equal(null);

        c = a.j.findChildAtPath('a.a1');
        expect(c).to.equal(null);

        c = a.j.findChildAtPath('a1');
        expect(c).to.equal(1);

        c = a.j.findChildAtPath('a2');
        expect(c).to.equal(2);

        c = a.j.findChildAtPath('b.b1');
        expect(c).to.equal(1);

        c = a.j.findChildAtPath('b.b2');
        expect(c).to.equal(2);

        c = a.j.findChildAtPath('b.c.c1');
        expect(c).to.equal(1);

        c = a.j.findChildAtPath('b.c.c2');
        expect(c).to.equal(2);

        c = a.j.findChildAtPath('b.c.d.d1');
        expect(c).to.equal(1);

        c = a.j.findChildAtPath('b.c.d.d2');
        expect(c).to.equal(2);
    });

    it('It should invoke callbacks with the proper arguments', function () {
        var c;

        c = a.j.findChildAtPath('b.c.d.d2', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(2);
            expect(parent).to.equal(a.b.c.d);
        });

        c = a.j.findChildAtPath('a1', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(1);
            expect(parent).to.equal(a);
        });
    });

    it('It should work with any delimiter', function () {
        var c;

        c = a.j.findChildAtPath('b/c/d/d2', '/', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(2);
            expect(parent).to.equal(a.b.c.d);
        });

        c = a.j.findChildAtPath('a++++b++++b1', '++++', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(1);
            expect(parent).to.equal(a.b);
        });
    });

    it('It should find children of arrays', function () {
        var c;

        c = a.j.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal('foo');
            expect(parent).to.equal(a.b.c.d.e);
        });

        expect(c).to.equal('foo');
        c = true;

        c = a.j.findChildAtPath('b.c.d.e.1', '.', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal('bar');
            expect(parent).to.equal(a.b.c.d.e);
        });

        expect(c).to.equal('bar');
        c = true;

        c = arr.j.findChildAtPath('0', '.', function (val, parent) {
            expect(this).to.equal(arr);
            expect(val).to.equal(1);
            expect(parent).to.equal(arr);
        });

        expect(c).to.equal(1);
        c = true;

        c = arr.j.findChildAtPath('3.0', '.', function (val, parent) {
            expect(this).to.equal(arr);
            expect(val).to.equal(9);
            expect(parent).to.be.an.instanceof(Array);
        });

        expect(c).to.equal(9);
        c = true;
    });

    it('It should return null for strings, numbers, and functions', function () {
        var s = 'string', n = 234234, f = function () {}, c, invoked = false;

        c = s.j.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = n.j.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(n);
            expect(val).to.equal(null);
            expect(parent).to.equal(n);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = f.j.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(f);
            expect(val).to.equal(null);
            expect(parent).to.equal(f);
        });

        expect(invoked).to.equal(true);
        expect(c).to.equal(null);

    });

    it('It should return null when provided an empty path', function () {
        var s = 'string', c, invoked = false;

        c = s.j.findChildAtPath('', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = s.j.findChildAtPath(null, '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = s.j.findChildAtPath(undefined, '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.j.findChildAtPath('', function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.j.findChildAtPath(null, function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.j.findChildAtPath(undefined, function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });
    });
});
