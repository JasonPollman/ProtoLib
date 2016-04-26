(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.object.implements', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should determine if an object implements the given methods', function () {
            var MyClass = function () {
                this.foo = function () {
                    return true;
                };

                this.bar = 5;

                this.baz = function () {
                    return false;
                };
            };

            var x = new MyClass();
            
            var y = {
                orange: function () {
                    return true;
                },
                apple: false
            };

            expect(x._.implements('foo', 'baz')).to.equal(true);
            expect(x._.implements('bar', 'baz')).to.equal(false);
            expect(y._.implements('orange')).to.equal(true);
            expect(y._.implements('apple')).to.equal(false);
        });
    });
}());
