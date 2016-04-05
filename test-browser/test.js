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

describe('Object#j.isEmpty', function () {
    it('It should correctly determine if an object is "empty"', function () {
        expect({}.j.isEmpty()).to.equal(true);
        expect({ a: 0 }.j.isEmpty()).to.equal(false);
        expect({ '0': null }.j.isEmpty()).to.equal(false);
        expect(''.j.isEmpty()).to.equal(true);
        expect(' '.j.isEmpty()).to.equal(false);
        expect('\\'.j.isEmpty()).to.equal(false);
        expect([].j.isEmpty()).to.equal(true);
        expect([null].j.isEmpty()).to.equal(false);
        expect([undefined].j.isEmpty()).to.equal(false);
        expect([1].j.isEmpty()).to.equal(false);
        expect((0).j.isEmpty()).to.equal(false);
        expect((1).j.isEmpty()).to.equal(false);
        expect((-1).j.isEmpty()).to.equal(false);
        expect((function () {}).j.isEmpty()).to.equal(false);
    });
});

describe('Object#j.last', function () {

    // Create some test data
    var obj = { foo: 'bar', num: 2, bool: false },
        string = 'string',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3];

    it('It should return the last item in an object', function () {
        var o = obj.j.last();
        expect(o).to.equal(false);
    });

    it('It should return the last item in an array', function () {
        var o = subarr.j.last();
        expect(o).to.equal(3);
    });

    it('It should return the last character in a string', function () {
        var o = string.j.last();
        expect(o).to.equal('g');
    });

    it('It should return the last digit in a number', function () {
        var o = number.j.last();
        expect(o).to.equal('3');

        o = float.j.last();
        expect(o).to.equal('4');
    });

    it('It should return the last charcter of a function cast to a string', function () {
        var o = func.j.last();
        expect(o).to.equal('}');
    });
});

describe('Object#j.random', function () {
    it('It should return a random character from a string', function () {
        expect('random'.j.random()).to.match(/[random]{1}/);
        expect(''.j.random()).to.equal('');
        expect('a'.j.random()).to.equal('a');
        expect('                              '.j.random()).to.equal(' ');
        expect('r   a   n   d   o   m'.j.random()).to.match(/[random ]{1}/);
    });

    it('It should return a random digit from a number', function () {
        expect((123456879).j.random()).to.match(/[1-9]{1}/).and.to.be.a('number');
        expect((1).j.random()).equal(1);
        expect((0).j.random()).equal(0);
        expect((-1).j.random()).equal(-1);
        expect((-123456789).j.random()).match(/-[1-9]{1}/).and.to.be.a('number');
    });

    it('It should return a random value from an array', function () {
        expect([1, 2, 3, 4, 5].j.random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect(['1', '2', '3', '4', '5'].j.random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect(['one', 'two', 'three'].j.random()).to.match(/(one|two|three)/).and.to.be.a('string');
        expect([1, 2, 3, 4, 5, 'hello', 'world'].j.random()).to.match(/[1-5]{1}|hello|world/);
    });

    it('It should return a random value from an object', function () {
        expect({ a: 1, b: 2, c: 3, d: 4, e: 5 }.j.random()).to.match(/[1-5]{1}/).and.to.be.a('number');
        expect({ a: '1', b: '2', c: '3', d: '4', e: '5' }.j.random()).to.match(/[1-5]{1}/).and.to.be.a('string');
        expect({ key: 'one', keyOne: 'two', keyTwo: 'three'}.j.random()).to.match(/(one|two|three)/).and.to.be.a('string');
    });
});

describe('Object#j.size', function () {
    // Create some test data
    var obj    = { foo: 'bar', num: 2, bool: false },
        eobj   = {},
        string = 'string',
        estr   = '',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3],
        earr   = [];

    it('It should return the correct number of members given an object', function () {
        var o = obj.j.size();
        expect(o).to.equal(3);

        o = eobj.j.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given an array', function () {
        var o = subarr.j.size();
        expect(o).to.equal(3);

        o = earr.j.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a string', function () {
        var o = string.j.size();
        expect(o).to.equal(6);

        o = estr.j.size();
        expect(o).to.equal(0);
    });

    it('It should return the correct number of members given a number', function () {
        var o = number.j.size();
        expect(o).to.equal(6);

        o = float.j.size();
        expect(o).to.equal(8);
    });

    it('It should return the correct number of members given a function', function () {
        var o = func.j.size();
        expect(o).to.equal(1);
    });
});

describe('Object#j.toArray', function () {
    // Create some test data
    var obj = { foo: 'bar', num: 2, bool: false },
        string = 'string',
        number = 124323,
        float  = 1324.234,
        func   = function () { console.log('HELLO WORLD!'); },
        subarr = [1, 2, 3],
        array  = [1, 2, subarr];

    it('It should convert objects to arrays', function () {
        var arr = obj.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.be.a('string');
        expect(arr[1]).to.be.a('number');
        expect(arr[2]).to.be.a('boolean');
    });

    it('It should convert strings to a char arrays', function () {
        var arr = string.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('s');
        expect(arr[1]).to.equal('t');
        expect(arr[2]).to.equal('r');
        expect(arr[3]).to.equal('i');
        expect(arr[4]).to.equal('n');
        expect(arr[5]).to.equal('g');
    });

    it('It should convert numbers to an array of digits', function () {
        var arr = number.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal(1);
        expect(arr[1]).to.equal(2);
        expect(arr[2]).to.equal(4);
        expect(arr[3]).to.equal(3);
        expect(arr[4]).to.equal(2);
        expect(arr[5]).to.equal(3);

        arr = float.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal(1);
        expect(arr[1]).to.equal(3);
        expect(arr[2]).to.equal(2);
        expect(arr[3]).to.equal(4);
        expect(arr[4]).to.equal('.');
        expect(arr[5]).to.equal(2);
        expect(arr[6]).to.equal(3);
        expect(arr[7]).to.equal(4);
    });

    it('It should convert booleans to a char arrays', function () {
        var arr = true.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('t');
        expect(arr[1]).to.equal('r');
        expect(arr[2]).to.equal('u');
        expect(arr[3]).to.equal('e');

        arr = false.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('f');
        expect(arr[1]).to.equal('a');
        expect(arr[2]).to.equal('l');
        expect(arr[3]).to.equal('s');
        expect(arr[4]).to.equal('e');
    });

    it('It should convert functions to a char arrays', function () {
        var arr = func.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr[0]).to.equal('f');
        expect(arr[1]).to.equal('u');
        expect(arr[2]).to.equal('n');
        expect(arr[3]).to.equal('c');
    });

    it('It should simply return arrays', function () {
        var arr = array.j.toArray();
        expect(arr).to.be.instanceof(Array);
        expect(arr).to.equal(array);
        expect(arr[0]).to.equal(1);
        expect(arr[1]).to.equal(2);
        expect(arr[2]).to.equal(subarr);
    });
});

