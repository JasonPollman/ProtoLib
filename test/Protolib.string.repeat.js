(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.repeat', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should repeat strings as expected', function () {
            expect('*'._.repeat(-Infinity)).to.equal('*');
            expect('*'._.repeat(-1)).to.equal('*');
            expect('*'._.repeat(0)).to.equal('*');
            expect('*'._.repeat(1)).to.equal('*');
            expect('*'._.repeat(2)).to.equal('**');
            expect('*'._.repeat(3)).to.equal('***');
            expect('*'._.repeat(4)).to.equal('****');
            expect('*'._.repeat(20)).to.equal('********************');
            expect('*'._.repeat(Infinity)).to.equal('*');

            expect('hello world '._.repeat(2)).to.equal('hello world hello world ');

            expect('*'._.repeat('a')).to.equal('*');
            expect('*'._.repeat(null)).to.equal('*');
            expect('*'._.repeat(undefined)).to.equal('*');
            expect('*'._.repeat(function () {})).to.equal('*');
            expect('*'._.repeat({})).to.equal('*');
            expect('*'._.repeat([])).to.equal('*');

            var myString = 'repeat me ';
            expect(myString._.repeat(3)).to.equal('repeat me repeat me repeat me ');

            expect('*'._.repeat(10)).to.equal('**********');
            expect('Racecar'._.repeat(3)).to.equal('RacecarRacecarRacecar')
        });
    });

}());
