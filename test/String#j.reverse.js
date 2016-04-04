'use strict';

var expect = require('chai').expect,
    path   = require('path');

describe('String#j.reverse', function () {

    before(function () {
        require(path.join(__dirname, '..'))('j');
    });

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
