(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.function.inherits', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should make a constructor inherit the prototype of another', function () {
            var Dog = function () {};
            Dog.prototype.speak = function () {
                return 'Bark!';
            };

            var BlackDog = function () {
                this.color = 'black';
            };

            BlackDog.prototype.rollOver = function () {
                return 'Rolling over!';
            };

            expect(BlackDog._.inherits(Dog)).to.be.a('function');

            var dog  = new BlackDog(),
                dog2 = new Dog();

            expect(dog.speak).to.be.a('function');
            expect(dog.speak()).to.equal('Bark!');
            expect(dog.rollOver()).to.equal('Rolling over!');
            expect(dog2.rollOver).to.be.a('undefined');
        });
    });

}());
