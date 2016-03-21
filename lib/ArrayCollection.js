"use strict";
var util = require("util"),
    path = require("path");

/**
 * An extension of the Array. Useful for iterating over async collections and performing mathematical computations on array-like structures.
 * @constructor
 * @extends Array
 */
var ArrayCollection = function ArrayCollection () {
    Array.call(this);

    var self  = this,
        utils = require(path.join(__dirname, ".."));

    self.push.apply(self, arguments.toArray());

    /**
     * Collects the return values of the "onItem" invocation for each item in the ArrayCollection.
     * @param {Function} onItem A function to execute for each item in the ArrayCollection.
     * @param {Function=} done A callback for completion
     * @return {Array<*>} The return value for each invocation of "onItem"
     */
    this.collect = function (onItem, done) {
        onItem = onItem instanceof Function ? onItem.bind(self): utils.NULLF;
        done   = arguments.last() instanceof Function ? arguments.last() : utils.NULLF;
        if(done === onItem) done = utils.NULLF;

        var store = [];
        store.reduce = ArrayCollection.reduce.bind(store, store);
        store.square = ArrayCollection.square.bind(store, store);

        Object.defineProperty(store, "reduce",  { enumerable: false, writable: false, configurable: false });
        Object.defineProperty(store, "square",  { enumerable: false, writable: false, configurable: false });

        for(var i = 0; i < self.length; i++)
            store.push(onItem.call(self, self[i], i));

        done.call(self, store);
        return store;
    };

    /**
     * Sums each item in the collection..
     * @return {Number|NaN} The sum of the items in the ArrayCollection. Will return NaN if any item is non-numeric.
     */
    this.reduce = function reduce () {
        return self.collect.apply(self, arguments).reduce();
    };

    /**
     * Squares each item in the collection..
     * @return {Number|NaN} An array of squared items. Will return NaN if any item is non-numeric.
     */
    this.square = function square () {
        return self.collect.apply(self, arguments).square();
    };

    /**
     * An async each looping mechanism. This method will loop through each item in the arraycollection one by one and execute onItem.
     * You move from one iteration to the next by calling the "next" function passed into the onItem callback.
     * @param {Function} onItem A function that will be executed for each item in the arraycollection
     * @return {ArrayCollection} The current arraycollection instance
     */
    this.each = function each (onItem, done) {
        onItem = onItem instanceof Function ? onItem.bind(self): null;
        done   = arguments.last() instanceof Function ? arguments.last() : utils.NULLF;
        if(done === onItem) done = utils.NULLF;

        var next, exit, killed = false, called = {}, args = [];
        if(!onItem) return done.call(self, args);

        /**
         * Exits the loop and invokes the done callback
         * @return {ArrayCollection} The current arraycollection instance
         */
        exit = function arraycollectionEachExit () {
            killed = true;
            exit = utils.NULLF;
            next = utils.NULLF;
            done.call(self, args);
            return self;
        };

        /**
         * Moves to the next iteration in the arraycollection
         * @param {*} returnValue The value to pass to the next iteration and the "done" function at the end of the loop.
         * @return {ArrayCollection} The current arraycollection instance
         */
        next = function arraycollectionEachNext (returnValue) {
            var n = this + 1;
            if(!called[n]) {
                called[n]   = true;
                args[n - 1] = returnValue;

                process.nextTick(function () {
                    return (n < self.length && !killed) ?
                        onItem.apply(self, [self[n], n, next.bind(n), exit, args[n - 1], args]) :
                        exit();
                });
                return self;
            }
            throw new Error("ArrayCollection.each next function called more than once!");
        };

        onItem.call(self, self[0], 0, next.bind(0), exit, undefined, args);
        return self;
    };

    // Hide the following properties from iteration...
    Object.defineProperty(self, "length",   { enumerable: false, configurable: false });
    Object.defineProperty(self, "each",     { enumerable: false, writable: false, configurable: false });
    Object.defineProperty(self, "collect",  { enumerable: false, writable: false, configurable: false });
    Object.defineProperty(self, "reduce",   { enumerable: false, writable: false, configurable: false });
    Object.defineProperty(self, "square",   { enumerable: false, writable: false, configurable: false });
};


/**
 * Sums the values of a arraycollection or array. Will return NaN if any member of the arraycollection is non-numeric.
 * @param {ArrayCollection|Array} collection The arraycollection or array to sum
 * @return {Number|NaN} The summed value of the object.
 */
ArrayCollection.reduce = function (collection) {
    if(!(collection instanceof ArrayCollection) && !(collection instanceof Array)) return NaN;
    var sum = 0;
    for(var i = 0; i < collection.length; i++) {
        sum += parseFloat(collection[i]);
        if(isNaN(sum)) break;
    }
    return sum;
};

/**
 * Squares the values of a arraycollection or array. Will return NaN if any member of the arraycollection is non-numeric.
 * @param {ArrayCollection|Array} collection The arraycollection or array to square each item
 * @return {Array<Number>} The squared values for each item in the arraycollection or array
 */
ArrayCollection.square = function (collection) {
    if(!(collection instanceof ArrayCollection) && !(collection instanceof Array)) return undefined;
    var q = new ArrayCollection();
    for(var i = 0; i < collection.length; i++)
        q.push(Math.pow(parseFloat(collection[i]), 2));

    return q;
};

util.inherits(ArrayCollection, Array);
module.exports = ArrayCollection;
