"use strict";

var expect = require("chai").expect,
    path   = require("path");

describe('String#j.ucFirst', function () {

    before(function () {
        require(path.join(__dirname, '..'))('jlib');
    });

    it('It should capitalize the first letter of a string', function () {
        expect("string".jlib.ucFirst()).to.equal("String");
        expect("String".jlib.ucFirst()).to.equal("String");
        expect("string string".jlib.ucFirst()).to.equal("String string");
        expect("String string".jlib.ucFirst()).to.equal("String string");
        expect("string String".jlib.ucFirst()).to.equal("String String");
        expect("_string".jlib.ucFirst()).to.equal("_string");
        expect("".jlib.ucFirst()).to.equal("");
    });
});
