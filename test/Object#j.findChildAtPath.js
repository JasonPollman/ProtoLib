'use strict';

var expect = require('chai').expect,
    path   = require('path');

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

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should find children of objects as expected', function () {
        var c;

        c = a.jlib.findChildAtPath('a');
        expect(c).to.equal(null);

        c = a.jlib.findChildAtPath(123);
        expect(c).to.equal(null);

        c = a.jlib.findChildAtPath(function () {});
        expect(c).to.equal(null);

        c = a.jlib.findChildAtPath('a.a1');
        expect(c).to.equal(null);

        c = a.jlib.findChildAtPath('a1');
        expect(c).to.equal(1);

        c = a.jlib.findChildAtPath('a2');
        expect(c).to.equal(2);

        c = a.jlib.findChildAtPath('b.b1');
        expect(c).to.equal(1);

        c = a.jlib.findChildAtPath('b.b2');
        expect(c).to.equal(2);

        c = a.jlib.findChildAtPath('b.c.c1');
        expect(c).to.equal(1);

        c = a.jlib.findChildAtPath('b.c.c2');
        expect(c).to.equal(2);

        c = a.jlib.findChildAtPath('b.c.d.d1');
        expect(c).to.equal(1);

        c = a.jlib.findChildAtPath('b.c.d.d2');
        expect(c).to.equal(2);
    });

    it('It should invoke callbacks with the proper arguments', function () {
        var c;

        c = a.jlib.findChildAtPath('b.c.d.d2', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(2);
            expect(parent).to.equal(a.b.c.d);
        });

        c = a.jlib.findChildAtPath('a1', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(1);
            expect(parent).to.equal(a);
        });
    });

    it('It should work with any delimiter', function () {
        var c;

        c = a.jlib.findChildAtPath('b/c/d/d2', '/', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(2);
            expect(parent).to.equal(a.b.c.d);
        });

        c = a.jlib.findChildAtPath('a++++b++++b1', '++++', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal(1);
            expect(parent).to.equal(a.b);
        });
    });

    it('It should find children of arrays', function () {
        var c;

        c = a.jlib.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal('foo');
            expect(parent).to.equal(a.b.c.d.e);
        });

        expect(c).to.equal('foo');
        c = true;

        c = a.jlib.findChildAtPath('b.c.d.e.1', '.', function (val, parent) {
            expect(this).to.equal(a);
            expect(val).to.equal('bar');
            expect(parent).to.equal(a.b.c.d.e);
        });

        expect(c).to.equal('bar');
        c = true;

        c = arr.jlib.findChildAtPath('0', '.', function (val, parent) {
            expect(this).to.equal(arr);
            expect(val).to.equal(1);
            expect(parent).to.equal(arr);
        });

        expect(c).to.equal(1);
        c = true;

        c = arr.jlib.findChildAtPath('3.0', '.', function (val, parent) {
            expect(this).to.equal(arr);
            expect(val).to.equal(9);
            expect(parent).to.be.an.instanceof(Array);
        });

        expect(c).to.equal(9);
        c = true;
    });

    it('It should return null for strings, numbers, and functions', function () {
        var s = 'string', n = 234234, f = function () {}, c, invoked = false;

        c = s.jlib.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = n.jlib.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(n);
            expect(val).to.equal(null);
            expect(parent).to.equal(n);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = f.jlib.findChildAtPath('b/c/d/e/0', '/', function (val, parent) {
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

        c = s.jlib.findChildAtPath('', '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = s.jlib.findChildAtPath(null, '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = s.jlib.findChildAtPath(undefined, '/', function (val, parent) {
            invoked = true;
            expect(this).to.equal(s);
            expect(val).to.equal(null);
            expect(parent).to.equal(s);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.jlib.findChildAtPath('', function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.jlib.findChildAtPath(null, function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });

        expect(invoked).to.equal(true);
        invoked = false;

        expect(c).to.equal(null);
        c = true;

        c = a.jlib.findChildAtPath(undefined, function (val, parent) {
            invoked = true;
            expect(this).to.equal(a);
            expect(val).to.equal(null);
            expect(parent).to.equal(a);
        });
    });
});