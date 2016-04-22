(function () {
    'use strict';

    var expect;
    if(typeof window === 'object' && window.expect) {
        expect = window.expect;
    }
    else {
        expect = require('chai').expect;
    }

    describe('Protolib.string.reverse', function () {
        before(function () {
            if(typeof window !== 'object' && !Object._) new (require('../'))('_');
        });

        it('It should reverse strings as expected', function () {
            expect('string'._.reverse()).to.equal('gnirts');
            expect('string'._.reverse()._.reverse()).to.equal('string');
            expect('string'._.reverse()._.reverse()._.reverse()).to.equal('gnirts');

            expect(' string      '._.reverse()).to.equal('      gnirts ');
            expect(''._.reverse()).to.equal('');
            expect(' '._.reverse()).to.equal(' ');

            expect('racecar'._.reverse()).to.equal('racecar');
            expect('Racecar'._.reverse()).to.equal('racecaR');
            expect('Racecar'._.reverse()).to.not.equal('racecar');

            expect('123456789'._.reverse()).to.equal('987654321');
            expect((123456789).toString()._.reverse()).to.equal('987654321');

            expect('Donec id elit non mi porta gravida at eget metus. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper. Maecenas faucibus mollis interdum. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Sed posuere consectetur est at lobortis.'._.reverse()).to.equal('.sitrobol ta tse rutetcesnoc ereusop deS .mauq tege satsege ,ni sisilicaf ca subipad ,oido otsuj sarC .mudretni sillom subicuaf saneceaM .repmes domsiue silef atrop alugil di mulubitseV .rotcua rolod subicuaf murtur teeroal eugua lev sucal sittigas sumaviV .sutem tege ta adivarg atrop im non tile di cenoD');
        });
    });

}());
