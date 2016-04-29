(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.extend', function () {
        var lib;
        before(function () {
            if(typeof window !== 'object') {
                lib = new (require('../'))('_');
            }
            else {
                lib = window.protolib;
            }
        });

        var o = {}, a = [], s = 'string', f = function () {}, n = 123, d = new Date();

        it('It should properly extend objects', function () {
            lib.extend(Object, 'test', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(o._.test).to.be.a('function');
            expect(lib.object.test).to.be.a('function');
            o._.test(1, 2);

            var testObj = {};
            expect(lib.object.test(testObj, 1, 2)).to.equal(testObj);

            expect(a._.test).to.be.a('function');
            a._.test(1, 2);

            expect(s._.test).to.be.a('function');
            s._.test(1, 2);

            expect(n._.test).to.be.a('function');
            n._.test(1, 2);

            expect(f._.test).to.be.a('function');
            f._.test(1, 2);

            expect(d._.test).to.be.a('function');
            d._.test(1, 2);

            lib.extend('test2', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
            });

            expect(o._.test2).to.be.a('function');
            expect(lib.object.test2).to.be.a('function');
            o._.test(1, 2);

            expect(a._.test2).to.be.a('function');
            a._.test(1, 2);

            expect(s._.test2).to.be.a('function');
            s._.test(1, 2);

            expect(n._.test2).to.be.a('function');
            n._.test(1, 2);

            expect(f._.test2).to.be.a('function');
            f._.test(1, 2);

            // Make sure first argument is optional, and that we can overwrite library methods.
            lib.extend('test', function (o, $1, $2, $3) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                expect($3).to.equal('a');
            });

            expect(o._.test).to.be.a('function');
            expect(lib.object.test).to.be.a('function');
            o._.test(1, 2, 'a');

            expect(a._.test).to.be.a('function');
            a._.test(1, 2, 'a');

            expect(s._.test).to.be.a('function');
            s._.test(1, 2, 'a');

            expect(n._.test).to.be.a('function');
            n._.test(1, 2, 'a');

            expect(f._.test).to.be.a('function');
            f._.test(1, 2, 'a');
        });

        it('It should properly extend strings', function () {
            lib.extend(String, 'string_test', function (s, $1, $2) {
                expect(s).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.string.string_test('abc', 1, 2)).to.equal('abc');

            expect(lib.string.string_test).to.be.a('function');
            expect(lib.object.string_test).to.be.a('undefined');
            expect(lib.number.string_test).to.be.a('undefined');
            expect(lib.function.string_test).to.be.a('undefined');
            expect(lib.date.string_test).to.be.a('undefined');
            expect(lib.array.string_test).to.be.a('undefined');

            expect(o._.string_test).to.be.a('undefined');
            expect(a._.string_test).to.be.a('undefined');
            expect(s._.string_test).to.be.a('function');
            expect(n._.string_test).to.be.a('undefined');
            expect(n._.string_test).to.be.a('undefined');

            expect(s._.string_test(1, 2, 'a')).to.equal(s);
        });

        it('It should properly extend numbers', function () {
            var o = {}, a = [], s = 'string', f = function () {}, n = 123;

            lib.extend(Number, 'number_test', function (n, $1, $2) {
                expect(n).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            expect(lib.number.number_test(5, 1, 2)).to.equal(5);

            expect(lib.string.number_test).to.be.a('undefined');
            expect(lib.object.number_test).to.be.a('undefined');
            expect(lib.number.number_test).to.be.a('function');
            expect(lib.function.number_test).to.be.a('undefined');
            expect(lib.date.number_test).to.be.a('undefined');
            expect(lib.array.number_test).to.be.a('undefined');

            expect(o._.number_test).to.be.a('undefined');
            expect(a._.number_test).to.be.a('undefined');
            expect(s._.number_test).to.be.a('undefined');
            expect(n._.number_test).to.be.a('function');
            expect(f._.number_test).to.be.a('undefined');
            expect(d._.number_test).to.be.a('undefined');

            expect(n._.number_test(1, 2, 'a')).to.equal(n);
        });

        it('It should properly extend functions', function () {
            lib.extend(Function, 'function_test', function (f, $1, $2) {
                expect(f).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            var f = function () {};
            expect(lib.function.function_test(f, 1, 2)).to.equal(f);

            expect(lib.string.function_test).to.be.a('undefined');
            expect(lib.object.function_test).to.be.a('undefined');
            expect(lib.number.function_test).to.be.a('undefined');
            expect(lib.function.function_test).to.be.a('function');
            expect(lib.date.function_test).to.be.a('undefined');
            expect(lib.array.function_test).to.be.a('undefined');

            expect(o._.function_test).to.be.a('undefined');
            expect(a._.function_test).to.be.a('undefined');
            expect(f._.function_test).to.be.a('function');
            expect(s._.function_test).to.be.a('undefined');
            expect(n._.function_test).to.be.a('undefined');
            expect(d._.function_test).to.be.a('undefined');

            expect(f._.function_test(1, 2, 'a')).to.equal(f);
        });

        it('It should properly extend arrays', function () {
            lib.extend(Array, 'array_test', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            var a = [];
            expect(lib.array.array_test(a, 1, 2)).to.equal(a);

            expect(lib.string.array_test).to.be.a('undefined');
            expect(lib.object.array_test).to.be.a('undefined');
            expect(lib.number.array_test).to.be.a('undefined');
            expect(lib.function.array_test).to.be.a('undefined');
            expect(lib.date.array_test).to.be.a('undefined');
            expect(lib.array.array_test).to.be.a('function');

            expect(o._.array_test).to.be.a('undefined');
            expect(a._.array_test).to.be.a('function');
            expect(f._.array_test).to.be.a('undefined');
            expect(s._.array_test).to.be.a('undefined');
            expect(n._.array_test).to.be.a('undefined');
            expect(d._.array_test).to.be.a('undefined');

            expect(a._.array_test(1, 2, 'a')).to.equal(a);

            var wasExtended = lib.extend(Array, 'empty', function (array, leaveFirstN) {
                leaveFirstN = typeof leaveFirstN === 'number' ? leaveFirstN : 0;

                for(var i = leaveFirstN; i < this.length; i++) {
                    this.splice(i, 1);
                    i--;
                }
                return this;
            });

            var arr = [1, 2, 3];
            expect(wasExtended).to.equal(true);
            expect(arr._.empty).to.be.a('function');
            expect(arr._.empty()).to.eql([]);
            expect(arr._.empty()).to.equal(arr);
        });

        it('It should properly extend dates', function () {
            lib.extend(Date, 'date_test', function (d, $1, $2) {
                expect(d).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            var d = new Date();
            expect(lib.array.array_test(d, 1, 2)).to.equal(d);

            expect(lib.string.date_test).to.be.a('undefined');
            expect(lib.object.date_test).to.be.a('undefined');
            expect(lib.number.date_test).to.be.a('undefined');
            expect(lib.function.date_test).to.be.a('undefined');
            expect(lib.date.date_test).to.be.a('function');
            expect(lib.array.date_test).to.be.a('undefined');

            expect(o._.date_test).to.be.a('undefined');
            expect(d._.date_test).to.be.a('function');
            expect(f._.date_test).to.be.a('undefined');
            expect(s._.date_test).to.be.a('undefined');
            expect(n._.date_test).to.be.a('undefined');
            expect(a._.date_test).to.be.a('undefined');

            expect(d._.date_test(1, 2, 'a')).to.equal(d);
        });

        it('It should properly extend custom objects', function () {

            var MyClass = function MyClass () {
                this.instanceMethod = function () {
                    console.log('instance method');
                };
            };

            lib.extend(Array, 'custom_test', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            lib.function.inherits(MyClass, Array);
            
            var a = [];
            expect(lib.array.custom_test(a, 1, 2)).to.equal(a);

            var myClass = new MyClass(),
                pArr    = [];

            expect(myClass._.custom_test).to.be.a('function');
            expect(myClass._.custom_test(1, 2, 'a')).to.equal(myClass);

            expect(pArr._.custom_test).to.be.a('function');
            expect(pArr._.custom_test(1, 2, 'a')).to.equal(pArr);

            expect('string'._.custom_test).to.be.a('undefined');
            expect(({})._.custom_test).to.be.a('undefined');
            expect([1, 2, 3]._.custom_test).to.be.a('function');
            expect((5)._.custom_test).to.be.a('undefined');
        });

        it('It should properly extend custom objects, #2', function () {
            var MyClass2 = function MyClass2 () {
                var self = this;

                this.instanceMethod = function () {
                    console.log('instance method');
                };

                this.valueOf = function () {
                    return self;
                };
            };

            lib.function.inherits(MyClass2, String);

            lib.extend(MyClass2, 'custom_test2', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            var myClass = new MyClass2(),
                pString = 'a string';

            expect(lib.my.custom_test2).to.be.a('function');

            var nClass2 = new MyClass2();
            expect(lib.my.custom_test2(nClass2, 1, 2)).to.equal(nClass2);

            expect(myClass._.custom_test2).to.be.a('function');
            expect(myClass._.custom_test2(1, 2, 'a')).to.equal(myClass);

            expect(pString._.custom_test2).to.be.a('undefined');
            expect('string'._.custom_test2).to.be.a('undefined');
            expect(({})._.custom_test2).to.be.a('undefined');
            expect((5)._.custom_test2).to.be.a('undefined');
            expect([1, 2, 3]._.custom_test2).to.be.a('undefined');

            lib.remove(MyClass2, 'custom_test2');
            expect(lib.my.custom_test2).to.be.a('undefined');
            expect(myClass._.custom_test2).to.be.a('undefined');
            expect(nClass2._.custom_test2).to.be.a('undefined');
        });

        it('It should properly extend custom objects, #3', function () {
            var MyClassA = function MyClassA () {
                this.foo = function () {
                    console.log('instance method');
                };
            };

            var MyClassB = function MyClassB () {
                this.bar = function () {
                    console.log('instance method');
                };
            };

            var MyClassC = function MyClassC () {
                this.baz = function () {
                    console.log('instance method');
                };
            };

            lib.extend(MyClassA, 'custom_test3', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            lib.function.inherits(MyClassB, MyClassA);
            lib.function.inherits(MyClassC, MyClassB);

            var myClassA = new MyClassA(),
                myClassB = new MyClassB(),
                myClassC = new MyClassC();

            expect(myClassA._.custom_test3).to.be.a('function');
            expect(myClassB._.custom_test3).to.be.a('function');
            expect(myClassC._.custom_test3).to.be.a('function');

            expect(myClassA._.custom_test3(1, 2, 'a')).to.equal(myClassA);
            expect(myClassB._.custom_test3(1, 2, 'a')).to.equal(myClassB);
            expect(myClassC._.custom_test3(1, 2, 'a')).to.equal(myClassC);

            expect(function () {}._.custom_test3).to.be.a('undefined');
            expect('string'._.custom_test3).to.be.a('undefined');
            expect(({})._.custom_test3).to.be.a('undefined');
            expect((5)._.custom_test3).to.be.a('undefined');
            expect([1, 2, 3]._.custom_test3).to.be.a('undefined');

            expect(lib.remove(MyClassC, 'custom_test3')).to.equal(false);
            expect(lib.remove(MyClassB, 'custom_test3')).to.equal(false);
            expect(lib.remove(MyClassA, 'custom_test3')).to.equal(true);

            expect(myClassC._.custom_test3).to.be.a('undefined');
            expect(myClassB._.custom_test3).to.be.a('undefined');
            expect(myClassA._.custom_test3).to.be.a('undefined');
        });

        it('It should properly extend custom objects, #4', function () {
            var MyClassA = function MyClassA () {
                this.foo = function () {
                    console.log('instance method');
                };
            };

            var MyClassB = function MyClassB () {
                this.bar = function () {
                    console.log('instance method');
                };
            };

            var MyClassC = function MyClassC () {
                this.baz = function () {
                    console.log('instance method');
                };
            };

            lib.extend(MyClassB, 'custom_test4', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            lib.function.inherits(MyClassB, MyClassA);
            lib.function.inherits(MyClassC, MyClassB);

            var myClassA = new MyClassA(),
                myClassB = new MyClassB(),
                myClassC = new MyClassC();

            expect(myClassA._.custom_test4).to.be.a('undefined');
            expect(myClassB._.custom_test4).to.be.a('function');
            expect(myClassC._.custom_test4).to.be.a('function');

            expect(myClassB._.custom_test4(1, 2, 'a')).to.equal(myClassB);
            expect(myClassC._.custom_test4(1, 2, 'a')).to.equal(myClassC);

            expect(function () {}._.custom_test4).to.be.a('undefined');
            expect('string'._.custom_test4).to.be.a('undefined');
            expect(({})._.custom_test4).to.be.a('undefined');
            expect((5)._.custom_test4).to.be.a('undefined');
            expect([1, 2, 3]._.custom_test4).to.be.a('undefined');

            expect(lib.remove(MyClassA, 'custom_test4')).to.equal(false);
            expect(lib.remove(MyClassC, 'custom_test4')).to.equal(false);
            expect(lib.remove(MyClassB, 'custom_test4')).to.equal(true);
            expect(myClassC._.custom_test4).to.be.a('undefined');
            expect(myClassB._.custom_test4).to.be.a('undefined');
            expect(myClassA._.custom_test4).to.be.a('undefined');
        });

        it('It should properly extend custom objects, #5', function () {
            var MyClassA = function MyClassA () {
                this.foo = function () {
                    console.log('instance method');
                };
            };

            var MyClassB = function MyClassB () {
                this.bar = function () {
                    console.log('instance method');
                };
            };

            var MyClassC = function MyClassC () {
                this.baz = function () {
                    console.log('instance method');
                };
            };

            lib.function.inherits(MyClassB, MyClassA);
            lib.function.inherits(MyClassC, MyClassB);

            lib.extend(MyClassC, 'custom_test5', function (o, $1, $2) {
                expect(o).to.equal(this);
                expect($1).to.equal(1);
                expect($2).to.equal(2);
                return this;
            });

            var myClassA = new MyClassA(),
                myClassB = new MyClassB(),
                myClassC = new MyClassC();

            expect(myClassA._.custom_test5).to.be.a('undefined');
            expect(myClassB._.custom_test5).to.be.a('undefined');
            expect(myClassC._.custom_test5).to.be.a('function');

            expect(myClassC._.custom_test5(1, 2, 'a')).to.equal(myClassC);

            expect(function () {}._.custom_test5).to.be.a('undefined');
            expect('string'._.custom_test5).to.be.a('undefined');
            expect(({})._.custom_test5).to.be.a('undefined');
            expect((5)._.custom_test5).to.be.a('undefined');
            expect([1, 2, 3]._.custom_test5).to.be.a('undefined');

            expect(lib.remove(MyClassC, 'custom_test5')).to.equal(true);
            expect(myClassC._.custom_test5).to.be.a('undefined');
        });

        it('It should properly remove methods', function () {
            expect(o._.test).to.be.a('function');
            expect(s._.test).to.be.a('function');
            expect(n._.test).to.be.a('function');
            expect(a._.test).to.be.a('function');
            expect(f._.test).to.be.a('function');
            expect(d._.test).to.be.a('function');

            expect(lib.object.test).to.be.a('function');

            expect(lib.string.string_test).to.be.a('function');
            expect(s._.string_test).to.be.a('function');

            expect(lib.number.number_test).to.be.a('function');
            expect(n._.number_test).to.be.a('function');

            expect(lib.function.function_test).to.be.a('function');
            expect(f._.function_test).to.be.a('function');

            expect(lib.date.date_test).to.be.a('function');
            expect(d._.date_test).to.be.a('function');

            expect(lib.array.array_test).to.be.a('function');
            expect(a._.array_test).to.be.a('function');

            expect(lib.remove(Object, 'test')).to.equal(true);
            expect(o._.test).to.be.a('undefined');
            expect(s._.test).to.be.a('undefined');
            expect(n._.test).to.be.a('undefined');
            expect(a._.test).to.be.a('undefined');
            expect(f._.test).to.be.a('undefined');
            expect(d._.test).to.be.a('undefined');

            expect(lib.object.test).to.be.a('undefined');

            expect(lib.remove(Object, 'test')).to.equal(false);

            expect(lib.remove(String, 'string_test')).to.equal(true);
            expect(lib.string.string_test).to.be.a('undefined');
            expect(s._.string_test).to.be.a('undefined');

            expect(lib.remove(Number, 'number_test')).to.equal(true);
            expect(lib.number.number_test).to.be.a('undefined');
            expect(n._.number_test).to.be.a('undefined');

            expect(lib.remove(Function, 'function_test')).to.equal(true);
            expect(lib.function.function_test).to.be.a('undefined');
            expect(f._.function_test).to.be.a('undefined');

            expect(lib.remove(Array, 'array_test')).to.equal(true);
            expect(lib.array.array_test).to.be.a('undefined');
            expect(a._.array_test).to.be.a('undefined');

            expect(lib.remove(Date, 'date_test')).to.equal(true);
            expect(lib.date.date_test).to.be.a('undefined');
            expect(d._.date_test).to.be.a('undefined');

            // Spot check that other methods still exist...
            expect(s._.reverse).to.be.a('function');
            expect(o._.invert).to.be.a('function');
            expect(a._.rotate).to.be.a('function');
            expect(s._.invert).to.be.a('function');
            expect(a._.invert).to.be.a('function');
        });
    });
}());