describe('String#j.ellipses', function () {
    it('It should add ellipses to a string with length > the specified length', function () {
        expect('hello world'.j.ellipses(3)).to.equal('...');
        expect('hello world'.j.ellipses(4)).to.equal('h...');
        expect('hello world'.j.ellipses(5)).to.equal('he...');
        expect('hello world'.j.ellipses(6)).to.equal('hel...');
        expect('hello world'.j.ellipses(9)).to.equal('hello ...');
        expect('hello world'.j.ellipses(11)).to.equal('hello world');
        expect('hello world'.j.ellipses(12)).to.equal('hello world');
        expect('hello world'.j.ellipses(15)).to.equal('hello world');
        expect('hello world'.j.ellipses(' ')).to.equal('hello world');
        expect('hello world'.j.ellipses(null)).to.equal('hello world');
        expect('hello world'.j.ellipses(undefined)).to.equal('hello world');
        expect('hello world'.j.ellipses({})).to.equal('hello world');
        expect('hello world'.j.ellipses(-1)).to.equal('');
        expect('hello world'.j.ellipses(-2)).to.equal('');
        expect('hello world'.j.ellipses(-10)).to.equal('');
        expect('hello world'.j.ellipses(0)).to.equal('');
        expect('hello world'.j.ellipses()).to.equal('hello world');
    });

    it('It should add ellipses to the front of a string if "front" is specified', function () {
        expect('hello world'.j.ellipses(3, 'front')).to.equal('...');
        expect('hello world'.j.ellipses(4, 'front')).to.equal('...h');
        expect('hello world'.j.ellipses(5, 'front')).to.equal('...he');
        expect('hello world'.j.ellipses(6, 'front')).to.equal('...hel');
        expect('hello world'.j.ellipses(9, 'front')).to.equal('...hello ');
        expect('hello world'.j.ellipses(11, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(12, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(15, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(' ', 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(null, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(undefined, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses({}, 'front')).to.equal('hello world');
        expect('hello world'.j.ellipses(-1, 'front')).to.equal('');
        expect('hello world'.j.ellipses(-2, 'front')).to.equal('');
        expect('hello world'.j.ellipses(-10, 'front')).to.equal('');
        expect('hello world'.j.ellipses(0, 'front')).to.equal('');
    });

    it('It should allow for custom ellipses', function () {
        expect('hello world'.j.ellipses(3, 'front', '``')).to.equal('``h');
        expect('hello world'.j.ellipses(4, 'front', '``')).to.equal('``he');
        expect('hello world'.j.ellipses(5, 'front', '``')).to.equal('``hel');
        expect('hello world'.j.ellipses(6, 'front', '``')).to.equal('``hell');
        expect('hello world'.j.ellipses(9, 'front', '``')).to.equal('``hello w');
        expect('hello world'.j.ellipses(11, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(12, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(15, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(' ', 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(null, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(undefined, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses({}, 'front', '``')).to.equal('hello world');
        expect('hello world'.j.ellipses(-1, 'front', '``')).to.equal('');
        expect('hello world'.j.ellipses(-2, 'front', '``')).to.equal('');
        expect('hello world'.j.ellipses(-10, 'front', '``')).to.equal('');
        expect('hello world'.j.ellipses(0, 'front', '``')).to.equal('');
    });
});

describe('String#j.lcFirst', function () {
    it('It should lowercase the first letter of a string', function () {
        expect('string'.j.lcFirst()).to.equal('string');
        expect('String'.j.lcFirst()).to.equal('string');
        expect('string string'.j.lcFirst()).to.equal('string string');
        expect('String string'.j.lcFirst()).to.equal('string string');
        expect('string String'.j.lcFirst()).to.equal('string String');
        expect('_string'.j.lcFirst()).to.equal('_string');
        expect(''.j.lcFirst()).to.equal('');
    });
});

describe('String#j.pad', function () {
    it('It should pad a string to the specified length', function () {
        expect('string'.j.pad(  )).to.equal('string');
        expect('string'.j.pad(1 )).to.equal('s');
        expect('string'.j.pad(2 )).to.equal('st');
        expect('string'.j.pad(7 )).to.equal('string ');
        expect('string'.j.pad(10)).to.equal('string    ');
        expect('string'.j.pad(15)).to.equal('string         ');
        expect('string'.j.pad(-1)).to.equal('strin');
        expect('string'.j.pad(0 )).to.equal('');
    });

    it('It should pad a string using the specified character', function () {
        expect('string'.j.pad(null, '+')).to.equal('string');
        expect('string'.j.pad(1   , '+')).to.equal('s');
        expect('string'.j.pad(2   , '+')).to.equal('st');
        expect('string'.j.pad(7   , '+')).to.equal('string+');
        expect('string'.j.pad(10  , '+')).to.equal('string++++');
        expect('string'.j.pad(15  , '+')).to.equal('string+++++++++');
        expect('string'.j.pad(-1  , '+')).to.equal('strin');
        expect('string'.j.pad(0   , '+')).to.equal('');
    });

    it('It should pre-pad a string if the post parameter is true', function () {
        expect('string'.j.pad(null, '+', true)).to.equal('string');
        expect('string'.j.pad(1   , '+', true)).to.equal('g');
        expect('string'.j.pad(2   , '+', true)).to.equal('ng');
        expect('string'.j.pad(7   , '+', true)).to.equal('+string');
        expect('string'.j.pad(10  , '+', true)).to.equal('++++string');
        expect('string'.j.pad(15  , '+', true)).to.equal('+++++++++string');
        expect('string'.j.pad(-1  , '+', true)).to.equal('tring');
        expect('string'.j.pad(0   , '+', true)).to.equal('');
    });
});

describe('String#j.repeat', function () {
    it('It should repeat strings as expected', function () {
        expect('*'.j.repeat(-Infinity)).to.equal('*');
        expect('*'.j.repeat(-1)).to.equal('*');
        expect('*'.j.repeat(0)).to.equal('*');
        expect('*'.j.repeat(1)).to.equal('*');
        expect('*'.j.repeat(2)).to.equal('**');
        expect('*'.j.repeat(3)).to.equal('***');
        expect('*'.j.repeat(4)).to.equal('****');
        expect('*'.j.repeat(20)).to.equal('********************');
        expect('*'.j.repeat(Infinity)).to.equal('*');

        expect('hello world '.j.repeat(2)).to.equal('hello world hello world ');

        expect('*'.j.repeat('a')).to.equal('*');
        expect('*'.j.repeat(null)).to.equal('*');
        expect('*'.j.repeat(undefined)).to.equal('*');
        expect('*'.j.repeat(function () {})).to.equal('*');
        expect('*'.j.repeat({})).to.equal('*');
        expect('*'.j.repeat([])).to.equal('*');
    });
});

describe('String#j.reverse', function () {
    it('It should reverse strings as expected', function () {
        expect('string'.j.reverse()).to.equal('gnirts');
        expect('string'.j.reverse().j.reverse()).to.equal('string');
        expect('string'.j.reverse().j.reverse().j.reverse()).to.equal('gnirts');

        expect(' string      '.j.reverse()).to.equal('      gnirts ');
        expect(''.j.reverse()).to.equal('');
        expect(' '.j.reverse()).to.equal(' ');

        expect('racecar'.j.reverse()).to.equal('racecar');
        expect('Racecar'.j.reverse()).to.equal('racecaR');
        expect('Racecar'.j.reverse()).to.not.equal('racecar');

        expect('123456789'.j.reverse()).to.equal('987654321');
        expect((123456789).toString().j.reverse()).to.equal('987654321');

        expect('Donec id elit non mi porta gravida at eget metus. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper. Maecenas faucibus mollis interdum. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Sed posuere consectetur est at lobortis.'.j.reverse()).to.equal('.sitrobol ta tse rutetcesnoc ereusop deS .mauq tege satsege ,ni sisilicaf ca subipad ,oido otsuj sarC .mudretni sillom subicuaf saneceaM .repmes domsiue silef atrop alugil di mulubitseV .rotcua rolod subicuaf murtur teeroal eugua lev sucal sittigas sumaviV .sutem tege ta adivarg atrop im non tile di cenoD');
    });
});


describe('String#j.rtrim', function () {
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

describe('String#j.splice', function () {
    it('It should splice strings, like arrays', function () {
        expect('string'.j.splice(0, 1)).to.equal('tring');
        expect('string'.j.splice(1, 1)).to.equal('sring');
        expect('string'.j.splice(1, -1)).to.equal('sstring');
        expect('string'.j.splice(0, -1)).to.equal('g');
        expect('string'.j.splice(0, -5)).to.equal('tring');
        expect('string'.j.splice(5, -5)).to.equal('strinstring');

        expect('string'.j.splice(0, 0, 'add')).to.equal('addstring');
        expect('string'.j.splice(0, 1, 'add')).to.equal('addtring');
        expect('string'.j.splice(1, 0, 'add')).to.equal('saddtring');
        expect('string'.j.splice(1, 0, '')).to.equal('string');
        expect('string'.j.splice(1, 100, 'add')).to.equal('sadd');
        expect('string'.j.splice(0, 9999, 'add')).to.equal('add');
        expect('string'.j.splice(9999, 9999, 'add')).to.equal('stringadd');
        expect('string'.j.splice(-99, -99, 'add')).to.equal('addstring');
        expect('string'.j.splice(-99, 0, 'add')).to.equal('addstring');
        expect('string'.j.splice(0, -1, 'add')).to.equal('addg');
    });
});

describe('String#j.titleCase', function () {
    it('It should capitalize the first word of each letter in a string', function () {
        expect('string string string'.j.titleCase()).to.equal('String String String');
        expect('String String String'.j.titleCase()).to.equal('String String String');
        expect('_string string string'.j.titleCase()).to.equal('_string String String');
        expect('the lazy brown fox jumped over'.j.titleCase()).to.equal('The Lazy Brown Fox Jumped Over');
        expect(''.j.titleCase()).to.equal('');
    });
});

describe('String#j.ucFirst', function () {
    it('It should capitalize the first letter of a string', function () {
        expect('string'.j.ucFirst()).to.equal('String');
        expect('String'.j.ucFirst()).to.equal('String');
        expect('string string'.j.ucFirst()).to.equal('String string');
        expect('String string'.j.ucFirst()).to.equal('String string');
        expect('string String'.j.ucFirst()).to.equal('String String');
        expect('_string'.j.ucFirst()).to.equal('_string');
        expect(''.j.ucFirst()).to.equal('');
    });
});

describe('String#j.withoutTrailingSlash', function () {
    it('It should remove trailing slashes from a string', function () {
        expect('path/with/slashes'.j.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path/with/slashes/'.j.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect('path / with / slashes /'.j.withoutTrailingSlash()).to.equal('path / with / slashes ');
        expect('path/with/slashes////'.j.withoutTrailingSlash()).to.equal('path/with/slashes');
        expect(''.j.withoutTrailingSlash()).to.equal('');
        expect('/'.j.withoutTrailingSlash()).to.equal('');
        expect('///////////////'.j.withoutTrailingSlash()).to.equal('');
    });
});

describe('String#j.withTrailingSlash', function () {
    it('It should add a trailing slash to a string, but replace multiple trailing slashes with a single one', function () {
        expect('path/with/slashes'.j.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path/with/slashes/'.j.withTrailingSlash()).to.equal('path/with/slashes/');
        expect('path / with / slashes /'.j.withTrailingSlash()).to.equal('path / with / slashes /');
        expect('path/with/slashes////'.j.withTrailingSlash()).to.equal('path/with/slashes/');
        expect(''.j.withTrailingSlash()).to.equal('/');
        expect('/'.j.withTrailingSlash()).to.equal('/');
        expect('///////////////'.j.withTrailingSlash()).to.equal('/');
    });
});
