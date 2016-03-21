"use strict";

var expect = require("chai").expect,
    path   = require("path");

describe('String#ucFirst', function () {

    before(function () {
        require(path.join(__dirname, ".."));
    });

    it('It should capitalize the first letter of a string', function () {
        expect("string".ucFirst()).to.equal("String");
        expect("String".ucFirst()).to.equal("String");
        expect("string string".ucFirst()).to.equal("String string");
        expect("String string".ucFirst()).to.equal("String string");
        expect("string String".ucFirst()).to.equal("String String");
        expect("_string".ucFirst()).to.equal("_string");
        expect("".ucFirst()).to.equal("");
    });
});
