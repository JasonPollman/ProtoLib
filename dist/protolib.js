(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    'use strict';

    /**
     * Function Identifier.
     * @type {Number}
     */
    var fid = 0,

    /**
     * True if the Node.js environment is loaded, false otherwise.
     * @type {Boolean}
     */
    IS_BROWSER = typeof window !== 'undefined';

    // This provides a way to determine the name of a function constructor in a platform agnostic way...
    Object.defineProperty(Function.prototype, '__get_protolib_name__', {
        configurable : true,
        enumerable   : false,
        get          : function () {
            if(typeof this.__protolib_name__ !== 'string') {
                Object.defineProperty(this, '__protolib_name__', {
                    configurable : false,
                    enumberable  : false,
                    writable     : false,
                    value        : typeof this.name === 'string' && this.name ? this.name : 'anonymous:' + fid++
                });
            }
            return this.__protolib_name__;
        }
    });

    var ProtoLib = function (handle) {
        // Prevent Function.call or binding...
        if(!(this instanceof ProtoLib)) return new ProtoLib(handle);

        handle = handle || 'p';

        /**
         * A self reference.
         * @type {ProtoLib}
         */
        var self = this,

        /**
         * Whether or not the library functions have been attached to the prototypes.
         * @type {Boolean}
         */
        attached = false,

        /**
         * Points to the current this item.
         * @type {*}
         */
        currentThis = null,

        /**
         * Stores cached library proto reference objects
         * @type {Object}
         */
        cached = {},

        /**
         * Stores the constructor chain for each prototype as an array.
         * For example: { string: ['object', 'string'] }.
         * Another example: { myCustomClassThatExtendsString: ['object', 'string', 'myCustomClassThatExtendsString'] }
         * @type {Object}
         */
        protoChain = {},

        /**
         * The static library
         */
        libs,

        /**
         * The protolibrary
         */
        libp;

        /**
         * Deletes the cache for the given prototype, and all others that this prototype inherits from.
         * Which means if 'proto' is 'object', all cache will be deleted.
         * @param {String} proto The prototype to delete the cache for.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function deleteCacheForProto (proto) {
            for(var i in protoChain) {
                if(protoChain.hasOwnProperty(i)) {
                    if(protoChain[i].indexOf(proto) > -1) delete cached[i];
                }
            }
            return self;
        }

        /**
         * Appends all the library functions to this instance for static use.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function attachLibraryToSelf () {
            for(var i in libs)
                if(libs.hasOwnProperty(i) && !self[i]) self[i] = libs[i];
            return self;
        }

        /**
         * Adds the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function applyLibraryToPrototypes () {
            var p, c, obj = {}, i, name,

            addMethod = function addMethod (o, k) { if(!obj[k]) obj[k] = o; };

            if(!attached) {
                attached = true;
                Object.defineProperty(Object.prototype, handle, {
                    configurable : true,
                    enumerable   : false,
                    // Allow users to overwrite the handle on a per instance basis...
                    set: function (v) {
                        if(this[handle] !== v) {
                            Object.defineProperty(this, handle, {
                                configurable : true,
                                enumerable   : true,
                                writable     : true,
                                value        : v
                            });
                        }
                    },
                    // Returns the libp library...
                    get: function () {
                        obj = {}; i = 0;
                        p = this.__proto__;
                        var last = null;

                        do { // This will traverse the protoypes of the object, so inherited properties will be made available
                             // to objects up the prototype chain...
                            if(p.constructor) {
                                name = p.constructor.__get_protolib_name__;
                                if(/^anonymous:/.test(name)) name = 'anonymous';

                                if(p && name && typeof name === 'string') {
                                    c = name.toLowerCase();

                                    if(cached[c] && i === 0) {
                                        currentThis = this;
                                        return cached[c];
                                    }
                                    else if(libp[c]) {
                                        if(!protoChain[c]) protoChain[c] = [c];
                                        if(last) protoChain[last].unshift(c);

                                        currentThis = this;
                                        libs.object.each(libp[c], addMethod);
                                        cached[c] = obj;

                                        last = c;
                                    }
                                }
                            }

                            i++;

                        } while(p = p.__proto__); // jshint ignore:line
                        return obj;
                    }
                });
            }
            return self;
        }

        /**
         * Removes the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function removeLibraryFromPrototypes () {
            if(attached) {
                delete Object.prototype[handle];
                attached = false;
            }
            return self;
        }

        /**
         * Retrieves the last item from the 'thisPointerStack' and invokes the provided callback with it.
         * @param {Function} callback The callback to be invoked with the current 'this' value.
         * @return The result of the invocation of the callback.
         */
        function getThisValueAndInvoke (callback) {
            return callback(currentThis !== undefined && currentThis !== null ? currentThis.valueOf() : currentThis);
        }

        libs = require('./lib/libs')();
        libp = require('./lib/libp')(libs, getThisValueAndInvoke);

        /**
         * Sets the handle
         * @param {String} h The new handle
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.setHandle = function (h) {
            if(typeof h === 'string') handle = h;
            removeLibraryFromPrototypes();
            applyLibraryToPrototypes();
            return self;
        };

        /**
         * Adds a library method to a prototype.
         * @param {String} name The name of the library method to add.
         * @param {String=} [proto='object'] The prototype to add to. If omitted, it will default to object.
         * @param {Function} callback The method to add.
         * @return {Boolean} True if the method was added, false otherwise.
         */
        this.extend = function (name, proto, callback) {
            callback = libs.object.getCallback(arguments);

            if(typeof name !== 'string' || !(callback instanceof Function)) return false;
            if(!proto || typeof proto !== 'string') proto = 'object';

            if(!libp[proto]) libp[proto] = {};
            if(!libs[proto]) libs[proto] = {};

            libs[proto][name] = callback;
            libp[proto][name] = function () {
                var args = libs.object.toArray(arguments);
                return getThisValueAndInvoke(function (c) {
                    args.push(c);
                    return callback.apply(c, args);
                });
            };

            deleteCacheForProto(proto);
            return true;
        };

        /**
         * Remvoes a library method from a prototype.
         * @param {String} proto The prototype to remove from.
         * @param {String} name The name of the library method to remove.
         * @return {Boolean} True if the method was removed, false otherwise.
         */
        this.remove = function (name, proto) {
            if(typeof proto !== 'string' || typeof name !== 'string') return false;

            if(libp[proto] && libp[proto][name]) {
                delete libp[proto][name];
                if(libs[proto] && libs[proto][name]) delete libs[proto][name];
                deleteCacheForProto(proto);
                return true;
            }
            return false;
        };

        /**
         * Removes the prototype library reference from the object prototype.
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.unload = function () {
            removeLibraryFromPrototypes();
            return self;
        };

        /**
         * Applies the library to the object prototype and all static functions
         * to the current ProtoLib instance.
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.load = function () {
            applyLibraryToPrototypes();
            attachLibraryToSelf();
        }

        // Apply the library to the object prototype, and attach all the static functions
        // to the current ProtoLib instance...
        self.load();
    };

    var x = new ProtoLib('_');

    return !IS_BROWSER ?
        module.exports  = ProtoLib :
        window.ProtoLib = ProtoLib ;
}());

},{"./lib/libp":2,"./lib/libs":3}],2:[function(require,module,exports){
(function () {
    'use strict';
    function libp (libs, getThisValueAndInvoke) {
        var libp = {
            string: {

                camelize: function camelize () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.camelize(s);
                    });
                },

                decamelize: function decamelize () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.decamelize(s);
                    });
                },

                differenceFromString: function differenceFromString (other) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.differenceFromString(s, other);
                    });
                },

                replaceTokens: function replaceTokens () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.replaceStringTokens(s);
                    });
                },

                intersectString: function intersectString (other) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.intersectString(s, other);
                    });
                },

                repeat: function repeat (times) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.repeat(s, times);
                    });
                },

                rtrim: function rtrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.rtrim(s, what);
                    });
                },

                ltrim: function ltrim (what) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ltrim(s, what);
                    });
                },

                htmlEncode: function htmlEncode () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.htmlEncode(s);
                    });
                },

                htmlDecode: function htmlDecode () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.htmlDecode(s);
                    });
                },

                addSlashes: function addSlashes () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.addSlashes(s);
                    });
                },

                ucFirst: function ucFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ucFirst(s);
                    });
                },

                lcFirst: function lcFirst () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.lcFirst(s);
                    });
                },

                titleCase: function titleCase () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.titleCase(s);
                    });
                },

                splice: function splice (index, count, add) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.splice(s, index, count, add);
                    });
                },

                ellipses: function ellipses_ (length, place, ellipses) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.ellipses(s, length, place, ellipses);
                    });
                },

                shuffle: function shuffle (splitter) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.shuffle(s, splitter);
                    });
                },

                reverse: function reverse () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.reverse(s);
                    });
                },

                withoutTrailingSlash: function withoutTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.withoutTrailingSlash(s);
                    });
                },

                withTrailingSlash: function withTrailingSlash () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.withTrailingSlash(s);
                    });
                },

                regexpSafe: function regexpSafe () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.regexpSafe(s);
                    });
                },

                pad: function pad (length, delim, pre) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.pad(s, length, delim, pre);
                    });
                },

                newlineToBreak: function newlineToBreak () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.newlineToBreak(s);
                    });
                },

                tabsToSpan: function tabsToSpan () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.tabsToSpan(s);
                    });
                },

                wordWrapToLength: function wordWrapToLength (width, padleft, padright, omitFirst) {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.wordWrapToLength(s, width, padleft, padright, omitFirst);
                    });
                },
            },

            array: {
                shuffle: function shuffle () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.shuffle(a);
                    });
                },

                union: function union () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.union.apply(a, args);
                    });
                },

                difference: function difference () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.difference.apply(a, args);
                    });
                },

                intersect: function intersect () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.intersect.apply(a, args);
                    });
                },

                without: function without () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (a) {
                        args.unshift(a);
                        return libs.array.without.apply(a, args);
                    });
                },

                rotate: function rotate (direction, amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotate(a, direction, amount);
                    });
                },

                rotateLeft: function rotateLeft (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotateLeft(a, amount);
                    });
                },

                rotateRight: function rotateRight (amount) {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.rotateRight(a, amount);
                    });
                },

                makeUnique: function makeUnique () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.makeUnique(a);
                    });
                },

                unique: function unique () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.unique(a);
                    });
                },

                ascending: function ascending () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.ascending(a);
                    });
                },

                descending: function descending () {
                    return getThisValueAndInvoke(function (a) {
                        return libs.array.descending(a);
                    });
                }
            },

            number: {

                to: function to_ (k) {
                    return getThisValueAndInvoke(function (n) {
                        var isInt = false;
                        if(n % 1 === 0 && n.toString().indexOf('.') === -1) isInt = true;
                        return isInt ? libs.number.randomIntInRange(n, k) : libs.number.randomNumberInRange(n, k);
                    });
                },

                isInt: function isInt () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.isInt(n);
                    });
                },

                factorial: function factorial () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.factorial(n);
                    });
                },

                choose: function choose (k) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.choose(n, k);
                    });
                },

                pad: function pad (length) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.pad(n, length);
                    });
                },

                daysFrom: function daysFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysFrom(n, date);
                    });
                },

                daysFromNow: function daysFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysFromNow(n);
                    });
                },

                secondsFrom: function secondsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsFrom(n, date);
                    });
                },

                secondsFromNow: function secondsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsFromNow(n);
                    });
                },

                yearsFrom: function yearsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsFrom(n, date);
                    });
                },

                yearsFromNow: function yearsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsFromNow(n);
                    });
                },

                monthsFrom: function monthsFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsFrom(n, date);
                    });
                },

                monthsFromNow: function monthsFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsFromNow(n);
                    });
                },

                hoursFrom: function hoursFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.hoursFrom(n, date);
                    });
                },

                hoursFromNow: function hoursFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.hoursFromNow(n);
                    });
                },

                minutesFrom: function minutesFrom (date) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesFrom(n, date);
                    });
                },

                minutesFromNow: function minutesFromNow () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesFromNow(n);
                    });
                },

                monthsAgo: function monthsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.monthsAgo(n);
                    });
                },

                daysAgo: function daysAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.daysAgo(n);
                    });
                },

                secondsAgo: function secondsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.secondsAgo(n);
                    });
                },

                minutesAgo: function minutesAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.minutesAgo(n);
                    });
                },

                yearsAgo: function yearsAgo () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.yearsAgo(n);
                    });
                },

                clockTime: function clockTime () {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.clockTime(n);
                    });
                }
            },

            function: {
                inherits: function inherits (s) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.function.inherits(o, s);
                    });
                }
            },

            object: {
                histogram: function histogram () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.histogram(o);
                    });
                },

                copy: function copy () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.copy(o);
                    });
                },

                each: function each (start, end, callback) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.each(o, start, end, callback);
                    });
                },

                occurrencesOf: function occurrencesOf (what) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.occurrencesOf(o, what);
                    });
                },

                keys: function keys () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.keys(o);
                    });
                },

                size: function size () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.size(o);
                    });
                },

                isNumeric: function isNumeric () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isNumeric(o);
                    });
                },

                getNumeric: function getNumeric () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.getNumeric(o);
                    });
                },

                isEmpty: function isEmpty () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isEmpty(o);
                    });
                },

                isArray: function isArray () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isArray(o);
                    });
                },

                isPureObject: function isPureObject () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isPureObject(o);
                    });
                },

                isString: function isString () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isString(o);
                    });
                },

                isUndefined: function isUndefined () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isUndefined(o);
                    });
                },

                isNull: function isNull () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isNull(o);
                    });
                },

                isBoolean: function isBoolean () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isBoolean(o);
                    });
                },

                isFunction: function isFunction () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isFunction(o);
                    });
                },

                isArguments: function isArguments () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.isArguments(o);
                    });
                },

                toNumber: function toNumber () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toNumber(o);
                    });
                },

                toInt: function toInt () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toInt(o);
                    });
                },

                toArray: function toArray () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.toArray(o);
                    });
                },

                getCallback: function getCallback () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.getCallback(o);
                    });
                },

                random: function random () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.random(o);
                    });
                },

                every: function every (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.every(o, f);
                    });
                },

                any: function any (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.any(o, f);
                    });
                },

                first: function first (n) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.first(o, n);
                    });
                },

                last: function last (n) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.last(o, n);
                    });
                },

                findChildAtPath: function findChildAtPath (path, delimiter, done) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.findChildAtPath(o, path, delimiter, done);
                    });
                },

                clone: function clone () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.clone(o);
                    });
                },

                only: function only () {
                    var args = libs.object.toArray(arguments);
                    return getThisValueAndInvoke(function (o) {
                        args.unshift(o);
                        return libs.object.only.apply(o, args);
                    });
                },

                where: function where (predicateFunction) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.where(o, predicateFunction);
                    });
                },

                whereKeys: function whereKeys (predicateFunction) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.whereKeys(o, predicateFunction);
                    });
                },

                invert: function invert () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.invert(o);
                    });
                },

                max: function max (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.max(o, f);
                    });
                },

                min: function min (f) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.min(o, f);
                    });
                },

                implements: function _implements (method) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.implements(o, method);
                    });
                },

                implementsOwn: function implementsOwn (method) {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.implementsOwn(o, method);
                    });
                },
            },

            date: {
                advanceDays: function advanceDays (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.object.advanceDays(d, n, adjustForWeeked);
                    });
                },

                advanceMonths: function advanceMonths (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.object.advanceMonths(d, n, adjustForWeeked);
                    });
                },

                advanceYears: function advanceYears (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.object.advanceYears(d, n, adjustForWeeked);
                    });
                },

                yymmdd: function yymmdd (delim) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.object.yymmdd(d, delim);
                    });
                },

                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.object.clockTime(d, !!omitMS);
                    });
                },
            }
        };

        return libp;
    }
    module.exports = libp;
}());

},{}],3:[function(require,module,exports){
function libs () {
    'use strict';
    var IS_BROWSER = typeof window !== 'undefined',
        HAS_OS     = IS_BROWSER ? false : typeof require('os') === 'object';

    /**
     * Alters Firefox's Function.toString() results to match Chrome/Safari.
     * @param {String} s The string representation of the function.
     * @return {String} The altered string, with newlines replaced and 'use strict' removed.
     */
    function fixFirefoxFunctionString (s) {
        return s.replace(/(?:\r)?\n+/g, '').replace(/"use strict";|'use strict';/g, '');
    }

    var NULL_FUNCTION = function EMPTY_CALLBACK_REPLACEMENT () {};

    var libs = {

        /**
         * String library functions
         * @type {Object}
         */
        string: {

            /**
             * Camelizes all of the provided string arguments.
             * @param {...String} string A list of strings to camelize.
             * @return {Array<String>} An array of the provided arguments, with all strings camelized.
             */
            camelize: function camelize () {
                var ret = [];
                libs.object.every(arguments, function (s) {
                    if(s) {
                        if(typeof s === 'function') s = fixFirefoxFunctionString(s.toString());
                        s = s.toString().replace(/[^a-z0-9$]/gi, '_').replace(/\$(\w)/g, '$_$1').split(/[\s_]+/g);
                        libs.object.each(s, 1, s.length, function (i, k) {
                            this[k] = libs.string.ucFirst(i);
                        });
                        s = libs.string.lcFirst(s.join(''));
                    }
                    ret.push(s);
                });
                return ret.length === 1 ? ret[0] : ret;
            },

            /**
             * Decamelizes all of the provided string arguments.
             * @param {...String} string A list of strings to decamelize.
             * @return {Array<String>} An array of the provided arguments, with all strings decamelized.
             */
            decamelize: function decamelize () {
                var ret = [];
                libs.object.every(arguments, function (s) {
                    if(s) {
                        if(typeof s === 'function') s = fixFirefoxFunctionString(s.toString());
                        s = s.toString().replace(/([A-Z$])/g, function ($) {
                            return ' ' + (typeof $ === 'string' ? $.toLowerCase() : '');
                        });
                    }
                    ret.push(typeof s === 'string' ? s.trim() : s);
                });
                return ret.length === 1 ? ret[0] : ret;
            },

            /**
             * Returns all the characters found in one string but not the other.
             * @param {String} s The string to operate on.
             * @param {String} other The string to compute the difference against.
             * @return {String} A difference string.
             */
            differenceFromString: function differenceFromString (s, other) {
                if(typeof other !== 'string' || typeof s !== 'string') return s;
                var sarr = s.split(''), oarr = other.split('');
                return libs.array.differenceFromArray(sarr, oarr).join('');
            },

            /**
             * Replaces tokens (snippets of text wrapped in brackets) with their values.
             * @param {String} s The string to operate on.
             * @return {String} The token replaced values.
             */
            replaceTokens: function replaceTokens (s) {
                return libs.generic.replaceStringTokens(s);
            },

            /**
             * Returns only the characters common to both strings
             * @param {String} s The string to operate on.
             * @param {String} other The string to compute the intersection against.
             * @return {String} The intersection between the two strings.
             */
            intersectString: function intersectString (s, other) {
                if(typeof other !== 'string' || typeof s !== 'string') return s;
                var sarr = s.split(''), oarr = other.split('');
                return libs.intersectArray(sarr, oarr).join('');
            },

            /**
             * Repeat a string 'times' times.
             * @param {String} s The string to operate on.
             * @param {Number} times The number of times to repeat the string
             * @return {String} The repeated string.
             */
            repeat: function repeat (s, times) {
                times = parseInt(times, 10);
                times = isNaN(times) || !isFinite(times) || times <= 0 ? 1 : times;

                var os = s;
                for(var i = 1; i < times; i++) s += os;
                return s;
            },

            /**
             * Right trims a string. Same as String.trim, but only for the end of a string.
             * @param {String} s The string to operate on.
             * @param {String} [what='\\s+'] What to trim.
             * @return {String} The right trimmed string
             */
            rtrim: function rtrim (s, what) {
                what = typeof what === 'string' ? what : '\\s+';
                return s.replace(new RegExp(what + '$'), '');
            },

            /**
             * Left trims a string. Same as String.trim, but only for the beginning of a string.
             * @param {String} s The string to operate on.
             * @param {String} [what='\\s+'] What to trim.
             * @return {String} The left trimmed string
             */
            ltrim: function ltrim (s, what) {
                what = typeof what === 'string' ? what : '\\s+';
                return s.replace(new RegExp('^' + what), '');
            },

            /**
             * Escapes HTML special characters
             * @param {String} s The string to operate on.
             * @return {String} The HTML escaped string
             */
            htmlEncode: function htmlEncode (s) {
                var map = {
                    '&'  : '&amp;',
                    '<'  : '&lt;',
                    '>'  : '&gt;',
                    '"'  : '&quot;',
                    '\'' : '&#039;'
                };
                return s.replace(/[&<>"']/g, function (m) { return map[m]; });
            },

            /**
             * Un-escapes HTML special characters
             * @param {String} s The string to operate on.
             * @return {String} The HTML escaped string
             */
            htmlDecode: function htmlDecode (s) {
                var map = {
                    '&amp;'  : '&',
                    '&lt;'   : '<',
                    '&gt;'   : '>',
                    '&quot;' : '"',
                    '&#039;' : '\''
                };
                return s.replace(/(&amp;|&lt;|&gt;|&quot;|&#039;)/g, function (m) { return map[m]; });
            },

            /**
             * Creates an 'eval' safe string, by adding slashes to ", ', \t, \n, \f, \r, and the NULL byte.
             * @param {String} s The string to operate on.
             * @return {String} A string with slashes
             */
            addSlashes: function addSlashes (s) {
                return s.replace(/[\\"'\t\n\f\r]/g, '\\$&').replace(/\u0000/g, '\\0');
            },

            /**
             * Returns a string with the first letter capitalized.
             * @param {String} s The string to operate on.
             * @return {String} The string with the first letter upper cased.
             * @function
             */
            ucFirst: function ucFirst (s) {
                return s.charAt(0).toUpperCase() + s.slice(1);
            },

            /**
             * Returns a string with the first letter lowercased.
             * @param {String} s The string to operate on.
             * @return {String} The string with the first letter lower cased.
             * @function
             */
            lcFirst: function lcFirst (s) {
                return s.charAt(0).toLowerCase() + s.slice(1);
            },

            /**
             * Returns a string in Title Case.
             * @param {String} s The string to operate on.
             * @return {String} The title cased string.
             * @function
             */
            titleCase: function titleCase (s) {
                var arr = [];
                libs.object.each(s.split(' '), function (t) { arr.push(libs.string.ucFirst(t)); });
                return arr.join(' ');
            },

            /**
             * Splices a string, much like an array.
             * @param {String} s The string to operate on.
             * @param {Number} index The index to begin splicing the string at
             * @param {Number} count The number of characters to delete
             * @param {String} add The string to append at the spliced section
             * @return {String} The spliced string.
             * @function
             */
            splice: function splice (s, index, count, add) {
                return s.slice(0, index) + (add || '') + s.slice(index + count);
            },

            /**
             * Return a truncated string with ellipses.
             * @param {String} s The string to operate on.
             * @param {Number=} length The length of the desired string. If ommited, the strings original length will be used.
             * @param {String=} [place='back'] Possible values are 'front' and 'back'. Specifying 'front' will truncate the
             * string and add ellipses to the front, 'back' (or any other value) will add the ellipses to the back.
             * @param {String=} [ellipses='...'] The string value of the ellipses. Use this to add anything other than '...'
             * @returns {String} A truncated string with ellipses (if its length is greater than 'length')
             * @function
             */
            ellipses: function ellipses_ (s, length, place, ellipses) {
                if(isNaN(parseInt(length, 10))) length = s.length;
                if(length < 0 || !isFinite(length)) length = 0;

                ellipses = typeof ellipses === 'string' ? ellipses : '...';
                if(s.length <= length) return s;

                if(length <= ellipses.length) {
                    return ellipses.substring(0, length);
                }
                else if(!place || place !== 'front') {
                    return s.substr(0, length - ellipses.length) + ellipses;
                }
                else {
                    return ellipses + s.substr(0, length - ellipses.length);
                }
            },

            /**
             * Shuffles a string
             * @param {String} s The string to operate on.
             * @param {String} splitter A string used to split the string, to tokenize it before shuffling.
             * @return {String} The mixed up string.
             */
            shuffle: function shuffle (s, splitter) {
                var a = s.split(typeof splitter === 'string' ? splitter : ''), n = a.length,
                replaceSplits = n - 1;

                for(var i = n - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1)),
                        tmp = a[i];

                    a[i] = a[j];
                    a[j] = tmp;
                }

                for(var k = 0; k < replaceSplits; k++) a.splice(libs.number.randomIntInRange(0, a.length), 0, splitter);
                return a.join('');
            },

            /**
             * Reverses a string.
             * @param {String} s The string to operate on.
             * @return {String} The reversed string.
             */
            reverse: function reverse (s) {
                if(s.length < 64) {
                    var str = '';
                    for(var i = s.length; i >= 0; i--) str += s.charAt(i);
                    return str;
                }
                else {
                    return s.split('').reverse().join('');
                }
            },

            /**
             * Strips the trailing slashes from a string.
             * @param {String} s The string to operate on.
             * If using Node.js, it will replace the trailing slash based on the value of os.platform
             * (i.e. if windows, '\\' will be replaced, '/' otherwise).
             * @returns {String} The string without a trailing slash.
             * @function
             */
            withoutTrailingSlash: function withoutTrailingSlash (s) {
                if(!IS_BROWSER && HAS_OS && require('os').platform === 'win32') return s.replace(/\\+$/, '');
                return s.replace(/\/+$/, '');
            },

            /**
             * Add a trailing slash to a string, if it doesn't already have one.
             * If using Node.js, it will replace the trailing slash based on the value of os.platform
             * (i.e. if windows, '\\' will be replaced, '/' otherwise).
             * @param {String} s The string to operate on.
             * @returns {String} The string without a trailing slash.
             * @function
             */
            withTrailingSlash: function withTrailingSlash (s) {
                if(!IS_BROWSER && HAS_OS && require('os').platform === 'win32') return libs.string.withoutTrailingSlash(s) + '\\';
                return libs.string.withoutTrailingSlash(s) + '/';
            },

            /**
             * Escapes regular expression special characters. This is useful is you wish to create a new regular expression
             * from a stored string value.
             * @param {String} s The string to operate on.
             * @returns {String} The regular expression safe string
             * @function
             */
            regexpSafe: function regexpSafe (s) {
                return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            },

            /**
             * Pads a string with 'delim' characters to the specified length. If the length is less than the string length,
             * the string will be truncated.
             * @param {String} s The string to operate on.
             * @param {Number} length The length to pad the string to. If less that the length of the string, the string will
             * be returned. If less than the length of the string, the string will be sliced.
             * @param {String=} [delim=' '] The character to pad the string with.
             * @param {Boolean=} [pre=false] If true, the padding will be added to the beginning of the string, otherwise the padding
             * will be added to the end.
             * @returns {String} The padded string
             * @function
             */
            pad: function pad (s, length, delim, pre) {
                var i, thisLength = s.length;

                if(!delim) delim = ' ';
                if(length === 0) return ''; else if(isNaN(parseInt(length, 10))) return s;

                length = parseInt(length, 10);
                if(length < thisLength) return !pre ? s.slice(0, length) : s.slice(-length);

                if(pre) {
                    for(i = 0; i < length - thisLength; i++) s = delim + s;
                }
                else {
                    for(i = 0; i < length - thisLength; i++) s += delim;
                }
                return s;
            },

            /**
             * Replaces newlines with br tags.
             * @param {String} s The string to operate on.
             * @return {String} The string with newlines converted to br tags.
             */
            newlineToBreak: function newlineToBreak (s) {
                return s.replace(/(\r\n|\n)/g, '<br>');
            },

            /**
             * Replaces tabs with a span element with the class 'tab'
             * @param {String} s The string to operate on.
             * @return {String} The string with tabs converted to spans with the class 'tab'
             */
            tabsToSpan: function tabsToSpan (s) {
                return s.replace(/\t/g, '<span class="tab"></span>');
            },

            /**
             * Adjusts a string to fit within the confines of 'width', without breaking words.
             * @param {String} s The string to operate on.
             * @param {Number=} [length=120] The length to word wrap the string to.
             * @param {Number=} [padleft=0] The number of columns to pad the string on the left
             * @param {Number=} [padright=0] The number of columns to pad the string on the right
             * @param {Boolean=} omitFirst If true, the first line will not be padded left
             * @return {String} The string adjusted and padded for the stdout.
             * @function
             */
            wordWrapToLength: function wordWrapToLength (s, width, padleft, padright, omitFirst) {
                if(padright === undefined && padleft) padright = padleft;

                padleft  = !isNaN(parseInt(padleft,  10)) ? parseInt(padleft, 10)  : 0;
                padright = !isNaN(parseInt(padright, 10)) ? parseInt(padright, 10) : 0;

                var paddingLeft = '';
                for(var n = 0; n < padleft;  n++) paddingLeft  += ' ';

                var cols   = !isNaN(parseInt(width, 10)) ? length : 120,
                    arr    = s.split(' '),
                    item   = null,
                    len    = !omitFirst ? cols - padright - padleft : cols - padright,
                    str    = !omitFirst ? paddingLeft : '',
                    olen   = cols - padright - padleft;

                while((item = arr.shift()) !== undefined) {
                    if(item.length < len) {
                        str += item + ' ';
                        len -= item.length + 1;
                    }
                    else if(item.length > olen) {
                        str += item.substring(0, len - 1) + '-\n' + paddingLeft;
                        arr.unshift(item.substring(len, item.length - 1));
                        len = cols - padright - padleft;
                    }
                    else {
                        str += '\n' + paddingLeft + item + ' ';
                        len = cols - padright - 1 - padleft - item.length;
                    }
                }
                return str;
            }
        },

        /**
         * Date library functions
         * @type {Object}
         */
        date: {
            /**
             * Moves a date forward 'daysInTheFuture' days.
             * @param {Date} The date object to operate on.
             * @param {Number} daysInTheFuture The number of days in the future to advance the date
             * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
             * @returns {Date} The date, adjusted the number of specified days.
             * @function
             */
            advanceDays: function advanceDays (d, daysInTheFuture, adjustForWeekend) {
                daysInTheFuture = daysInTheFuture && libs.generic.isNumeric(daysInTheFuture) ? daysInTheFuture : 1;
                d.setTime(d.getTime() + (daysInTheFuture * 86400000));

                if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                    while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                }
                return d;
            },

            /**
             * Moves a date forward 'monthsInTheFuture' months.
             * @param {Date} The date object to operate on.
             * @param {Number} monthsInTheFuture The number of months in the future to advance the date
             * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
             * @returns {Date} The date, adjusted the number of specified months.
             * @function
             */
            advanceMonths: function advanceMonths (d, monthsInTheFuture, adjustForWeekend) {
                monthsInTheFuture = monthsInTheFuture && libs.generic.isNumeric(monthsInTheFuture) ? monthsInTheFuture : 1;
                d.setTime(d.getTime() + (monthsInTheFuture * 2629746000));

                if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                    while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                }
                return d;
            },

            /**
             * Moves a date forward 'yearsInTheFuture' years.
             * @param {Date} The date object to operate on.
             * @param {Number} yearsInTheFuture The number of years in the future to advance the date
             * @param {Boolean=} [adjustForWeekend=false] Whether or not the date should fall on a weekend day
             * @returns {Date} The date, adjusted the number of specified years.
             * @function
             */
            advanceYears: function advanceYears (d, yearsInTheFuture, adjustForWeekend) {
                yearsInTheFuture = yearsInTheFuture && libs.generic.isNumeric(yearsInTheFuture) ? yearsInTheFuture : 1;
                d.setTime(d.getTime() + (yearsInTheFuture * 31536000000));

                if(adjustForWeekend && (d.getDay() === 0 || d.getDay() === 6)) {
                    while(d.getDay() === 0 || d.getDay() === 6) d.setTime(d.getTime() + 86400000);
                }
                return d;
            },

            /**
             * Returns the date in the yyyy-mm-dd format.
             * @param {Date} The date object to operate on.
             * @param {String} [delim='-'] The delimiter to used the separate the date components (e.g. '-' or '.')
             * @returns {String} The date in the yyyy-mm-dd format.
             * @function
             */
            yyyymmdd: function yyyymmdd (d, delim) {
                delim = typeof delim !== 'string' ? '-' : delim ;

                var dd   = d.getDate(),
                    mm   = d.getMonth() + 1,
                    yyyy = d.getFullYear();

                if(dd < 10) dd = '0' + dd;
                if(mm < 10) mm = '0' + mm;
                return yyyy + delim + mm + delim + dd;
            },

            /**
             * Converts a date to the HH:MM:SS.MSEC time format
             * @param {Date} The date object to operate on.
             * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
             * @returns {String} The formatted number, now a string.
             * @function
             */
            clockTime: function clockTime (d, omitMS) {
                return libs.number.clockTime(d.getTime(), !!omitMS);
            }
        },

        /**
         * Number library functions
         * @type {Object}
         */
        number: {

            /**
             * Returns a random integer in range [min, max] (inclusive)
             * @param {Number} min The minimum possible value (inclusive)
             * @param {Number} max The maximum possible value (inclusive)
             * @return {Number} A random number between min and max
             */
            randomIntInRange: function (min, max) {
                min = parseInt(min, 10);
                max = parseInt(max, 10);

                if(isNaN(min) && !isFinite(min)) min = 0;
                if(isNaN(max) && !isFinite(max)) max = Number.MAX_VALUE;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            /**
             * Returns a random float in range [min, max] (inclusive)
             * @param {Number} min The minimum possible value (inclusive)
             * @param {Number} max The maximum possible value (inclusive)
             * @return {Number} A random number between min and max
             */
            randomNumberInRange: function (min, max) {
                min = parseInt(min, 10);
                max = parseInt(max, 10);

                if(isNaN(min) && !isFinite(min)) min = 0;
                if(isNaN(max) && !isFinite(max)) max = Number.MAX_VALUE;
                return Math.random() * (max - min + 1) + min;
            },

            /**
             * Recursively computes the factorial of the number n.
             * @param {Number} n A number.
             * @return {Number|Infinity} n!
             */
            factorial: function factorial (n) {
                if(typeof n !== 'number' || n < 0) return NaN;
                if(n > 170) return Infinity;
                if(n === 0 || n === 1) return 1;
                return n * factorial(n - 1);
            },

            /**
             * Determines is the given numbers are integers
             * @param {...Number} n Numbers.
             * @return {Boolean} True if all arguments are integers, false otherwise.
             */
            isInt: function isInt () {
                return libs.object.every(arguments, function (n) {
                    return typeof n === 'number' && n % 1 === 0 && n.toString().indexOf('.') === -1;
                });
            },

            /**
             * Recursively computes n choose k.
             * @param {Number} n A number.
             * @param {Number} k A number.
             * @return {Number|Infinity} n choose k.
             */
            choose: function choose (n, k) {
                if(typeof n !== 'number' || typeof k !== 'number') return NaN;
                if(k === 0) return 1;
                return (n * choose(n - 1, k - 1)) / k;
            },

            /**
             * Pads a number with preceeding zeros.
             * @param {Number} n The number object to operate on.
             * @param {Number} length The final length of the string
             * @returns {String} The padded number, now a string.
             * @function
             */
            pad: function pad (n, length) {
                return libs.string.pad(n.toString(), length, '0', true);
            },

            /**
             * Advances (or reverses) the date the specified number of days.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} The modified date.
             */
            daysFrom: function daysFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setDate(date.getDate() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of days.
             * @param {Number} n The number object to operate on.
             * @return {Date} A date object
             */
            daysFromNow: function daysFromNow (n) {
                return libs.number.daysFrom(n, new Date());
            },

            /**
             * Advances (or reverses) the date the specified number of days.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} The modified date.
             */
            secondsFrom: function secondsFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setSeconds(date.getSeconds() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of days.
             * @param {Number} n The number object to operate on.
             * @return {Date} A date object
             */
            secondsFromNow: function secondsFromNow (n) {
                return libs.number.secondsFrom(n, new Date());
            },

            /**
             * Advances (or reverses) the date the specified number of years.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} The modified date.
             */
            yearsFrom: function yearsFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setFullYear(date.getFullYear() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of years.
             * @return {Date} A date object
             */
            yearsFromNow: function yearsFromNow (n) {
                return libs.number.yearsFrom(n, new Date());
            },

            /**
             * Advances (or reverses) the date the specified number of months.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} The modified date.
             */
            monthsFrom: function monthsFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setMonth(date.getMonth() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of months.
             * @param {Number} n The number object to operate on.
             * @return {Date} A date object
             */
            monthsFromNow: function monthsFromNow (n) {
                return libs.number.monthsFrom(n, new Date());
            },

            /**
             * Advances (or reverses) the date the specified number of hours.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} The modified date.
             */
            hoursFrom: function hoursFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setHours(date.getHours() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of hours.
             * @param {Number} n The number object to operate on.
             * @return {Date} A date object
             */
            hoursFromNow: function hoursFromNow (n) {
                return libs.number.hoursFrom(n, new Date());
            },

            /**
             * Advances (or reverses) the date the specified number of minutes.
             * @param {Number} n The number object to operate on.
             * @param {Date} date The date to change.
             * @return {Date} A modified date.
             */
            minutesFrom: function minutesFrom (n, date) {
                if(typeof date === 'number') date = new Date(date);
                if(!(date instanceof Date))  date = new Date();

                date.setMinutes(date.getMinutes() + n);
                return date;
            },

            /**
             * Advances (or reverses) the current date the specified number of minutes.
             * @param {Number} n The number object to operate on.
             * @return {Date} The date object
             */
            minutesFromNow: function minutesFromNow (n) {
                return libs.number.minutesFrom(n, new Date());
            },

            /**
             * The time, months in the past.
             * @param {Number} n The number object to operate on.
             * @return {Date} A Date object.
             */
            monthsAgo: function monthsAgo (n) {
                return libs.number.minutesFromNow(-n, new Date());
            },

            /**
             * The time, days in the past.
             * @param {Number} n The number object to operate on.
             * @return {Date} A Date object.
             */
            daysAgo: function daysAgo (n) {
                return libs.number.daysFromNow(-n, new Date());
            },

            /**
             * The time, seconds in the past.
             * @param {Number} n The number object to operate on.
             * @return {Date} A Date object.
             */
            secondsAgo: function secondsAgo (n) {
                return libs.number.secondsFromNow(-n, new Date());
            },

            /**
             * The time, minutes in the past.
             * @param {Number} n The number object to operate on.
             * @return {Date} A Date object.
             */
            minutesAgo: function minutesAgo (n) {
                return libs.number.minutesFromNow(-n, new Date());
            },

            /**
             * The time, years in the past.
             * @param {Number} n The number object to operate on.
             * @return {Date} A Date object.
             */
            yearsAgo: function yearsAgo (n) {
                return libs.number.yearsFromNow(-n, new Date());
            },

            /**
             * Converts a number to the HH:MM:SS.MSEC time format
             * @param {Number} t The number object to operate on.
             * @memberof Number.prototype
             * @param {Boolean=} [omitMS=false] Whether or not to include the MS portion of the returned string
             * @returns {String} The formatted number, now a string.
             * @function
             */
            clockTime: function clockTime (t, omitMS) {
                var ms, secs, mins, hrs;

                ms = t % 1000;
                t = (t - ms) / 1000;

                secs = t % 60;
                t = (t - secs) / 60;

                mins = t % 60;
                hrs = (t - mins) / 60;

                return libs.number.pad(hrs.toString(), 2)  + ':' + libs.number.pad(mins.toString(), 2) + ':' +
                       libs.number.pad(secs.toString(), 2) + ((omitMS === true) ? '' : '.' + libs.number.pad(ms.toString(), 3));
            }
        },

        /**
         * Function library functions
         * @type {Object}
         */
        function: {

            /**
             * Inherit the prototype methods from one constructor into another.
             * @param {Function} constructor The inheriting constructor
             * @param {Function} superConstructor The parent constructor
             * @return {Function} The inheriting constructor
             */
            inherits: function inherits (constructor, superConstructor) {
                if (constructor === undefined || constructor === null)
                throw new TypeError('The constructor to "inherits" must not be ' + 'null or undefined');

                if (superConstructor === undefined || superConstructor === null)
                throw new TypeError('The super constructor to "inherits" must not ' + 'be null or undefined');

                if (superConstructor.prototype === undefined)
                throw new TypeError('The super constructor to "inherits" must ' + 'have a prototype');

                constructor.super_ = superConstructor;
                Object.setPrototypeOf(constructor.prototype, superConstructor.prototype);
                return constructor;
            },
        },

        /**
         * Array library functions
         * @type {Object}
         */
        array: {

            /**
             * Shuffles an array
             * @param {Array} a The Array object to operate on.
             * @return {Array<*>} The mixed up array
             */
            shuffle: function shuffle (a) {
                for(var i = a.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1)), tmp = a[i];
                    a[i] = a[j];
                    a[j] = tmp;
                }
                return a;
            },

            /**
             * Computes the union between the current array, and all the array objects passed in. That is,
             * the set of unique objects present in all of the arrays.
             * @param {Array} a The Array object to operate on.
             * @param {...Array} arr A list of array objects
             * @return {Array<*>} The union set of the provided arrays.
             */
            union: function union (a) {
                var args = libs.object.only(libs.object.toArray(arguments), 'array');

                var union = [];
                args.unshift(a);
                libs.object.each(args, function (array) {
                    libs.object.each(array, function (item) {
                        if(union.indexOf(item) === -1) union.push(item);
                    });
                });
                return union;
            },

            /**
             * Returns all the items unique to all arrays.
             * @param {...Array} arrays The Array objects to operate on.
             * @param {Array} other The array to compute the difference from.
             * @return {Array} A new array with items unique to each array.
             */
            difference: function difference () {
                var arrays = libs.object.only(libs.object.toArray(arguments), 'array');

                if(arrays.length === 0) return [];
                if(arrays.length === 1) return libs.object.copy(arrays[0]);
                var i, simpleDiff = [];

                if(arrays.length === 2) {
                    for(i = 0; i < arrays[0].length; i++)
                        if(arrays[1].indexOf(arrays[0][i]) === -1) simpleDiff.push(arrays[0][i]);

                    for(i = 0; i < arrays[1].length; i++)
                        if(arrays[0].indexOf(arrays[1][i]) === -1) simpleDiff.push(arrays[1][i]);

                    return simpleDiff;
                }

                var difference = arrays[0], intermediate = [];
                for(i = 1; i < arrays.length; i++) {
                    for(var n = 0; n < difference.length; n++) {
                        if(arrays[i].indexOf(difference[n]) === -1) {
                            intermediate.push(difference[n]);
                        }
                    }
                    for(var k = 0; k < arrays.length; k++) {
                        //if(arrays[i] !== arrays)
                    }
                    difference = intermediate;
                    intermediate = [];
                }

                return difference;
            },

            /**
             * Returns the items common to all arrays.
             * @param {...Array} items The arrays from which to compute the intersection.
             * @return {Array} A new array with items common to both arrays.
             */
            intersect: function intersect () {
                var arrays = libs.object.only(libs.object.toArray(arguments), 'array');

                if(arrays.length === 0) return [];
                if(arrays.length === 1) return libs.object.copy(arrays[0]);

                var intersection = arrays[0], intermediate = [];
                for(var i = 1; i < arrays.length; i++) {
                    for(var n = 0; n < intersection.length; n++) {
                        if(arrays[i].indexOf(intersection[n]) > -1) {
                            intermediate.push(intersection[n]);
                            var idx = arrays[i].indexOf(intersection[n]);
                            arrays[i].splice(idx, 1);
                        }
                    }
                    intersection = intermediate;
                    intermediate = [];
                }

                return intersection;
            },

            /**
             * Creates a new array from the current one, with all occurences of the provided arguments ommited.<br>
             * For example: <em>[1,2,3,4,5].without(1)</em> will return <em>[2,3,4,5]</em>
             * and <em>[1, null, 2, null, undefined].without(null, undefined)</em> will return <em>[1, 2]</em>
             * @param {Array} a The Array object to operate on.
             * @returns {Array<*>} A shallow copy of the array with the provided arguments ommited.
             * @function
             */
            without: function without () {
                var args = libs.object.toArray(arguments),
                    a    = args.shift(),
                    res  = [];

                libs.object.each(a, function (v) { if(args.indexOf(v) === -1) res.push(v); });
                return res;
            },

            /**
             * Rotates the array left or right the specified number of times. If the direction is left, it will shift off the
             * first <em>n</em> elements and push them to the end of the array. If right, it will pop off the last <em>n</em>
             * items and unshift them onto the front of the array.
             * @param {Array} a The Array object to operate on.
             * @param {String=} [direction='left'] The direction to rotate array members.
             * @param {Number=} [amount=1] The number of elements to shift
             * @return {Array<*>} The current array, shifted.
             * @function
             */
            rotate: function rotate (a, direction, amount) {
                if(direction && libs.object.isNumeric(direction) && !amount) {
                    amount    = direction;
                    direction = undefined;
                }

                if(!amount || (amount && !libs.object.isNumeric(amount))) amount = 1;
                for(var i = 0; i < amount; i++) {
                    if(direction !== 'right') a.push(a.shift()); else a.unshift(a.pop());
                }
                return a;
            },

            /**
             * Rotates the array left the specified number of times.
             * This is useful if trying to create a circular queue.
             * @param {Array} a The Array object to operate on.
             * @param {Number=} [amount=1] The number of times to rotate the array left.
             * @return {Array<*>} The current array, rotated left.
             * @function
             */
            rotateLeft: function rotateLeft (a, amount) {
                return libs.array.rotate(a, 'left', amount);
            },

            /**
             * Rotates the array right the specified number of times.
             * This is useful if trying to create a circular queue.
             * @param {Array} a The Array object to operate on.
             * @param {Number=} [amount=1] The number of times to rotate the array left.
             * @return {Array<*>} The current array, rotated right.
             * @function
             */
            rotateRight: function rotateLeft (a, amount) {
                return libs.array.rotate(a, 'right', amount);
            },

            /**
             * Removes duplicates from the current array.
             * This is a destructive action, and will modify the array in place.
             * @param {Array} a The Array object to operate on.
             * @returns {Array<*>} The current array, with duplicates removed.
             * @function
             */
            makeUnique: function makeUnique (a) {
                var visited = [];
                for(var i = 0; i < a.length; i++) {
                    if(visited.indexOf(a[i]) === -1) {
                        visited.push(a[i]);
                    }
                    else {
                        a.splice(i, 1);
                        i--; // Splice will affect the internal array pointer, so fix it...
                    }
                }
                return a;
            },

            /**
             * Gets an array of unique items from the current array.
             * @param {Array} a The Array object to operate on.
             * @returns {Array} A new array with no duplicate values.
             * @function
             */
            unique: function unique (a) {
                var visited = [],
                    unique  = [];

                libs.object.each(a, function (item) {
                    if(visited.indexOf(item) === -1) {
                        unique.push(item);
                        visited.push(item);
                    }
                });
                return unique;
            },

            /**
             * Sorts the array in ascending order.
             * This is a destructive action, and will modify the array in place.
             * @param {Array} a The Array object to operate on.
             * @returns {Array} The array sorted in ascending order.
             * @function
             */
            ascending: function ascending (a) {
                return a.sort(function (a, b) {
                    if(a !== undefined && a !== null) a = a.toString();
                    if(b !== undefined && b !== null) b = b.toString();
                    return a < b ? -1 : a > b ? 1 : 0;
                });
            },

            /**
             * Sorts the array in descending order.
             * This is a destructive action, and will modify the array in place.
             * @param {Array} a The Array object to operate on.
             * @returns {Array} The array sorted in descending order.
             * @function
             */
            descending: function descending (a) {
                return a.sort(function (a, b) {
                    if(a !== undefined && a !== null) a = a.toString();
                    if(b !== undefined && b !== null) b = b.toString();
                    return a > b ? -1 : a < b ? 1 : 0;
                });
            }
        },

        /**
         * Array library functions
         * @type {Object}
         */
        object: {

            /**
             * Computes the frequencies for each item in all of arguments.
             * @param {...*} objs The objects to compute the histogram from.
             * @return {Object<Number>} An object that has the items from all of the arguments as its keys and their frequencies as it's values.
             */
            histogram: function histogram () {
                var histogram = {};
                libs.object.every(arguments, function (o) {
                    if(typeof o === 'boolean') {
                        if(!histogram[o]) histogram[o] = 1; else histogram[o]++;
                    }
                    else if(typeof o === 'function') {
                        if(!histogram['function']) histogram['function'] = 1; else histogram[o]++;
                    }
                    else {
                        libs.object.every(o, function (val) {
                            switch(true) {
                                case typeof val === 'function':
                                case typeof val === 'undefined':
                                    val = typeof val;
                                    break;
                                case typeof val === 'object' && val === null:
                                    val = 'null';
                                    break;
                                case typeof val === 'object' && val instanceof Array:
                                    val = 'array';
                                    break;
                                case typeof val === 'object':
                                    val = 'object';
                                    break;
                                default:
                                    val = val.toString();
                            }

                            if(typeof histogram[val] !== 'number') histogram[val] = 0;
                            histogram[val]++;
                        });
                    }
                });
                return histogram;
            },

            /**
             * Creates a shallow copy of 'item'.
             * @param {*} item The item to shallow "copy".
             * @return {*} A shallow copy of the item.
             */
            copy: function copy (item) {
                var copy;
                if(!item) return item;

                switch (typeof item) {
                    case 'string':
                    case 'number':
                    case 'function':
                    case 'boolean':
                        return item;

                    default:
                        if(item instanceof Array) {
                            copy = [];
                        }
                        else {
                            copy = {};
                        }
                }

                libs.object.every(item, function (o, k) { copy[k] = o; });
                return copy;
            },

            /**
             * Returns the number of occurences of "what"
             * @param {*} obj The item to count the occurences of "what" in.
             * @param {*} what The item to count the occurences of the item in the array.
             * @return {[type]} [description]
             */
            occurrencesOf: function occurrencesOf (obj, what) {
                if(arguments.length < 2) return 0;

                if(typeof obj === 'boolean') {
                    return 0;
                }
                if(typeof obj === 'number') {
                    return occurrencesOf(obj.toString(), what);
                }
                else if(typeof obj === 'function') {
                    return occurrencesOf(fixFirefoxFunctionString(obj.toString()), what);
                }

                var count = 0;
                if(typeof obj === 'string') {
                    if(typeof what === 'string' || typeof what === 'number') {
                        var regexp = new RegExp(what.toString(), 'g'), m;
                        while(m = regexp.exec(obj)) count++;
                    }
                }
                else if(typeof obj !== 'string') {
                    libs.object.every(obj, function (item) {
                        if(item === what) count++;
                    });
                }
                return count;
            },

            /**
             * Returns the object's keys.
             * @param {Object} o The object to operate on.
             * @returns {Array<String|Number>} The object's key set
             * @function
             */
            keys : function keys (o) {
                var keys = Object.keys(o), idx;
                if(libs.object.isArguments(o)) {
                    idx = keys.indexOf('length');
                    if(idx > -1) keys.splice(idx, 1);
                }
                return keys;
            },

            /**
             * Returns the 'size' or 'length' of an object.
             * <ul>
             *      <li> String   -> The string's length  </li>
             *      <li> Number   -> The number of digits </li>
             *      <li> Object   -> The number of keys   </li>
             *      <li> Array    -> The number of items  </li>
             *      <li> Function -> 1                    </li>
             * </ul>
             * @param {Object} o The object to operate on.
             * @returns {Number} The number of items within the object.
             * @function
             */
            size: function size (o) {
                switch(true) {
                    case typeof o === 'function':
                        return 1;

                    case typeof o === 'number':
                        return o.toString().length;

                    case o instanceof Array:
                    case typeof o === 'string':
                        return o.length;

                    case libs.object.isArguments(o) && typeof o.length !== 'undefined':
                        return o.length - 1;

                    case o && typeof o === 'object':
                        return Object.keys(o).length;

                    default:
                        return 0;
                }
            },

            /**
             * Determines if an object can be converted to a number.
             * @param {...Object} o The object to operate on.
             * @returns {Boolean} True if the object is numeric, false otherwise.
             * @function
             */
            isNumeric: function isNumeric () {
                return libs.object.every(arguments, function (item) {
                    return !isNaN(parseFloat(item)) && isFinite(item);
                });
            },

            /**
             * Converts an object to a number.
             * @param {...Object} o The object to operate on.
             * @returns {Number} The object as a number.
             * @function
             */
            getNumeric: function getNumeric () {
                var res = [], len = arguments.length;
                libs.object.every(arguments, function (item) {
                    res.push(!isNaN(parseFloat(item)) && isFinite(item));
                });
                return len === 1 ? res[0] : res;
            },

            /**
             * Determines if an object has no keys, if an array has no items, or if a string === ''.
             * @param {...Object} o The object to operate on.
             * @returns {Boolean} True if the object is 'empty', false otherwise.
             * @function
             */
            isEmpty: function isEmpty () {
                return libs.object.every(arguments, function (item) {
                    return libs.object.size(item) === 0 && item !== false && item !== '' && item !== true;
                });
            },

            /**
             * True if the objects passed in are all arrays, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is an array, false otherwise.
             */
            isArray: function isArray () {
                return libs.object.every(arguments, function (item) {
                    return item instanceof Array;
                });
            },

            /**
             * True if the objects passed in are all objects and not arrays, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is an object and not an array, false otherwise.
             */
            isPureObject: function isPureObject () {
                return libs.object.every(arguments, function (item) {
                    return !(item instanceof Array) && typeof item === 'object';
                });
            },

            /**
             * True if the objects passed in are all strings, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is a string, false otherwise.
             */
            isString: function isString () {
                return libs.object.every(arguments, function (item) {
                    return typeof item === 'string';
                });
            },

            /**
             * True if the objects passed in are all booleans, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is a boolean, false otherwise.
             */
            isBoolean: function isBoolean () {
                return libs.object.every(arguments, function (item) {
                    return typeof item === 'boolean';
                });
            },

            /**
             * True if the objects passed in are allfunction, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is a function, false otherwise.
             */
            isFunction: function isFunction () {
                return libs.object.every(arguments, function (item) {
                    return typeof item === 'function';
                });
            },

            /**
             * True if the objects passed in are allll, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is a function, false otherwise.
             */
            isNull: function isNull () {
                return libs.object.every(arguments, function (item) {
                    return item === null;
                });
            },

            /**
             * True if the objects passed in are all undefined, false otherwise.
             * @param {...Object} o The object to operate on.
             * @return {Boolean} True if the object is a function, false otherwise.
             */
            isUndefined: function isUndefined () {
                return libs.object.every(arguments, function (item) {
                    return item === undefined;
                });
            },

            /**
             * True if the objects passed in are all arguments objects, false otherwise.
             * @param {Object} o The object to operate on.
             * @return {Boolean} True if the object is an arguments object, false otherwise
             */
            isArguments: function isArguments () {
                return libs.object.every(arguments, function (item) {
                    return Object.prototype.toString.call(item) === '[object Arguments]';
                });
            },

            /**
             * Convers an object to a number, if possible.
             * @param {...Object} o The object to operate on.
             * @returns {Number} The object as a float or NaN.
             * @function
             */
            toNumber: function toNumber () {
                var vals = [];
                libs.object.every(arguments, function (o) {
                    vals.push(libs.object.isNumeric(o) ? parseFloat(o) : NaN);
                });
                return vals.length === 1 ? vals[0] : vals;
            },

            /**
             * Convers an object to an integer, if possible.
             * @param {Object} o The object to operate on.
             * @returns {Number} The object as an integer or NaN.
             * @function
             */
            toInt: function toInt () {
                var vals = [];
                libs.object.every(arguments, function (o) {
                    var radix = /^0x/.test(o) ? 16 : 10; // Check for hex string
                    vals.push(libs.object.isNumeric(o) ? parseInt(o, radix) : NaN);
                });
                return vals.length === 1 ? vals[0] : vals;
            },

            /**
             * Returns a random array item, random object property, random character in a string, or random digit in a number.
             * @param {Object} o The object to operate on.
             * @returns {*}
             * @function
             */
            random: function random (o) {
                if(typeof o === 'object') {
                    return o instanceof Array ?
                        o[Math.floor(Math.random() * o.length)] :
                        o[Object.keys(o)[Math.floor(Math.random() * Object.keys(o).length)]];
                }
                else if(typeof o === 'string' || typeof o === 'number') {
                    var val = o, negative = false;

                    if(o.length === 0) return '';
                    if(typeof o === 'number' && o < 0) {
                        negative = true;
                        val = Math.abs(val);
                    }

                    val = val.toString()[Math.floor(Math.random() * val.toString().length)];
                    if(typeof o === 'number') val = parseInt(val, 10);
                    return negative ? -val : val;
                }
                return o;
            },

            /**
             * Invokes the callback 'f' for each property the object contains. If this is called
             * on a number or function, the object will be cast to a string.<br><br>
             * The callback `f` will be invoked with the following arguments:
             * <ul>
             * 	<li>value     - The value of the current object being iterated over</li>
             * 	<li>key       - The key of the current object (if an object, the index if an array)</li>
             * 	<li>iteration - The current iteration (same as key if a string or array)</li>
             * 	<li>exit      - A function which will break the loop and return the values passed to it,
             * 					or a single value if only a single value is passed.</li>
             * </ul>
             * @function
             * @param {Object} o The object to operate on.
             * @param {Number=} [rangeA=0] The iteration start index
             * @param {Number=} [rangeB='length of the item'] The iteration end index
             * @param {Function} f The callback to invoke for each item within the object
             * @returns {*} The value passed to the exit parameter of the callback...
             */
            each: function each (o, rangeA, rangeB, f) {

                // Can't use last here.. would cause circular ref...
                f = undefined;
                for(var k = arguments.length - 1; k >= 0; k--) {
                    if(arguments[k] instanceof Function) {
                        f = arguments[k];
                        break;
                    }
                }

                var ret    = null,
                    broken = false,
                    self   = o,
                    keys, property, value,

                    exit = function () {
                        broken   = true;
                        ret      = arguments.length > 1 ? libs.object.toArray(arguments) : arguments[0];
                    };

                if(f instanceof Function) {
                    if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                    // Firefox does some funky stuff here...
                    if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                    // For Safari
                    var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                    keys = Object.keys(self);
                    idx  = keys.indexOf('length');

                    if(isArgs && idx > -1) keys.splice(idx, 1);

                    rangeA = parseInt(rangeA);
                    rangeA = (isNaN(rangeA) || !isFinite(rangeA)) ? 0 : rangeA;

                    rangeB = parseInt(rangeB);
                    rangeB = (isNaN(rangeB) || !isFinite(rangeB)) ? keys.length : rangeB;

                    var i = 0, n;
                    if(Math.abs(rangeA) > Math.abs(rangeB)) {
                        if(rangeB < 0) rangeB = 0;
                        if(rangeA < 0) rangeA = 0;
                        if(rangeA > keys.length - 1) rangeA = keys.length - 1;

                        for(n = rangeA; n >= rangeB; n--) {
                            property = keys[n];
                            value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                            f.call(o, value, property, n, exit, i++, o);
                            if(broken) break;
                        }
                    }
                    else {
                        rangeB = rangeB + 1 > keys.length ? keys.length : rangeB + 1;
                        if(rangeB < 0) rangeB = 0;
                        if(rangeA < 0) rangeA = 0;

                        for(n = rangeA; n < rangeB; n++) {
                            property = keys[n];
                            value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                            f.call(o, value, property, n, exit, i++, o);
                            if(broken) break;
                        }
                    }
                }
                return ret;
            },

            /**
             * Invokes the callback 'f' for every property the object contains. If the callback returns false, the
             * loop is broken and false is returned; otherwise true is returned.
             * @param {Object} o The object to operate on.
             * @param {Function} f The callback to invoke for each item within the object
             * @returns {Boolean} True if none of the callback invocations returned false.
             * @function
             */
            every: function every (o, f) {
                f = f instanceof Function ? f : undefined;

                if(f instanceof Function) {
                    var self = o, keys, property, value;
                    if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                    // Firefox does some funky stuff here...
                    if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                    // For Safari...
                    var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                    keys = Object.keys(self);
                    idx  = keys.indexOf('length');

                    if(isArgs && idx > -1) keys.splice(idx, 1);

                    var i = 0;
                    for(var n = 0; n < keys.length; n++) {
                        property = keys[n];
                        value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                        if(f.call(o, value, property, n, i++, o) === false) return false;
                    }
                }
                return true;
            },

            /**
             * Invokes the callback 'f' for every property the object contains. If the callback returns true, the
             * loop is broken and false is returned; otherwise true is returned.
             * @param {Object} o The object to operate on.
             * @param {Function} f The callback to invoke for each item within the object
             * @returns {Boolean} True if none of the callback invocations returned false.
             * @function
             */
            any: function any (o, f) {
                f = f instanceof Function ? f : undefined;

                if(f instanceof Function) {
                    var self = o, keys, property, value;
                    if(typeof self === 'number' || typeof self === 'function' || typeof self === 'boolean') self = o.toString();

                    // Firefox does some funky stuff here...
                    if(typeof o === 'function') self = fixFirefoxFunctionString(self);

                    // For Safari...
                    var isArgs = Object.prototype.toString.call(o) === '[object Arguments]', idx = -1;
                    keys = Object.keys(self);
                    idx  = keys.indexOf('length');

                    if(isArgs && idx > -1) keys.splice(idx, 1);

                    var i = 0;
                    for(var n = 0; n < keys.length; n++) {
                        property = keys[n];
                        value    = (typeof o === 'number' && !isNaN(parseFloat(self[property]))) ? parseFloat(self[property]) : self[property];
                        var ret = f.call(o, value, property, n, i++, o);
                        if(ret !== undefined) return ret;
                    }
                }
                return undefined;
            },

            /**
             * Converts an object to an array. For strings, numbers, and functions this will
             * return a char array to their respective .toString() values
             * @param {Object} o The object to operate on.
             * @function
             * @return {Array<*>} The object, converted to an array.
             */
            toArray: function toArray (o) {
                if(o instanceof Array) return libs.object.copy(o);
                var arr = [];
                libs.object.each(o, function (val) { arr.push(val); });
                return arr;
            },

            /**
             * Returns the first n elements of an object. If the object is an array, and only one items is retrieved,
             * that item will be returned, rather than an array.
             * @param {Object} o The object to operate on.
             * @param {Number=} [n=1] The number of elements to return
             * @return {Array<*>} The first n elements of the array.
             */
            first: function first (o, n) {
                n = parseInt(n, 10);
                n = isNaN(n) || !isFinite(n) ? 1 : n;
                var v = null;

                if(typeof o === 'boolean') {
                    return o;
                }
                else if(typeof o !== 'object') {
                    if(n !== 0) v = o.toString().slice(0, n); else return null;
                }
                else if(o instanceof Array) {
                    if(n === 1) return o[0];
                    return n !== 0 ? o.slice(0, n) : [];
                }
                else {
                    v = {};
                    libs.object.each(o, 0, n - 1, function (item, key) { v[key] = item; });
                    var keys = Object.keys(v);
                    return keys.length === 1 ? v[keys[0]] : v;
                }
                return v.length === 1 ? v[0] : v;
            },

            /**
             * Returns the last n elements of an object. If the object is an array, and only one items is retrieved,
             * that item will be returned rather than an array.
             * @param {Object} o The object to operate on.
             * @param {Number=} [n=1] The number of elements to return
             * @return {Array<*>} The last n elements of the array.
             * @function
             */
            last: function last (o, n) {
                if(typeof o === 'boolean') return o;

                n = parseInt(n, 10);
                n = isNaN(n) || !isFinite(n) ? 1 : n;
                var v = null, keys, len = libs.object.size(o), idx;

                if(typeof o === 'boolean') {
                    return o;
                }
                else if(libs.object.isArguments(o)) {
                    keys = Object.keys(o);
                    idx  = keys.indexOf('length');

                    if(idx > -1) keys.splice(idx, 1);
                    v = []; len = keys.length;
                    // Arguments object should ignore undefined members...
                    libs.object.each(keys, 0, len, function (k) { if(o[k] !== undefined) v.unshift(o[k]); });
                    v = v.slice(0, n);
                }
                else if(typeof o !== 'object') {
                    if(n !== 0) v = o.toString().slice(-n); else return null;
                }
                else if(o instanceof Array) {
                    if(n === 1) return o[o.length -1];
                    return n !== 0 ? o.slice(-n) : [];
                }
                else {
                    v = {};
                    if(n < 0) n = 0;
                    libs.object.each(o, len - n, len, function (item, key) { v[key] = item; });
                    keys = Object.keys(v);
                    return keys.length === 1 ? v[keys[0]] : v;
                }
                return v.length === 1 ? v[0] : v.length > 0 ? v : null;
            },

            /**
             * If the last item in the object is a function, it will be returned. Otherwise, an "empty" function will be returned.
             * Useful for ensuring that a callback can always be invoked, without checking if the argument is a function
             * over and over.
             * @param {Object} o The object to get the callback for.
             * @return {Function} If the last item in the object is a function, it will be returned. Otherwise, an "empty" function will be returned.
             */
            getCallback: function getCallback (o) {
                var last = libs.object.last(o);
                return last instanceof Function ? last : NULL_FUNCTION;
            },

            /**
             * Find a child of an object using the given path, split by the given delimiter (or '.' by default)
             * @param {Object} o The object to operate on.
             * @param {String} path The path to the child object
             * @param {String=} [delimiter='.'] The path delimiter
             * @param {Function=} done A callback for completion
             * @return {*|Null} The child object at the given string path, or null if it doesn't exist.
             * @function
             */
            findChildAtPath: function findChildAtPath (o, path, delimiter, original, invoked, done) {
                done = libs.object.getCallback(arguments);
                var self = o;

                original = (!(original instanceof Function) && original) ? original : self;
                invoked  = invoked || false;

                if(typeof o === 'object' && typeof path === 'string') {
                    delimiter = typeof delimiter === 'string' ? delimiter : '.';
                    path      = path.split(delimiter);

                    var p = path.shift();
                    if(p) {
                        return libs.object.each(o, function (o, k, i, exit) {
                            if(path.length === 0 && k === p) {
                                done.call(original, o, self, k);
                                invoked = true;
                                exit(o);
                            }
                            else {
                                var obj = libs.object.findChildAtPath(o, path.join(delimiter), delimiter, original, invoked, done);
                                if(obj !== null) exit(obj);
                            }
                        });
                    }
                }
                if(!invoked && original === self && done instanceof Function) done.call(original, null, self, null);
                return null;
            },

            /**
             * Produces a shallow clone of the object, that is, if JSON.stringify can handle it.<br>
             * The object must be non-circular.
             * @param {Object} o The object to operate on.
             * @return {*} A shallow clone of the object.
             * @function
             */
            clone: function clone (o) {
                if(typeof o === 'string' || typeof o === 'number') return o;

                try {
                    return JSON.parse(JSON.stringify(o));
                }
                catch (e) {
                    throw new Error('Unable to clone object: ' + e.message);
                }
            },

            /**
             * Filters an array or object using only the types allowed. That is, if the item in the array is of a type listed
             * in the arguments, then it will be added to the filtered array. In this case 'array' is a valid type.
             * @param {Object} o The object to operate on.
             * @param {...String} types A list of typeof types that are allowed in the array.
             * @return {Array<*>} An array filtered by only the allowed types.
             */
            only: function only (o, types) {
                types = libs.object.toArray(arguments);
                types.shift();

                // Allows the 'plural' form of the type...
                libs.object.each(types, function (type, key) { this[key] = type.replace(/s$/, ''); });

                if(typeof o !== 'object' || !o) return o;
                var isArray  = o instanceof Array ? true : false,
                    filtered = isArray ? [] : {},
                    typeArr  = types.indexOf('array'),
                    typeObj  = types.indexOf('object object');

                libs.object.each(o, function (item, key) {
                    var typeItem = types.indexOf(typeof item);

                    if(typeObj !== -1 && typeArr === -1) {
                        if((typeof item === 'object' && !(item instanceof Array)) || (typeof item !== 'object' && typeItem !== -1)) {
                            if(isArray) filtered.push(item); else filtered[key] = item;
                        }
                    }
                    else if(typeObj !== -1 && typeArr !== -1) {
                        types.push('object');
                        if(typeItem !== -1) {
                            if(isArray) filtered.push(item); else filtered[key] = item;
                        }
                    }
                    else if(typeItem !== -1 || (item instanceof Array && typeArr !== -1)) {
                        if(isArray) filtered.push(item); else filtered[key] = item;
                    }
                });
                return filtered;
            },

            /**
             * Filters an object using the given predicate function. For objects, a new object will be returned, with
             * the values that passed the predicate function. For strings, a new string will be returned with the characters
             * that passed the predicate function. For numbers, a new number will be returned with the digits that passed
             * the predicate function. Functions will be operated on as strings.
             * @param {Object} o The object to operate on.
             * @param {Function} predicate The function used to filter the object.
             * @return {*} The filtered object
             */
            where: function where (o, predicate) {
                if(!(predicate instanceof Function)) {
                    var temp = predicate;
                    predicate = function (i) { return i == temp; };
                }

                if(o === null || o === undefined) return o;
                if(typeof 0 === 'boolean') return predicate.call(o, o, 0);

                var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                    filtered = !isObject ? [] : {};

                libs.object.each(o, function (item, key) {
                    if(predicate.call(item, item, key)) {
                        if(isObject) filtered[key] = item; else filtered.push(item);
                    }
                });

                if(typeof o !== 'object') filtered = filtered.join('');
                return filtered;
            },

            /**
             * Filters an object by keys using the given predicate function.
             * @param {Object} o The object to operate on.
             * @param {Function} predicate The function used to filter the object.
             * @return {*} The filtered object
             */
            whereKeys: function whereKeys (o, predicate) {
                if(!(predicate instanceof Function)) {
                    var temp = predicate;
                    predicate = function (k) { return k == temp; };
                }

                if(o === null || o === undefined) return o;
                if(typeof 0 === 'boolean') return predicate.call(o, o, 0);

                var isObject = typeof o === 'object' && !(o instanceof Array) ? true : false,
                    filtered = !isObject ? [] : {};

                libs.object.each(o, function (item, key) {
                    if(predicate.call(key, key, item)) {
                        if(isObject) filtered[key] = item; else filtered.push(item);
                    }
                });

                if(typeof o !== 'object') filtered = filtered.join('');
                return filtered;
            },

            /**
             * For objects, inverts the objects keys/values. If the value isn't a number or array, it will be omitted.
             * For strings, it will reverse the string.
             * For number, it will compute the number's inverse (i.e. 1 / x).
             * For functions, invert returns a new function that wraps the given function and inverts it's result.
             * @param {Object} o The object to operate on.
             * @return {*} The inverse, as described above.
             */
            invert: function invert (o) {
                if(o === null || o === undefined) return o;
                if(typeof o === 'string')   return libs.string.reverse(o);
                if(typeof o === 'number')   return 1 / o;
                if(typeof o === 'boolean')  return !o;

                if(typeof o === 'function') {
                    return function () { return libs.object.invert(o.apply(o, arguments)); };
                }

                var obj = {};
                libs.object.each(o, function (item, key) {
                    if(typeof item === 'string' || typeof item === 'number') {
                        if(!obj[item]) {
                            obj[item] = key;
                        }
                        else {
                            var tmp = obj[item];
                            obj[item] = [];
                            obj[item].push(tmp, key);
                        }
                    }
                });

                return obj;
            },

            /**
             * Returns the maximum item in the object.
             * @param {Object} o The object to operate on.
             * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
             * @return {*} The maximum item in the object collection.
             */
            max: function max (o, func) {
                if(!o || typeof o !== 'object') return o;
                if(!(func instanceof Function)) func = undefined;
                var max, maxValue;

                if(!func) {
                    max = libs.object.first(o);
                    libs.object.each(o, 1, function (item) {
                        if(item >= max) max = item;
                    });
                }
                else {
                    max = libs.object.first(o);
                    maxValue = func.call(max, max);

                    libs.object.each(o, 1, function (item) {
                        if(func.call(item, item) >= maxValue) max = item;
                    });
                }
                return max;
            },

            /**
             * Returns the minimum item in the object.
             * @param {Object} o The object to operate on.
             * @param {Function=} func If passed, the function will be invoked for each item in the object collection.
             * @return {*} The minimum item in the object collection.
             */
            min: function min (o, func) {
                if(!o || typeof o !== 'object') return o;
                if(!(func instanceof Function)) func = undefined;

                if(typeof o !== 'object') return o;
                var min, minValue;

                if(!func) {
                    min = libs.object.first(o);
                    libs.object.each(o, 1, function (item) {
                        if(item <= min) min = item;
                    });
                }
                else {
                    min = libs.object.first(o);
                    minValue = func.call(min, min);

                    libs.object.each(o, 1, function (item) {
                        if(func.call(item, item) <= minValue) min = item;
                    });
                }
                return min;
            },

            /**
             * Tests whether or not the object has a method called 'method'.
             * @param {Object} o The object to operate on.
             * @param {String} method The name of the method to test existence for.
             * @return {Boolean} True if the object has a function called 'method', false otherwise.
             */
            implements: function _implements () {
                var args = libs.object.toArray(arguments),
                    a    = args.shift();

                if(!a) return false;
                return libs.object.every(args, function (m) {
                    if(!(a[m] instanceof Function)) return false;
                });
            },

            /**
             * Same as Object.j.implements, excepct with a hasOwnProperty check.
             * @param {Object} o The object to operate on.
             * @param {String} method The name of the method to test existence for.
             * @return {Boolean} True if the object has its own function called 'method', false otherwise.
             */
            implementsOwn: function implementsOwn (o, method) {
                var args = libs.object.toArray(arguments),
                    a    = args.shift();

                if(!a) return false;
                return libs.object.every(args, function (m) {
                    if(!(a[m] instanceof Function) || !o.hasOwnProperty(method)) return false;
                });
            }
        }
    };

    return libs;
}

(function () {
    'use strict';
    module.exports = libs;
}());

},{"os":4}],4:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6NkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gSWRlbnRpZmllci5cbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHZhciBmaWQgPSAwLFxuXG4gICAgLyoqXG4gICAgICogVHJ1ZSBpZiB0aGUgTm9kZS5qcyBlbnZpcm9ubWVudCBpcyBsb2FkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBJU19CUk9XU0VSID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCc7XG5cbiAgICAvLyBUaGlzIHByb3ZpZGVzIGEgd2F5IHRvIGRldGVybWluZSB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGNvbnN0cnVjdG9yIGluIGEgcGxhdGZvcm0gYWdub3N0aWMgd2F5Li4uXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgJ19fZ2V0X3Byb3RvbGliX25hbWVfXycsIHtcbiAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgIGdldCAgICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB0aGlzLl9fcHJvdG9saWJfbmFtZV9fICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19wcm90b2xpYl9uYW1lX18nLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtYmVyYWJsZSAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6IHR5cGVvZiB0aGlzLm5hbWUgPT09ICdzdHJpbmcnICYmIHRoaXMubmFtZSA/IHRoaXMubmFtZSA6ICdhbm9ueW1vdXM6JyArIGZpZCsrXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fX3Byb3RvbGliX25hbWVfXztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIFByb3RvTGliID0gZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgICAgICAvLyBQcmV2ZW50IEZ1bmN0aW9uLmNhbGwgb3IgYmluZGluZy4uLlxuICAgICAgICBpZighKHRoaXMgaW5zdGFuY2VvZiBQcm90b0xpYikpIHJldHVybiBuZXcgUHJvdG9MaWIoaGFuZGxlKTtcblxuICAgICAgICBoYW5kbGUgPSBoYW5kbGUgfHwgJ3AnO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHNlbGYgcmVmZXJlbmNlLlxuICAgICAgICAgKiBAdHlwZSB7UHJvdG9MaWJ9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSBsaWJyYXJ5IGZ1bmN0aW9ucyBoYXZlIGJlZW4gYXR0YWNoZWQgdG8gdGhlIHByb3RvdHlwZXMuXG4gICAgICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYXR0YWNoZWQgPSBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUG9pbnRzIHRvIHRoZSBjdXJyZW50IHRoaXMgaXRlbS5cbiAgICAgICAgICogQHR5cGUgeyp9XG4gICAgICAgICAqL1xuICAgICAgICBjdXJyZW50VGhpcyA9IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyBjYWNoZWQgbGlicmFyeSBwcm90byByZWZlcmVuY2Ugb2JqZWN0c1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgY2FjaGVkID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyB0aGUgY29uc3RydWN0b3IgY2hhaW4gZm9yIGVhY2ggcHJvdG90eXBlIGFzIGFuIGFycmF5LlxuICAgICAgICAgKiBGb3IgZXhhbXBsZTogeyBzdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZyddIH0uXG4gICAgICAgICAqIEFub3RoZXIgZXhhbXBsZTogeyBteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZycsICdteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmcnXSB9XG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBwcm90b0NoYWluID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBzdGF0aWMgbGlicmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgbGlicyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHByb3RvbGlicmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgbGlicDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBwcm90b3R5cGUsIGFuZCBhbGwgb3RoZXJzIHRoYXQgdGhpcyBwcm90b3R5cGUgaW5oZXJpdHMgZnJvbS5cbiAgICAgICAgICogV2hpY2ggbWVhbnMgaWYgJ3Byb3RvJyBpcyAnb2JqZWN0JywgYWxsIGNhY2hlIHdpbGwgYmUgZGVsZXRlZC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHByb3RvIFRoZSBwcm90b3R5cGUgdG8gZGVsZXRlIHRoZSBjYWNoZSBmb3IuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZGVsZXRlQ2FjaGVGb3JQcm90byAocHJvdG8pIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBwcm90b0NoYWluKSB7XG4gICAgICAgICAgICAgICAgaWYocHJvdG9DaGFpbi5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihwcm90b0NoYWluW2ldLmluZGV4T2YocHJvdG8pID4gLTEpIGRlbGV0ZSBjYWNoZWRbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwZW5kcyBhbGwgdGhlIGxpYnJhcnkgZnVuY3Rpb25zIHRvIHRoaXMgaW5zdGFuY2UgZm9yIHN0YXRpYyB1c2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gYXR0YWNoTGlicmFyeVRvU2VsZiAoKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gbGlicylcbiAgICAgICAgICAgICAgICBpZihsaWJzLmhhc093blByb3BlcnR5KGkpICYmICFzZWxmW2ldKSBzZWxmW2ldID0gbGlic1tpXTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZHMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIHRoZSBwcmltaXRpdmUgb2JqZWN0IHByb3RvdHlwZXMuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzICgpIHtcbiAgICAgICAgICAgIHZhciBwLCBjLCBvYmogPSB7fSwgaSwgbmFtZSxcblxuICAgICAgICAgICAgYWRkTWV0aG9kID0gZnVuY3Rpb24gYWRkTWV0aG9kIChvLCBrKSB7IGlmKCFvYmpba10pIG9ialtrXSA9IG87IH07XG5cbiAgICAgICAgICAgIGlmKCFhdHRhY2hlZCkge1xuICAgICAgICAgICAgICAgIGF0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgaGFuZGxlLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyB1c2VycyB0byBvdmVyd3JpdGUgdGhlIGhhbmRsZSBvbiBhIHBlciBpbnN0YW5jZSBiYXNpcy4uLlxuICAgICAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0aGlzW2hhbmRsZV0gIT09IHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgaGFuZGxlLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6IHZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJucyB0aGUgbGlicCBsaWJyYXJ5Li4uXG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqID0ge307IGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgcCA9IHRoaXMuX19wcm90b19fO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxhc3QgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkbyB7IC8vIFRoaXMgd2lsbCB0cmF2ZXJzZSB0aGUgcHJvdG95cGVzIG9mIHRoZSBvYmplY3QsIHNvIGluaGVyaXRlZCBwcm9wZXJ0aWVzIHdpbGwgYmUgbWFkZSBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gb2JqZWN0cyB1cCB0aGUgcHJvdG90eXBlIGNoYWluLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gcC5jb25zdHJ1Y3Rvci5fX2dldF9wcm90b2xpYl9uYW1lX187XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKC9eYW5vbnltb3VzOi8udGVzdChuYW1lKSkgbmFtZSA9ICdhbm9ueW1vdXMnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHAgJiYgbmFtZSAmJiB0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNhY2hlZFtjXSAmJiBpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFRoaXMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRbY107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGxpYnBbY10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighcHJvdG9DaGFpbltjXSkgcHJvdG9DaGFpbltjXSA9IFtjXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsYXN0KSBwcm90b0NoYWluW2xhc3RdLnVuc2hpZnQoYyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGhpcyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChsaWJwW2NdLCBhZGRNZXRob2QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlZFtjXSA9IG9iajtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IHdoaWxlKHAgPSBwLl9fcHJvdG9fXyk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyB0aGUgbGlicmFyeSBtZXRob2RzIGZyb20gdGhlIHByaW1pdGl2ZSBvYmplY3QgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiByZW1vdmVMaWJyYXJ5RnJvbVByb3RvdHlwZXMgKCkge1xuICAgICAgICAgICAgaWYoYXR0YWNoZWQpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgT2JqZWN0LnByb3RvdHlwZVtoYW5kbGVdO1xuICAgICAgICAgICAgICAgIGF0dGFjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZXMgdGhlIGxhc3QgaXRlbSBmcm9tIHRoZSAndGhpc1BvaW50ZXJTdGFjaycgYW5kIGludm9rZXMgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIHdpdGggaXQuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggdGhlIGN1cnJlbnQgJ3RoaXMnIHZhbHVlLlxuICAgICAgICAgKiBAcmV0dXJuIFRoZSByZXN1bHQgb2YgdGhlIGludm9jYXRpb24gb2YgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGN1cnJlbnRUaGlzICE9PSB1bmRlZmluZWQgJiYgY3VycmVudFRoaXMgIT09IG51bGwgPyBjdXJyZW50VGhpcy52YWx1ZU9mKCkgOiBjdXJyZW50VGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICBsaWJzID0gcmVxdWlyZSgnLi9saWIvbGlicycpKCk7XG4gICAgICAgIGxpYnAgPSByZXF1aXJlKCcuL2xpYi9saWJwJykobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgaGFuZGxlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoIFRoZSBuZXcgaGFuZGxlXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRIYW5kbGUgPSBmdW5jdGlvbiAoaCkge1xuICAgICAgICAgICAgaWYodHlwZW9mIGggPT09ICdzdHJpbmcnKSBoYW5kbGUgPSBoO1xuICAgICAgICAgICAgcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBhcHBseUxpYnJhcnlUb1Byb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRzIGEgbGlicmFyeSBtZXRob2QgdG8gYSBwcm90b3R5cGUuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBsaWJyYXJ5IG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW3Byb3RvPSdvYmplY3QnXSBUaGUgcHJvdG90eXBlIHRvIGFkZCB0by4gSWYgb21pdHRlZCwgaXQgd2lsbCBkZWZhdWx0IHRvIG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgYWRkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXh0ZW5kID0gZnVuY3Rpb24gKG5hbWUsIHByb3RvLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgfHwgIShjYWxsYmFjayBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgaWYoIXByb3RvIHx8IHR5cGVvZiBwcm90byAhPT0gJ3N0cmluZycpIHByb3RvID0gJ29iamVjdCc7XG5cbiAgICAgICAgICAgIGlmKCFsaWJwW3Byb3RvXSkgbGlicFtwcm90b10gPSB7fTtcbiAgICAgICAgICAgIGlmKCFsaWJzW3Byb3RvXSkgbGlic1twcm90b10gPSB7fTtcblxuICAgICAgICAgICAgbGlic1twcm90b11bbmFtZV0gPSBjYWxsYmFjaztcbiAgICAgICAgICAgIGxpYnBbcHJvdG9dW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoYywgYXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBkZWxldGVDYWNoZUZvclByb3RvKHByb3RvKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW12b2VzIGEgbGlicmFyeSBtZXRob2QgZnJvbSBhIHByb3RvdHlwZS5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHByb3RvIFRoZSBwcm90b3R5cGUgdG8gcmVtb3ZlIGZyb20uXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBsaWJyYXJ5IG1ldGhvZCB0byByZW1vdmUuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgcmVtb3ZlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmUgPSBmdW5jdGlvbiAobmFtZSwgcHJvdG8pIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBwcm90byAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKGxpYnBbcHJvdG9dICYmIGxpYnBbcHJvdG9dW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxpYnBbcHJvdG9dW25hbWVdO1xuICAgICAgICAgICAgICAgIGlmKGxpYnNbcHJvdG9dICYmIGxpYnNbcHJvdG9dW25hbWVdKSBkZWxldGUgbGlic1twcm90b11bbmFtZV07XG4gICAgICAgICAgICAgICAgZGVsZXRlQ2FjaGVGb3JQcm90byhwcm90byk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIHByb3RvdHlwZSBsaWJyYXJ5IHJlZmVyZW5jZSBmcm9tIHRoZSBvYmplY3QgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudW5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwbGllcyB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSBhbmQgYWxsIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgICogdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBhdHRhY2hMaWJyYXJ5VG9TZWxmKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSwgYW5kIGF0dGFjaCBhbGwgdGhlIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuLi5cbiAgICAgICAgc2VsZi5sb2FkKCk7XG4gICAgfTtcblxuICAgIHZhciB4ID0gbmV3IFByb3RvTGliKCdfJyk7XG5cbiAgICByZXR1cm4gIUlTX0JST1dTRVIgP1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyAgPSBQcm90b0xpYiA6XG4gICAgICAgIHdpbmRvdy5Qcm90b0xpYiA9IFByb3RvTGliIDtcbn0oKSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBmdW5jdGlvbiBsaWJwIChsaWJzLCBnZXRUaGlzVmFsdWVBbmRJbnZva2UpIHtcbiAgICAgICAgdmFyIGxpYnAgPSB7XG4gICAgICAgICAgICBzdHJpbmc6IHtcblxuICAgICAgICAgICAgICAgIGNhbWVsaXplOiBmdW5jdGlvbiBjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5jYW1lbGl6ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRlY2FtZWxpemU6IGZ1bmN0aW9uIGRlY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZGVjYW1lbGl6ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2VGcm9tU3RyaW5nOiBmdW5jdGlvbiBkaWZmZXJlbmNlRnJvbVN0cmluZyAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmRpZmZlcmVuY2VGcm9tU3RyaW5nKHMsIG90aGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlcGxhY2VUb2tlbnM6IGZ1bmN0aW9uIHJlcGxhY2VUb2tlbnMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVwbGFjZVN0cmluZ1Rva2VucyhzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludGVyc2VjdFN0cmluZzogZnVuY3Rpb24gaW50ZXJzZWN0U3RyaW5nIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuaW50ZXJzZWN0U3RyaW5nKHMsIG90aGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0ICh0aW1lcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVwZWF0KHMsIHRpbWVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJ0cmltOiBmdW5jdGlvbiBydHJpbSAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucnRyaW0ocywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsdHJpbTogZnVuY3Rpb24gbHRyaW0gKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmx0cmltKHMsIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaHRtbEVuY29kZTogZnVuY3Rpb24gaHRtbEVuY29kZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5odG1sRW5jb2RlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaHRtbERlY29kZTogZnVuY3Rpb24gaHRtbERlY29kZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5odG1sRGVjb2RlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWRkU2xhc2hlczogZnVuY3Rpb24gYWRkU2xhc2hlcyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5hZGRTbGFzaGVzKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdWNGaXJzdDogZnVuY3Rpb24gdWNGaXJzdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy51Y0ZpcnN0KHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbGNGaXJzdDogZnVuY3Rpb24gbGNGaXJzdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5sY0ZpcnN0KHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdGl0bGVDYXNlOiBmdW5jdGlvbiB0aXRsZUNhc2UgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcudGl0bGVDYXNlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKGluZGV4LCBjb3VudCwgYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5zcGxpY2UocywgaW5kZXgsIGNvdW50LCBhZGQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZWxsaXBzZXM6IGZ1bmN0aW9uIGVsbGlwc2VzXyAobGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmVsbGlwc2VzKHMsIGxlbmd0aCwgcGxhY2UsIGVsbGlwc2VzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKHNwbGl0dGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5zaHVmZmxlKHMsIHNwbGl0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJldmVyc2U6IGZ1bmN0aW9uIHJldmVyc2UgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmV2ZXJzZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhvdXRUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRob3V0VHJhaWxpbmdTbGFzaCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRoVHJhaWxpbmdTbGFzaCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRoVHJhaWxpbmdTbGFzaChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlZ2V4cFNhZmU6IGZ1bmN0aW9uIHJlZ2V4cFNhZmUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVnZXhwU2FmZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChsZW5ndGgsIGRlbGltLCBwcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnBhZChzLCBsZW5ndGgsIGRlbGltLCBwcmUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbmV3bGluZVRvQnJlYWs6IGZ1bmN0aW9uIG5ld2xpbmVUb0JyZWFrICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLm5ld2xpbmVUb0JyZWFrKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdGFic1RvU3BhbjogZnVuY3Rpb24gdGFic1RvU3BhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy50YWJzVG9TcGFuKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd29yZFdyYXBUb0xlbmd0aDogZnVuY3Rpb24gd29yZFdyYXBUb0xlbmd0aCAod2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndvcmRXcmFwVG9MZW5ndGgocywgd2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYXJyYXk6IHtcbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuc2h1ZmZsZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHVuaW9uOiBmdW5jdGlvbiB1bmlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS51bmlvbi5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2U6IGZ1bmN0aW9uIGRpZmZlcmVuY2UgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGlmZmVyZW5jZS5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludGVyc2VjdDogZnVuY3Rpb24gaW50ZXJzZWN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmludGVyc2VjdC5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhvdXQ6IGZ1bmN0aW9uIHdpdGhvdXQgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkud2l0aG91dC5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJvdGF0ZTogZnVuY3Rpb24gcm90YXRlIChkaXJlY3Rpb24sIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgZGlyZWN0aW9uLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlTGVmdDogZnVuY3Rpb24gcm90YXRlTGVmdCAoYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZUxlZnQoYSwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJvdGF0ZVJpZ2h0OiBmdW5jdGlvbiByb3RhdGVSaWdodCAoYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZVJpZ2h0KGEsIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtYWtlVW5pcXVlOiBmdW5jdGlvbiBtYWtlVW5pcXVlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkubWFrZVVuaXF1ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZnVuY3Rpb24gdW5pcXVlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkudW5pcXVlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYXNjZW5kaW5nOiBmdW5jdGlvbiBhc2NlbmRpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5hc2NlbmRpbmcoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkZXNjZW5kaW5nOiBmdW5jdGlvbiBkZXNjZW5kaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGVzY2VuZGluZyhhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbnVtYmVyOiB7XG5cbiAgICAgICAgICAgICAgICB0bzogZnVuY3Rpb24gdG9fIChrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0ludCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiAlIDEgPT09IDAgJiYgbi50b1N0cmluZygpLmluZGV4T2YoJy4nKSA9PT0gLTEpIGlzSW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpc0ludCA/IGxpYnMubnVtYmVyLnJhbmRvbUludEluUmFuZ2UobiwgaykgOiBsaWJzLm51bWJlci5yYW5kb21OdW1iZXJJblJhbmdlKG4sIGspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNJbnQ6IGZ1bmN0aW9uIGlzSW50ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmlzSW50KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmFjdG9yaWFsOiBmdW5jdGlvbiBmYWN0b3JpYWwgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZmFjdG9yaWFsKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2hvb3NlOiBmdW5jdGlvbiBjaG9vc2UgKGspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmNob29zZShuLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnBhZChuLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0Zyb206IGZ1bmN0aW9uIGRheXNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRheXNGcm9tTm93OiBmdW5jdGlvbiBkYXlzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tOiBmdW5jdGlvbiBzZWNvbmRzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbU5vdzogZnVuY3Rpb24gc2Vjb25kc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb206IGZ1bmN0aW9uIHllYXJzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeWVhcnNGcm9tTm93OiBmdW5jdGlvbiB5ZWFyc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbTogZnVuY3Rpb24gbW9udGhzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1vbnRoc0Zyb21Ob3c6IGZ1bmN0aW9uIG1vbnRoc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhvdXJzRnJvbTogZnVuY3Rpb24gaG91cnNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBob3Vyc0Zyb21Ob3c6IGZ1bmN0aW9uIGhvdXJzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbTogZnVuY3Rpb24gbWludXRlc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb21Ob3c6IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzQWdvOiBmdW5jdGlvbiBtb250aHNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0FnbzogZnVuY3Rpb24gZGF5c0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0FnbzogZnVuY3Rpb24gc2Vjb25kc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWludXRlc0FnbzogZnVuY3Rpb24gbWludXRlc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeWVhcnNBZ286IGZ1bmN0aW9uIHllYXJzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2xvY2tUaW1lKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBmdW5jdGlvbjoge1xuICAgICAgICAgICAgICAgIGluaGVyaXRzOiBmdW5jdGlvbiBpbmhlcml0cyAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5mdW5jdGlvbi5pbmhlcml0cyhvLCBzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICAgICAgaGlzdG9ncmFtOiBmdW5jdGlvbiBoaXN0b2dyYW0gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaGlzdG9ncmFtKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY29weTogZnVuY3Rpb24gY29weSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZWFjaDogZnVuY3Rpb24gZWFjaCAoc3RhcnQsIGVuZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmVhY2gobywgc3RhcnQsIGVuZCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgb2NjdXJyZW5jZXNPZjogZnVuY3Rpb24gb2NjdXJyZW5jZXNPZiAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qub2NjdXJyZW5jZXNPZihvLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGtleXM6IGZ1bmN0aW9uIGtleXMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qua2V5cyhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNpemU6IGZ1bmN0aW9uIHNpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Quc2l6ZShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzTnVtZXJpYzogZnVuY3Rpb24gaXNOdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGdldE51bWVyaWM6IGZ1bmN0aW9uIGdldE51bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZ2V0TnVtZXJpYyhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzRW1wdHk6IGZ1bmN0aW9uIGlzRW1wdHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNFbXB0eShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uIGlzQXJyYXkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNBcnJheShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzUHVyZU9iamVjdDogZnVuY3Rpb24gaXNQdXJlT2JqZWN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzUHVyZU9iamVjdChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzU3RyaW5nOiBmdW5jdGlvbiBpc1N0cmluZyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc1N0cmluZyhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiBpc1VuZGVmaW5lZCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc1VuZGVmaW5lZChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzTnVsbDogZnVuY3Rpb24gaXNOdWxsICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzTnVsbChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzQm9vbGVhbjogZnVuY3Rpb24gaXNCb29sZWFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQm9vbGVhbihvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uIGlzRnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNGdW5jdGlvbihvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzQXJndW1lbnRzOiBmdW5jdGlvbiBpc0FyZ3VtZW50cyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0FyZ3VtZW50cyhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRvTnVtYmVyOiBmdW5jdGlvbiB0b051bWJlciAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC50b051bWJlcihvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRvSW50OiBmdW5jdGlvbiB0b0ludCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC50b0ludChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIHRvQXJyYXkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9BcnJheShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGdldENhbGxiYWNrOiBmdW5jdGlvbiBnZXRDYWxsYmFjayAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gcmFuZG9tICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnJhbmRvbShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGV2ZXJ5OiBmdW5jdGlvbiBldmVyeSAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhbnk6IGZ1bmN0aW9uIGFueSAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuYW55KG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIGZpcnN0IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5maXJzdChvLCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGxhc3Q6IGZ1bmN0aW9uIGxhc3QgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lmxhc3Qobywgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmaW5kQ2hpbGRBdFBhdGg6IGZ1bmN0aW9uIGZpbmRDaGlsZEF0UGF0aCAocGF0aCwgZGVsaW1pdGVyLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5maW5kQ2hpbGRBdFBhdGgobywgcGF0aCwgZGVsaW1pdGVyLCBkb25lKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNsb25lOiBmdW5jdGlvbiBjbG9uZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5jbG9uZShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG9ubHk6IGZ1bmN0aW9uIG9ubHkgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm9ubHkuYXBwbHkobywgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3aGVyZTogZnVuY3Rpb24gd2hlcmUgKHByZWRpY2F0ZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC53aGVyZShvLCBwcmVkaWNhdGVGdW5jdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3aGVyZUtleXM6IGZ1bmN0aW9uIHdoZXJlS2V5cyAocHJlZGljYXRlRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LndoZXJlS2V5cyhvLCBwcmVkaWNhdGVGdW5jdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbnZlcnQ6IGZ1bmN0aW9uIGludmVydCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pbnZlcnQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtYXg6IGZ1bmN0aW9uIG1heCAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubWF4KG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWluOiBmdW5jdGlvbiBtaW4gKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm1pbihvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGltcGxlbWVudHM6IGZ1bmN0aW9uIF9pbXBsZW1lbnRzIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmltcGxlbWVudHMobywgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGltcGxlbWVudHNPd246IGZ1bmN0aW9uIGltcGxlbWVudHNPd24gKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW1wbGVtZW50c093bihvLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGF0ZToge1xuICAgICAgICAgICAgICAgIGFkdmFuY2VEYXlzOiBmdW5jdGlvbiBhZHZhbmNlRGF5cyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5hZHZhbmNlRGF5cyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWR2YW5jZU1vbnRoczogZnVuY3Rpb24gYWR2YW5jZU1vbnRocyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5hZHZhbmNlTW9udGhzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZHZhbmNlWWVhcnM6IGZ1bmN0aW9uIGFkdmFuY2VZZWFycyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5hZHZhbmNlWWVhcnMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHl5bW1kZDogZnVuY3Rpb24geXltbWRkIChkZWxpbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QueXltbWRkKGQsIGRlbGltKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lIChvbWl0TVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmNsb2NrVGltZShkLCAhIW9taXRNUyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGxpYnA7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzID0gbGlicDtcbn0oKSk7XG4iLCJmdW5jdGlvbiBsaWJzICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIElTX0JST1dTRVIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyxcbiAgICAgICAgSEFTX09TICAgICA9IElTX0JST1dTRVIgPyBmYWxzZSA6IHR5cGVvZiByZXF1aXJlKCdvcycpID09PSAnb2JqZWN0JztcblxuICAgIC8qKlxuICAgICAqIEFsdGVycyBGaXJlZm94J3MgRnVuY3Rpb24udG9TdHJpbmcoKSByZXN1bHRzIHRvIG1hdGNoIENocm9tZS9TYWZhcmkuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZnVuY3Rpb24uXG4gICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgYWx0ZXJlZCBzdHJpbmcsIHdpdGggbmV3bGluZXMgcmVwbGFjZWQgYW5kICd1c2Ugc3RyaWN0JyByZW1vdmVkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyAocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oPzpcXHIpP1xcbisvZywgJycpLnJlcGxhY2UoL1widXNlIHN0cmljdFwiO3wndXNlIHN0cmljdCc7L2csICcnKTtcbiAgICB9XG5cbiAgICB2YXIgTlVMTF9GVU5DVElPTiA9IGZ1bmN0aW9uIEVNUFRZX0NBTExCQUNLX1JFUExBQ0VNRU5UICgpIHt9O1xuXG4gICAgdmFyIGxpYnMgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0cmluZyBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgc3RyaW5nOiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2FtZWxpemVzIGFsbCBvZiB0aGUgcHJvdmlkZWQgc3RyaW5nIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSBzdHJpbmcgQSBsaXN0IG9mIHN0cmluZ3MgdG8gY2FtZWxpemUuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmc+fSBBbiBhcnJheSBvZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLCB3aXRoIGFsbCBzdHJpbmdzIGNhbWVsaXplZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2FtZWxpemU6IGZ1bmN0aW9uIGNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICBpZihzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgcyA9PT0gJ2Z1bmN0aW9uJykgcyA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcyA9IHMudG9TdHJpbmcoKS5yZXBsYWNlKC9bXmEtejAtOSRdL2dpLCAnXycpLnJlcGxhY2UoL1xcJChcXHcpL2csICckXyQxJykuc3BsaXQoL1tcXHNfXSsvZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHMsIDEsIHMubGVuZ3RoLCBmdW5jdGlvbiAoaSwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba10gPSBsaWJzLnN0cmluZy51Y0ZpcnN0KGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzID0gbGlicy5zdHJpbmcubGNGaXJzdChzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0Lmxlbmd0aCA9PT0gMSA/IHJldFswXSA6IHJldDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjYW1lbGl6ZXMgYWxsIG9mIHRoZSBwcm92aWRlZCBzdHJpbmcgYXJndW1lbnRzLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHN0cmluZyBBIGxpc3Qgb2Ygc3RyaW5ncyB0byBkZWNhbWVsaXplLlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn0gQW4gYXJyYXkgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cywgd2l0aCBhbGwgc3RyaW5ncyBkZWNhbWVsaXplZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGVjYW1lbGl6ZTogZnVuY3Rpb24gZGVjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHMgPT09ICdmdW5jdGlvbicpIHMgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcocy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBzLnRvU3RyaW5nKCkucmVwbGFjZSgvKFtBLVokXSkvZywgZnVuY3Rpb24gKCQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyAnICsgKHR5cGVvZiAkID09PSAnc3RyaW5nJyA/ICQudG9Mb3dlckNhc2UoKSA6ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHR5cGVvZiBzID09PSAnc3RyaW5nJyA/IHMudHJpbSgpIDogcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldC5sZW5ndGggPT09IDEgPyByZXRbMF0gOiByZXQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYWxsIHRoZSBjaGFyYWN0ZXJzIGZvdW5kIGluIG9uZSBzdHJpbmcgYnV0IG5vdCB0aGUgb3RoZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3RoZXIgVGhlIHN0cmluZyB0byBjb21wdXRlIHRoZSBkaWZmZXJlbmNlIGFnYWluc3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEEgZGlmZmVyZW5jZSBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpZmZlcmVuY2VGcm9tU3RyaW5nOiBmdW5jdGlvbiBkaWZmZXJlbmNlRnJvbVN0cmluZyAocywgb3RoZXIpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3RoZXIgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzICE9PSAnc3RyaW5nJykgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgdmFyIHNhcnIgPSBzLnNwbGl0KCcnKSwgb2FyciA9IG90aGVyLnNwbGl0KCcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kaWZmZXJlbmNlRnJvbUFycmF5KHNhcnIsIG9hcnIpLmpvaW4oJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyB0b2tlbnMgKHNuaXBwZXRzIG9mIHRleHQgd3JhcHBlZCBpbiBicmFja2V0cykgd2l0aCB0aGVpciB2YWx1ZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSB0b2tlbiByZXBsYWNlZCB2YWx1ZXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlcGxhY2VUb2tlbnM6IGZ1bmN0aW9uIHJlcGxhY2VUb2tlbnMgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5nZW5lcmljLnJlcGxhY2VTdHJpbmdUb2tlbnMocyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgb25seSB0aGUgY2hhcmFjdGVycyBjb21tb24gdG8gYm90aCBzdHJpbmdzXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3RoZXIgVGhlIHN0cmluZyB0byBjb21wdXRlIHRoZSBpbnRlcnNlY3Rpb24gYWdhaW5zdC5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGludGVyc2VjdGlvbiBiZXR3ZWVuIHRoZSB0d28gc3RyaW5ncy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW50ZXJzZWN0U3RyaW5nOiBmdW5jdGlvbiBpbnRlcnNlY3RTdHJpbmcgKHMsIG90aGVyKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG90aGVyICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyAhPT0gJ3N0cmluZycpIHJldHVybiBzO1xuICAgICAgICAgICAgICAgIHZhciBzYXJyID0gcy5zcGxpdCgnJyksIG9hcnIgPSBvdGhlci5zcGxpdCgnJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuaW50ZXJzZWN0QXJyYXkoc2Fyciwgb2Fycikuam9pbignJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlcGVhdCBhIHN0cmluZyAndGltZXMnIHRpbWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVzIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJlcGVhdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQgKHMsIHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgdGltZXMgPSBwYXJzZUludCh0aW1lcywgMTApO1xuICAgICAgICAgICAgICAgIHRpbWVzID0gaXNOYU4odGltZXMpIHx8ICFpc0Zpbml0ZSh0aW1lcykgfHwgdGltZXMgPD0gMCA/IDEgOiB0aW1lcztcblxuICAgICAgICAgICAgICAgIHZhciBvcyA9IHM7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IHRpbWVzOyBpKyspIHMgKz0gb3M7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJpZ2h0IHRyaW1zIGEgc3RyaW5nLiBTYW1lIGFzIFN0cmluZy50cmltLCBidXQgb25seSBmb3IgdGhlIGVuZCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbd2hhdD0nXFxcXHMrJ10gV2hhdCB0byB0cmltLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmlnaHQgdHJpbW1lZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcnRyaW06IGZ1bmN0aW9uIHJ0cmltIChzLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgd2hhdCA9IHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyA/IHdoYXQgOiAnXFxcXHMrJztcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKG5ldyBSZWdFeHAod2hhdCArICckJyksICcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTGVmdCB0cmltcyBhIHN0cmluZy4gU2FtZSBhcyBTdHJpbmcudHJpbSwgYnV0IG9ubHkgZm9yIHRoZSBiZWdpbm5pbmcgb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3doYXQ9J1xcXFxzKyddIFdoYXQgdG8gdHJpbS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGxlZnQgdHJpbW1lZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbHRyaW06IGZ1bmN0aW9uIGx0cmltIChzLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgd2hhdCA9IHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyA/IHdoYXQgOiAnXFxcXHMrJztcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKG5ldyBSZWdFeHAoJ14nICsgd2hhdCksICcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRXNjYXBlcyBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgSFRNTCBlc2NhcGVkIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBodG1sRW5jb2RlOiBmdW5jdGlvbiBodG1sRW5jb2RlIChzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgJyYnICA6ICcmYW1wOycsXG4gICAgICAgICAgICAgICAgICAgICc8JyAgOiAnJmx0OycsXG4gICAgICAgICAgICAgICAgICAgICc+JyAgOiAnJmd0OycsXG4gICAgICAgICAgICAgICAgICAgICdcIicgIDogJyZxdW90OycsXG4gICAgICAgICAgICAgICAgICAgICdcXCcnIDogJyYjMDM5OydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1smPD5cIiddL2csIGZ1bmN0aW9uIChtKSB7IHJldHVybiBtYXBbbV07IH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBVbi1lc2NhcGVzIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBIVE1MIGVzY2FwZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGh0bWxEZWNvZGU6IGZ1bmN0aW9uIGh0bWxEZWNvZGUgKHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFwID0ge1xuICAgICAgICAgICAgICAgICAgICAnJmFtcDsnICA6ICcmJyxcbiAgICAgICAgICAgICAgICAgICAgJyZsdDsnICAgOiAnPCcsXG4gICAgICAgICAgICAgICAgICAgICcmZ3Q7JyAgIDogJz4nLFxuICAgICAgICAgICAgICAgICAgICAnJnF1b3Q7JyA6ICdcIicsXG4gICAgICAgICAgICAgICAgICAgICcmIzAzOTsnIDogJ1xcJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoLygmYW1wO3wmbHQ7fCZndDt8JnF1b3Q7fCYjMDM5OykvZywgZnVuY3Rpb24gKG0pIHsgcmV0dXJuIG1hcFttXTsgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYW4gJ2V2YWwnIHNhZmUgc3RyaW5nLCBieSBhZGRpbmcgc2xhc2hlcyB0byBcIiwgJywgXFx0LCBcXG4sIFxcZiwgXFxyLCBhbmQgdGhlIE5VTEwgYnl0ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQSBzdHJpbmcgd2l0aCBzbGFzaGVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFkZFNsYXNoZXM6IGZ1bmN0aW9uIGFkZFNsYXNoZXMgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bXFxcXFwiJ1xcdFxcblxcZlxccl0vZywgJ1xcXFwkJicpLnJlcGxhY2UoL1xcdTAwMDAvZywgJ1xcXFwwJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGNhcGl0YWxpemVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciB1cHBlciBjYXNlZC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1Y0ZpcnN0OiBmdW5jdGlvbiB1Y0ZpcnN0IChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBsb3dlcmNhc2VkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBsb3dlciBjYXNlZC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBsY0ZpcnN0OiBmdW5jdGlvbiBsY0ZpcnN0IChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIGluIFRpdGxlIENhc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSB0aXRsZSBjYXNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGl0bGVDYXNlOiBmdW5jdGlvbiB0aXRsZUNhc2UgKHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChzLnNwbGl0KCcgJyksIGZ1bmN0aW9uICh0KSB7IGFyci5wdXNoKGxpYnMuc3RyaW5nLnVjRmlyc3QodCkpOyB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU3BsaWNlcyBhIHN0cmluZywgbXVjaCBsaWtlIGFuIGFycmF5LlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IFRoZSBpbmRleCB0byBiZWdpbiBzcGxpY2luZyB0aGUgc3RyaW5nIGF0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gY291bnQgVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRvIGRlbGV0ZVxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFkZCBUaGUgc3RyaW5nIHRvIGFwcGVuZCBhdCB0aGUgc3BsaWNlZCBzZWN0aW9uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzcGxpY2VkIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAocywgaW5kZXgsIGNvdW50LCBhZGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5zbGljZSgwLCBpbmRleCkgKyAoYWRkIHx8ICcnKSArIHMuc2xpY2UoaW5kZXggKyBjb3VudCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybiBhIHRydW5jYXRlZCBzdHJpbmcgd2l0aCBlbGxpcHNlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gbGVuZ3RoIFRoZSBsZW5ndGggb2YgdGhlIGRlc2lyZWQgc3RyaW5nLiBJZiBvbW1pdGVkLCB0aGUgc3RyaW5ncyBvcmlnaW5hbCBsZW5ndGggd2lsbCBiZSB1c2VkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbcGxhY2U9J2JhY2snXSBQb3NzaWJsZSB2YWx1ZXMgYXJlICdmcm9udCcgYW5kICdiYWNrJy4gU3BlY2lmeWluZyAnZnJvbnQnIHdpbGwgdHJ1bmNhdGUgdGhlXG4gICAgICAgICAgICAgKiBzdHJpbmcgYW5kIGFkZCBlbGxpcHNlcyB0byB0aGUgZnJvbnQsICdiYWNrJyAob3IgYW55IG90aGVyIHZhbHVlKSB3aWxsIGFkZCB0aGUgZWxsaXBzZXMgdG8gdGhlIGJhY2suXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtlbGxpcHNlcz0nLi4uJ10gVGhlIHN0cmluZyB2YWx1ZSBvZiB0aGUgZWxsaXBzZXMuIFVzZSB0aGlzIHRvIGFkZCBhbnl0aGluZyBvdGhlciB0aGFuICcuLi4nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBBIHRydW5jYXRlZCBzdHJpbmcgd2l0aCBlbGxpcHNlcyAoaWYgaXRzIGxlbmd0aCBpcyBncmVhdGVyIHRoYW4gJ2xlbmd0aCcpXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWxsaXBzZXM6IGZ1bmN0aW9uIGVsbGlwc2VzXyAocywgbGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpIHtcbiAgICAgICAgICAgICAgICBpZihpc05hTihwYXJzZUludChsZW5ndGgsIDEwKSkpIGxlbmd0aCA9IHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8IDAgfHwgIWlzRmluaXRlKGxlbmd0aCkpIGxlbmd0aCA9IDA7XG5cbiAgICAgICAgICAgICAgICBlbGxpcHNlcyA9IHR5cGVvZiBlbGxpcHNlcyA9PT0gJ3N0cmluZycgPyBlbGxpcHNlcyA6ICcuLi4nO1xuICAgICAgICAgICAgICAgIGlmKHMubGVuZ3RoIDw9IGxlbmd0aCkgcmV0dXJuIHM7XG5cbiAgICAgICAgICAgICAgICBpZihsZW5ndGggPD0gZWxsaXBzZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGxpcHNlcy5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZighcGxhY2UgfHwgcGxhY2UgIT09ICdmcm9udCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKDAsIGxlbmd0aCAtIGVsbGlwc2VzLmxlbmd0aCkgKyBlbGxpcHNlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGxpcHNlcyArIHMuc3Vic3RyKDAsIGxlbmd0aCAtIGVsbGlwc2VzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTaHVmZmxlcyBhIHN0cmluZ1xuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHNwbGl0dGVyIEEgc3RyaW5nIHVzZWQgdG8gc3BsaXQgdGhlIHN0cmluZywgdG8gdG9rZW5pemUgaXQgYmVmb3JlIHNodWZmbGluZy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIG1peGVkIHVwIHN0cmluZy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAocywgc3BsaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IHMuc3BsaXQodHlwZW9mIHNwbGl0dGVyID09PSAnc3RyaW5nJyA/IHNwbGl0dGVyIDogJycpLCBuID0gYS5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcmVwbGFjZVNwbGl0cyA9IG4gLSAxO1xuXG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gbiAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcCA9IGFbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGFbal07XG4gICAgICAgICAgICAgICAgICAgIGFbal0gPSB0bXA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yKHZhciBrID0gMDsgayA8IHJlcGxhY2VTcGxpdHM7IGsrKykgYS5zcGxpY2UobGlicy5udW1iZXIucmFuZG9tSW50SW5SYW5nZSgwLCBhLmxlbmd0aCksIDAsIHNwbGl0dGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5qb2luKCcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV2ZXJzZXMgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByZXZlcnNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJldmVyc2U6IGZ1bmN0aW9uIHJldmVyc2UgKHMpIHtcbiAgICAgICAgICAgICAgICBpZihzLmxlbmd0aCA8IDY0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gcy5sZW5ndGg7IGkgPj0gMDsgaS0tKSBzdHIgKz0gcy5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU3RyaXBzIHRoZSB0cmFpbGluZyBzbGFzaGVzIGZyb20gYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBJZiB1c2luZyBOb2RlLmpzLCBpdCB3aWxsIHJlcGxhY2UgdGhlIHRyYWlsaW5nIHNsYXNoIGJhc2VkIG9uIHRoZSB2YWx1ZSBvZiBvcy5wbGF0Zm9ybVxuICAgICAgICAgICAgICogKGkuZS4gaWYgd2luZG93cywgJ1xcXFwnIHdpbGwgYmUgcmVwbGFjZWQsICcvJyBvdGhlcndpc2UpLlxuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHN0cmluZyB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgd2l0aG91dFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhvdXRUcmFpbGluZ1NsYXNoIChzKSB7XG4gICAgICAgICAgICAgICAgaWYoIUlTX0JST1dTRVIgJiYgSEFTX09TICYmIHJlcXVpcmUoJ29zJykucGxhdGZvcm0gPT09ICd3aW4zMicpIHJldHVybiBzLnJlcGxhY2UoL1xcXFwrJC8sICcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkIGEgdHJhaWxpbmcgc2xhc2ggdG8gYSBzdHJpbmcsIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBoYXZlIG9uZS5cbiAgICAgICAgICAgICAqIElmIHVzaW5nIE5vZGUuanMsIGl0IHdpbGwgcmVwbGFjZSB0aGUgdHJhaWxpbmcgc2xhc2ggYmFzZWQgb24gdGhlIHZhbHVlIG9mIG9zLnBsYXRmb3JtXG4gICAgICAgICAgICAgKiAoaS5lLiBpZiB3aW5kb3dzLCAnXFxcXCcgd2lsbCBiZSByZXBsYWNlZCwgJy8nIG90aGVyd2lzZSkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3aXRoVHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aFRyYWlsaW5nU2xhc2ggKHMpIHtcbiAgICAgICAgICAgICAgICBpZighSVNfQlJPV1NFUiAmJiBIQVNfT1MgJiYgcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpICsgJ1xcXFwnO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKSArICcvJztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRXNjYXBlcyByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzLiBUaGlzIGlzIHVzZWZ1bCBpcyB5b3Ugd2lzaCB0byBjcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uXG4gICAgICAgICAgICAgKiBmcm9tIGEgc3RvcmVkIHN0cmluZyB2YWx1ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZWd1bGFyIGV4cHJlc3Npb24gc2FmZSBzdHJpbmdcbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZWdleHBTYWZlOiBmdW5jdGlvbiByZWdleHBTYWZlIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFBhZHMgYSBzdHJpbmcgd2l0aCAnZGVsaW0nIGNoYXJhY3RlcnMgdG8gdGhlIHNwZWNpZmllZCBsZW5ndGguIElmIHRoZSBsZW5ndGggaXMgbGVzcyB0aGFuIHRoZSBzdHJpbmcgbGVuZ3RoLFxuICAgICAgICAgICAgICogdGhlIHN0cmluZyB3aWxsIGJlIHRydW5jYXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggVGhlIGxlbmd0aCB0byBwYWQgdGhlIHN0cmluZyB0by4gSWYgbGVzcyB0aGF0IHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgdGhlIHN0cmluZyB3aWxsXG4gICAgICAgICAgICAgKiBiZSByZXR1cm5lZC4gSWYgbGVzcyB0aGFuIHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgdGhlIHN0cmluZyB3aWxsIGJlIHNsaWNlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2RlbGltPScgJ10gVGhlIGNoYXJhY3RlciB0byBwYWQgdGhlIHN0cmluZyB3aXRoLlxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW3ByZT1mYWxzZV0gSWYgdHJ1ZSwgdGhlIHBhZGRpbmcgd2lsbCBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcsIG90aGVyd2lzZSB0aGUgcGFkZGluZ1xuICAgICAgICAgICAgICogd2lsbCBiZSBhZGRlZCB0byB0aGUgZW5kLlxuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHBhZGRlZCBzdHJpbmdcbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAocywgbGVuZ3RoLCBkZWxpbSwgcHJlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGksIHRoaXNMZW5ndGggPSBzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIGlmKCFkZWxpbSkgZGVsaW0gPSAnICc7XG4gICAgICAgICAgICAgICAgaWYobGVuZ3RoID09PSAwKSByZXR1cm4gJyc7IGVsc2UgaWYoaXNOYU4ocGFyc2VJbnQobGVuZ3RoLCAxMCkpKSByZXR1cm4gcztcblxuICAgICAgICAgICAgICAgIGxlbmd0aCA9IHBhcnNlSW50KGxlbmd0aCwgMTApO1xuICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8IHRoaXNMZW5ndGgpIHJldHVybiAhcHJlID8gcy5zbGljZSgwLCBsZW5ndGgpIDogcy5zbGljZSgtbGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmKHByZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBsZW5ndGggLSB0aGlzTGVuZ3RoOyBpKyspIHMgPSBkZWxpbSArIHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBsZW5ndGggLSB0aGlzTGVuZ3RoOyBpKyspIHMgKz0gZGVsaW07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyBuZXdsaW5lcyB3aXRoIGJyIHRhZ3MuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCBuZXdsaW5lcyBjb252ZXJ0ZWQgdG8gYnIgdGFncy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbmV3bGluZVRvQnJlYWs6IGZ1bmN0aW9uIG5ld2xpbmVUb0JyZWFrIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKFxcclxcbnxcXG4pL2csICc8YnI+Jyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlcGxhY2VzIHRhYnMgd2l0aCBhIHNwYW4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAndGFiJ1xuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGFicyBjb252ZXJ0ZWQgdG8gc3BhbnMgd2l0aCB0aGUgY2xhc3MgJ3RhYidcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGFic1RvU3BhbjogZnVuY3Rpb24gdGFic1RvU3BhbiAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcdC9nLCAnPHNwYW4gY2xhc3M9XCJ0YWJcIj48L3NwYW4+Jyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkanVzdHMgYSBzdHJpbmcgdG8gZml0IHdpdGhpbiB0aGUgY29uZmluZXMgb2YgJ3dpZHRoJywgd2l0aG91dCBicmVha2luZyB3b3Jkcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2xlbmd0aD0xMjBdIFRoZSBsZW5ndGggdG8gd29yZCB3cmFwIHRoZSBzdHJpbmcgdG8uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtwYWRsZWZ0PTBdIFRoZSBudW1iZXIgb2YgY29sdW1ucyB0byBwYWQgdGhlIHN0cmluZyBvbiB0aGUgbGVmdFxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcGFkcmlnaHQ9MF0gVGhlIG51bWJlciBvZiBjb2x1bW5zIHRvIHBhZCB0aGUgc3RyaW5nIG9uIHRoZSByaWdodFxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gb21pdEZpcnN0IElmIHRydWUsIHRoZSBmaXJzdCBsaW5lIHdpbGwgbm90IGJlIHBhZGRlZCBsZWZ0XG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgYWRqdXN0ZWQgYW5kIHBhZGRlZCBmb3IgdGhlIHN0ZG91dC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3b3JkV3JhcFRvTGVuZ3RoOiBmdW5jdGlvbiB3b3JkV3JhcFRvTGVuZ3RoIChzLCB3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCkge1xuICAgICAgICAgICAgICAgIGlmKHBhZHJpZ2h0ID09PSB1bmRlZmluZWQgJiYgcGFkbGVmdCkgcGFkcmlnaHQgPSBwYWRsZWZ0O1xuXG4gICAgICAgICAgICAgICAgcGFkbGVmdCAgPSAhaXNOYU4ocGFyc2VJbnQocGFkbGVmdCwgIDEwKSkgPyBwYXJzZUludChwYWRsZWZ0LCAxMCkgIDogMDtcbiAgICAgICAgICAgICAgICBwYWRyaWdodCA9ICFpc05hTihwYXJzZUludChwYWRyaWdodCwgMTApKSA/IHBhcnNlSW50KHBhZHJpZ2h0LCAxMCkgOiAwO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhZGRpbmdMZWZ0ID0gJyc7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IHBhZGxlZnQ7ICBuKyspIHBhZGRpbmdMZWZ0ICArPSAnICc7XG5cbiAgICAgICAgICAgICAgICB2YXIgY29scyAgID0gIWlzTmFOKHBhcnNlSW50KHdpZHRoLCAxMCkpID8gbGVuZ3RoIDogMTIwLFxuICAgICAgICAgICAgICAgICAgICBhcnIgICAgPSBzLnNwbGl0KCcgJyksXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gICA9IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGxlbiAgICA9ICFvbWl0Rmlyc3QgPyBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0IDogY29scyAtIHBhZHJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICBzdHIgICAgPSAhb21pdEZpcnN0ID8gcGFkZGluZ0xlZnQgOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgb2xlbiAgID0gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdDtcblxuICAgICAgICAgICAgICAgIHdoaWxlKChpdGVtID0gYXJyLnNoaWZ0KCkpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoaXRlbS5sZW5ndGggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBpdGVtICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGVuIC09IGl0ZW0ubGVuZ3RoICsgMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGl0ZW0ubGVuZ3RoID4gb2xlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGl0ZW0uc3Vic3RyaW5nKDAsIGxlbiAtIDEpICsgJy1cXG4nICsgcGFkZGluZ0xlZnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcnIudW5zaGlmdChpdGVtLnN1YnN0cmluZyhsZW4sIGl0ZW0ubGVuZ3RoIC0gMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxuJyArIHBhZGRpbmdMZWZ0ICsgaXRlbSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbiA9IGNvbHMgLSBwYWRyaWdodCAtIDEgLSBwYWRsZWZ0IC0gaXRlbS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGF0ZSBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZGF0ZToge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAnZGF5c0luVGhlRnV0dXJlJyBkYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkYXlzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiBkYXlzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgZGF5cy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZHZhbmNlRGF5czogZnVuY3Rpb24gYWR2YW5jZURheXMgKGQsIGRheXNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgIGRheXNJblRoZUZ1dHVyZSA9IGRheXNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKGRheXNJblRoZUZ1dHVyZSkgPyBkYXlzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArIChkYXlzSW5UaGVGdXR1cmUgKiA4NjQwMDAwMCkpO1xuXG4gICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICdtb250aHNJblRoZUZ1dHVyZScgbW9udGhzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtb250aHNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIG1vbnRocyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIG1vbnRocy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZHZhbmNlTW9udGhzOiBmdW5jdGlvbiBhZHZhbmNlTW9udGhzIChkLCBtb250aHNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgIG1vbnRoc0luVGhlRnV0dXJlID0gbW9udGhzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyhtb250aHNJblRoZUZ1dHVyZSkgPyBtb250aHNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKG1vbnRoc0luVGhlRnV0dXJlICogMjYyOTc0NjAwMCkpO1xuXG4gICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICd5ZWFyc0luVGhlRnV0dXJlJyB5ZWFycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0geWVhcnNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIHllYXJzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgeWVhcnMuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWR2YW5jZVllYXJzOiBmdW5jdGlvbiBhZHZhbmNlWWVhcnMgKGQsIHllYXJzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICB5ZWFyc0luVGhlRnV0dXJlID0geWVhcnNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKHllYXJzSW5UaGVGdXR1cmUpID8geWVhcnNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKHllYXJzSW5UaGVGdXR1cmUgKiAzMTUzNjAwMDAwMCkpO1xuXG4gICAgICAgICAgICAgICAgaWYoYWRqdXN0Rm9yV2Vla2VuZCAmJiAoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSkge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGRhdGUgaW4gdGhlIHl5eXktbW0tZGQgZm9ybWF0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVsaW09Jy0nXSBUaGUgZGVsaW1pdGVyIHRvIHVzZWQgdGhlIHNlcGFyYXRlIHRoZSBkYXRlIGNvbXBvbmVudHMgKGUuZy4gJy0nIG9yICcuJylcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBkYXRlIGluIHRoZSB5eXl5LW1tLWRkIGZvcm1hdC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB5eXl5bW1kZDogZnVuY3Rpb24geXl5eW1tZGQgKGQsIGRlbGltKSB7XG4gICAgICAgICAgICAgICAgZGVsaW0gPSB0eXBlb2YgZGVsaW0gIT09ICdzdHJpbmcnID8gJy0nIDogZGVsaW0gO1xuXG4gICAgICAgICAgICAgICAgdmFyIGRkICAgPSBkLmdldERhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgbW0gICA9IGQuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICAgICAgICAgIHl5eXkgPSBkLmdldEZ1bGxZZWFyKCk7XG5cbiAgICAgICAgICAgICAgICBpZihkZCA8IDEwKSBkZCA9ICcwJyArIGRkO1xuICAgICAgICAgICAgICAgIGlmKG1tIDwgMTApIG1tID0gJzAnICsgbW07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHl5eXkgKyBkZWxpbSArIG1tICsgZGVsaW0gKyBkZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgYSBkYXRlIHRvIHRoZSBISDpNTTpTUy5NU0VDIHRpbWUgZm9ybWF0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW29taXRNUz1mYWxzZV0gV2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgTVMgcG9ydGlvbiBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgZm9ybWF0dGVkIG51bWJlciwgbm93IGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lIChkLCBvbWl0TVMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2xvY2tUaW1lKGQuZ2V0VGltZSgpLCAhIW9taXRNUyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE51bWJlciBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgbnVtYmVyOiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBpbnRlZ2VyIGluIHJhbmdlIFttaW4sIG1heF0gKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXggVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEByZXR1cm4ge051bWJlcn0gQSByYW5kb20gbnVtYmVyIGJldHdlZW4gbWluIGFuZCBtYXhcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmFuZG9tSW50SW5SYW5nZTogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgICAgICAgICAgICAgbWluID0gcGFyc2VJbnQobWluLCAxMCk7XG4gICAgICAgICAgICAgICAgbWF4ID0gcGFyc2VJbnQobWF4LCAxMCk7XG5cbiAgICAgICAgICAgICAgICBpZihpc05hTihtaW4pICYmICFpc0Zpbml0ZShtaW4pKSBtaW4gPSAwO1xuICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1heCkgJiYgIWlzRmluaXRlKG1heCkpIG1heCA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gZmxvYXQgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBUaGUgbWluaW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1heCBUaGUgbWF4aW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByYW5kb21OdW1iZXJJblJhbmdlOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUludChtaW4sIDEwKTtcbiAgICAgICAgICAgICAgICBtYXggPSBwYXJzZUludChtYXgsIDEwKTtcblxuICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1pbikgJiYgIWlzRmluaXRlKG1pbikpIG1pbiA9IDA7XG4gICAgICAgICAgICAgICAgaWYoaXNOYU4obWF4KSAmJiAhaXNGaW5pdGUobWF4KSkgbWF4ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSArIG1pbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVjdXJzaXZlbHkgY29tcHV0ZXMgdGhlIGZhY3RvcmlhbCBvZiB0aGUgbnVtYmVyIG4uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBBIG51bWJlci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge051bWJlcnxJbmZpbml0eX0gbiFcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZmFjdG9yaWFsOiBmdW5jdGlvbiBmYWN0b3JpYWwgKG4pIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDApIHJldHVybiBOYU47XG4gICAgICAgICAgICAgICAgaWYobiA+IDE3MCkgcmV0dXJuIEluZmluaXR5O1xuICAgICAgICAgICAgICAgIGlmKG4gPT09IDAgfHwgbiA9PT0gMSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG4gKiBmYWN0b3JpYWwobiAtIDEpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlzIHRoZSBnaXZlbiBudW1iZXJzIGFyZSBpbnRlZ2Vyc1xuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5OdW1iZXJ9IG4gTnVtYmVycy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgYWxsIGFyZ3VtZW50cyBhcmUgaW50ZWdlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNJbnQ6IGZ1bmN0aW9uIGlzSW50ICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIG4gPT09ICdudW1iZXInICYmIG4gJSAxID09PSAwICYmIG4udG9TdHJpbmcoKS5pbmRleE9mKCcuJykgPT09IC0xO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZWN1cnNpdmVseSBjb21wdXRlcyBuIGNob29zZSBrLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gQSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gayBBIG51bWJlci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge051bWJlcnxJbmZpbml0eX0gbiBjaG9vc2Ugay5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2hvb3NlOiBmdW5jdGlvbiBjaG9vc2UgKG4sIGspIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgdHlwZW9mIGsgIT09ICdudW1iZXInKSByZXR1cm4gTmFOO1xuICAgICAgICAgICAgICAgIGlmKGsgPT09IDApIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIHJldHVybiAobiAqIGNob29zZShuIC0gMSwgayAtIDEpKSAvIGs7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFBhZHMgYSBudW1iZXIgd2l0aCBwcmVjZWVkaW5nIHplcm9zLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggVGhlIGZpbmFsIGxlbmd0aCBvZiB0aGUgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcGFkZGVkIG51bWJlciwgbm93IGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChuLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucGFkKG4udG9TdHJpbmcoKSwgbGVuZ3RoLCAnMCcsIHRydWUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXlzRnJvbTogZnVuY3Rpb24gZGF5c0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWNvbmRzRnJvbTogZnVuY3Rpb24gc2Vjb25kc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKGRhdGUuZ2V0U2Vjb25kcygpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2Vjb25kc0Zyb21Ob3c6IGZ1bmN0aW9uIHNlY29uZHNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgeWVhcnNGcm9tOiBmdW5jdGlvbiB5ZWFyc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbW9udGhzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbW9udGhzRnJvbTogZnVuY3Rpb24gbW9udGhzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldE1vbnRoKGRhdGUuZ2V0TW9udGgoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbW9udGhzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbW9udGhzRnJvbU5vdzogZnVuY3Rpb24gbW9udGhzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaG91cnNGcm9tOiBmdW5jdGlvbiBob3Vyc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRIb3VycyhkYXRlLmdldEhvdXJzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaG91cnNGcm9tTm93OiBmdW5jdGlvbiBob3Vyc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaG91cnNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1pbnV0ZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWludXRlc0Zyb206IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0TWludXRlcyhkYXRlLmdldE1pbnV0ZXMoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbWludXRlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWludXRlc0Zyb21Ob3c6IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGltZSwgbW9udGhzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vbnRoc0FnbzogZnVuY3Rpb24gbW9udGhzQWdvIChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRpbWUsIGRheXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF5c0FnbzogZnVuY3Rpb24gZGF5c0FnbyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0aW1lLCBzZWNvbmRzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlY29uZHNBZ286IGZ1bmN0aW9uIHNlY29uZHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGltZSwgbWludXRlcyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW51dGVzQWdvOiBmdW5jdGlvbiBtaW51dGVzQWdvIChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRpbWUsIHllYXJzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHllYXJzQWdvOiBmdW5jdGlvbiB5ZWFyc0FnbyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyBhIG51bWJlciB0byB0aGUgSEg6TU06U1MuTVNFQyB0aW1lIGZvcm1hdFxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHQgVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBtZW1iZXJvZiBOdW1iZXIucHJvdG90eXBlXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbb21pdE1TPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIHRoZSBNUyBwb3J0aW9uIG9mIHRoZSByZXR1cm5lZCBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBmb3JtYXR0ZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKHQsIG9taXRNUykge1xuICAgICAgICAgICAgICAgIHZhciBtcywgc2VjcywgbWlucywgaHJzO1xuXG4gICAgICAgICAgICAgICAgbXMgPSB0ICUgMTAwMDtcbiAgICAgICAgICAgICAgICB0ID0gKHQgLSBtcykgLyAxMDAwO1xuXG4gICAgICAgICAgICAgICAgc2VjcyA9IHQgJSA2MDtcbiAgICAgICAgICAgICAgICB0ID0gKHQgLSBzZWNzKSAvIDYwO1xuXG4gICAgICAgICAgICAgICAgbWlucyA9IHQgJSA2MDtcbiAgICAgICAgICAgICAgICBocnMgPSAodCAtIG1pbnMpIC8gNjA7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIucGFkKGhycy50b1N0cmluZygpLCAyKSAgKyAnOicgKyBsaWJzLm51bWJlci5wYWQobWlucy50b1N0cmluZygpLCAyKSArICc6JyArXG4gICAgICAgICAgICAgICAgICAgICAgIGxpYnMubnVtYmVyLnBhZChzZWNzLnRvU3RyaW5nKCksIDIpICsgKChvbWl0TVMgPT09IHRydWUpID8gJycgOiAnLicgKyBsaWJzLm51bWJlci5wYWQobXMudG9TdHJpbmcoKSwgMykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGdW5jdGlvbiBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb246IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvciBUaGUgaW5oZXJpdGluZyBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc3VwZXJDb25zdHJ1Y3RvciBUaGUgcGFyZW50IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGluaGVyaXRpbmcgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5oZXJpdHM6IGZ1bmN0aW9uIGluaGVyaXRzIChjb25zdHJ1Y3Rvciwgc3VwZXJDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkIHx8IGNvbnN0cnVjdG9yID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgYmUgJyArICdudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHN1cGVyQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCB8fCBzdXBlckNvbnN0cnVjdG9yID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBzdXBlciBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgJyArICdiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHN1cGVyIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0ICcgKyAnaGF2ZSBhIHByb3RvdHlwZScpO1xuXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3Iuc3VwZXJfID0gc3VwZXJDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoY29uc3RydWN0b3IucHJvdG90eXBlLCBzdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGFycmF5OiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2h1ZmZsZXMgYW4gYXJyYXlcbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBtaXhlZCB1cCBhcnJheVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChhKSB7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gYS5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSksIHRtcCA9IGFbaV07XG4gICAgICAgICAgICAgICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICAgICAgICAgICAgICBhW2pdID0gdG1wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIHVuaW9uIGJldHdlZW4gdGhlIGN1cnJlbnQgYXJyYXksIGFuZCBhbGwgdGhlIGFycmF5IG9iamVjdHMgcGFzc2VkIGluLiBUaGF0IGlzLFxuICAgICAgICAgICAgICogdGhlIHNldCBvZiB1bmlxdWUgb2JqZWN0cyBwcmVzZW50IGluIGFsbCBvZiB0aGUgYXJyYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBhcnIgQSBsaXN0IG9mIGFycmF5IG9iamVjdHNcbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgdW5pb24gc2V0IG9mIHRoZSBwcm92aWRlZCBhcnJheXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVuaW9uOiBmdW5jdGlvbiB1bmlvbiAoYSkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3Qub25seShsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksICdhcnJheScpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHVuaW9uID0gW107XG4gICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYXJncywgZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih1bmlvbi5pbmRleE9mKGl0ZW0pID09PSAtMSkgdW5pb24ucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuaW9uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFsbCB0aGUgaXRlbXMgdW5pcXVlIHRvIGFsbCBhcnJheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBhcnJheXMgVGhlIEFycmF5IG9iamVjdHMgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IG90aGVyIFRoZSBhcnJheSB0byBjb21wdXRlIHRoZSBkaWZmZXJlbmNlIGZyb20uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheX0gQSBuZXcgYXJyYXkgd2l0aCBpdGVtcyB1bmlxdWUgdG8gZWFjaCBhcnJheS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFycmF5cyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAxKSByZXR1cm4gbGlicy5vYmplY3QuY29weShhcnJheXNbMF0pO1xuICAgICAgICAgICAgICAgIHZhciBpLCBzaW1wbGVEaWZmID0gW107XG5cbiAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGFycmF5c1swXS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFycmF5c1sxXS5pbmRleE9mKGFycmF5c1swXVtpXSkgPT09IC0xKSBzaW1wbGVEaWZmLnB1c2goYXJyYXlzWzBdW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXNbMV0ubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcnJheXNbMF0uaW5kZXhPZihhcnJheXNbMV1baV0pID09PSAtMSkgc2ltcGxlRGlmZi5wdXNoKGFycmF5c1sxXVtpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpbXBsZURpZmY7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBhcnJheXNbMF0sIGludGVybWVkaWF0ZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvcihpID0gMTsgaSA8IGFycmF5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgZGlmZmVyZW5jZS5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzW2ldLmluZGV4T2YoZGlmZmVyZW5jZVtuXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlLnB1c2goZGlmZmVyZW5jZVtuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBrID0gMDsgayA8IGFycmF5cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9pZihhcnJheXNbaV0gIT09IGFycmF5cylcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkaWZmZXJlbmNlID0gaW50ZXJtZWRpYXRlO1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZGlmZmVyZW5jZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgaXRlbXMgY29tbW9uIHRvIGFsbCBhcnJheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBpdGVtcyBUaGUgYXJyYXlzIGZyb20gd2hpY2ggdG8gY29tcHV0ZSB0aGUgaW50ZXJzZWN0aW9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgY29tbW9uIHRvIGJvdGggYXJyYXlzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnRlcnNlY3Q6IGZ1bmN0aW9uIGludGVyc2VjdCAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFycmF5cyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAxKSByZXR1cm4gbGlicy5vYmplY3QuY29weShhcnJheXNbMF0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGludGVyc2VjdGlvbiA9IGFycmF5c1swXSwgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IGFycmF5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgaW50ZXJzZWN0aW9uLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcnJheXNbaV0uaW5kZXhPZihpbnRlcnNlY3Rpb25bbl0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUucHVzaChpbnRlcnNlY3Rpb25bbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSBhcnJheXNbaV0uaW5kZXhPZihpbnRlcnNlY3Rpb25bbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5c1tpXS5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBpbnRlcm1lZGlhdGU7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgYXJyYXkgZnJvbSB0aGUgY3VycmVudCBvbmUsIHdpdGggYWxsIG9jY3VyZW5jZXMgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLjxicj5cbiAgICAgICAgICAgICAqIEZvciBleGFtcGxlOiA8ZW0+WzEsMiwzLDQsNV0ud2l0aG91dCgxKTwvZW0+IHdpbGwgcmV0dXJuIDxlbT5bMiwzLDQsNV08L2VtPlxuICAgICAgICAgICAgICogYW5kIDxlbT5bMSwgbnVsbCwgMiwgbnVsbCwgdW5kZWZpbmVkXS53aXRob3V0KG51bGwsIHVuZGVmaW5lZCk8L2VtPiB3aWxsIHJldHVybiA8ZW0+WzEsIDJdPC9lbT5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PCo+fSBBIHNoYWxsb3cgY29weSBvZiB0aGUgYXJyYXkgd2l0aCB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIG9tbWl0ZWQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgd2l0aG91dDogZnVuY3Rpb24gd2l0aG91dCAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCksXG4gICAgICAgICAgICAgICAgICAgIHJlcyAgPSBbXTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYSwgZnVuY3Rpb24gKHYpIHsgaWYoYXJncy5pbmRleE9mKHYpID09PSAtMSkgcmVzLnB1c2godik7IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgb3IgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuIElmIHRoZSBkaXJlY3Rpb24gaXMgbGVmdCwgaXQgd2lsbCBzaGlmdCBvZmYgdGhlXG4gICAgICAgICAgICAgKiBmaXJzdCA8ZW0+bjwvZW0+IGVsZW1lbnRzIGFuZCBwdXNoIHRoZW0gdG8gdGhlIGVuZCBvZiB0aGUgYXJyYXkuIElmIHJpZ2h0LCBpdCB3aWxsIHBvcCBvZmYgdGhlIGxhc3QgPGVtPm48L2VtPlxuICAgICAgICAgICAgICogaXRlbXMgYW5kIHVuc2hpZnQgdGhlbSBvbnRvIHRoZSBmcm9udCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2RpcmVjdGlvbj0nbGVmdCddIFRoZSBkaXJlY3Rpb24gdG8gcm90YXRlIGFycmF5IG1lbWJlcnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byBzaGlmdFxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCBzaGlmdGVkLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJvdGF0ZTogZnVuY3Rpb24gcm90YXRlIChhLCBkaXJlY3Rpb24sIGFtb3VudCkge1xuICAgICAgICAgICAgICAgIGlmKGRpcmVjdGlvbiAmJiBsaWJzLm9iamVjdC5pc051bWVyaWMoZGlyZWN0aW9uKSAmJiAhYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGFtb3VudCAgICA9IGRpcmVjdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKCFhbW91bnQgfHwgKGFtb3VudCAmJiAhbGlicy5vYmplY3QuaXNOdW1lcmljKGFtb3VudCkpKSBhbW91bnQgPSAxO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhbW91bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZihkaXJlY3Rpb24gIT09ICdyaWdodCcpIGEucHVzaChhLnNoaWZ0KCkpOyBlbHNlIGEudW5zaGlmdChhLnBvcCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIHVzZWZ1bCBpZiB0cnlpbmcgdG8gY3JlYXRlIGEgY2lyY3VsYXIgcXVldWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgcm90YXRlZCBsZWZ0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJvdGF0ZUxlZnQ6IGZ1bmN0aW9uIHJvdGF0ZUxlZnQgKGEsIGFtb3VudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCAnbGVmdCcsIGFtb3VudCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IHJpZ2h0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiB0aW1lcyB0byByb3RhdGUgdGhlIGFycmF5IGxlZnQuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgcmlnaHQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZUxlZnQgKGEsIGFtb3VudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCAncmlnaHQnLCBhbW91bnQpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW1vdmVzIGR1cGxpY2F0ZXMgZnJvbSB0aGUgY3VycmVudCBhcnJheS5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHdpdGggZHVwbGljYXRlcyByZW1vdmVkLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1ha2VVbmlxdWU6IGZ1bmN0aW9uIG1ha2VVbmlxdWUgKGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmlzaXRlZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihhW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2l0ZWQucHVzaChhW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaS0tOyAvLyBTcGxpY2Ugd2lsbCBhZmZlY3QgdGhlIGludGVybmFsIGFycmF5IHBvaW50ZXIsIHNvIGZpeCBpdC4uLlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBHZXRzIGFuIGFycmF5IG9mIHVuaXF1ZSBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IGFycmF5LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggbm8gZHVwbGljYXRlIHZhbHVlcy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1bmlxdWU6IGZ1bmN0aW9uIHVuaXF1ZSAoYSkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpdGVkID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHVuaXF1ZSAgPSBbXTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodmlzaXRlZC5pbmRleE9mKGl0ZW0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcXVlLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5pcXVlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgYXJyYXkgaW4gYXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgc29ydGVkIGluIGFzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoYSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoYSAhPT0gdW5kZWZpbmVkICYmIGEgIT09IG51bGwpIGEgPSBhLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGIgIT09IHVuZGVmaW5lZCAmJiBiICE9PSBudWxsKSBiID0gYi50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNvcnRzIHRoZSBhcnJheSBpbiBkZXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgc29ydGVkIGluIGRlc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGVzY2VuZGluZzogZnVuY3Rpb24gZGVzY2VuZGluZyAoYSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoYSAhPT0gdW5kZWZpbmVkICYmIGEgIT09IG51bGwpIGEgPSBhLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGIgIT09IHVuZGVmaW5lZCAmJiBiICE9PSBudWxsKSBiID0gYi50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPCBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFycmF5IGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBvYmplY3Q6IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb21wdXRlcyB0aGUgZnJlcXVlbmNpZXMgZm9yIGVhY2ggaXRlbSBpbiBhbGwgb2YgYXJndW1lbnRzLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi4qfSBvYmpzIFRoZSBvYmplY3RzIHRvIGNvbXB1dGUgdGhlIGhpc3RvZ3JhbSBmcm9tLlxuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0PE51bWJlcj59IEFuIG9iamVjdCB0aGF0IGhhcyB0aGUgaXRlbXMgZnJvbSBhbGwgb2YgdGhlIGFyZ3VtZW50cyBhcyBpdHMga2V5cyBhbmQgdGhlaXIgZnJlcXVlbmNpZXMgYXMgaXQncyB2YWx1ZXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpc3RvZ3JhbTogZnVuY3Rpb24gaGlzdG9ncmFtICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGlzdG9ncmFtID0ge307XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighaGlzdG9ncmFtW29dKSBoaXN0b2dyYW1bb10gPSAxOyBlbHNlIGhpc3RvZ3JhbVtvXSsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFoaXN0b2dyYW1bJ2Z1bmN0aW9uJ10pIGhpc3RvZ3JhbVsnZnVuY3Rpb24nXSA9IDE7IGVsc2UgaGlzdG9ncmFtW29dKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gdHlwZW9mIHZhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCA9PT0gbnVsbDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdudWxsJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gJ2FycmF5JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gJ29iamVjdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHZhbC50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoaXN0b2dyYW1bdmFsXSAhPT0gJ251bWJlcicpIGhpc3RvZ3JhbVt2YWxdID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoaXN0b2dyYW1bdmFsXSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaGlzdG9ncmFtO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgc2hhbGxvdyBjb3B5IG9mICdpdGVtJy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gaXRlbSBUaGUgaXRlbSB0byBzaGFsbG93IFwiY29weVwiLlxuICAgICAgICAgICAgICogQHJldHVybiB7Kn0gQSBzaGFsbG93IGNvcHkgb2YgdGhlIGl0ZW0uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29weTtcbiAgICAgICAgICAgICAgICBpZighaXRlbSkgcmV0dXJuIGl0ZW07XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcblxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGl0ZW0sIGZ1bmN0aW9uIChvLCBrKSB7IGNvcHlba10gPSBvOyB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29weTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIG9jY3VyZW5jZXMgb2YgXCJ3aGF0XCJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gb2JqIFRoZSBpdGVtIHRvIGNvdW50IHRoZSBvY2N1cmVuY2VzIG9mIFwid2hhdFwiIGluLlxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSB3aGF0IFRoZSBpdGVtIHRvIGNvdW50IHRoZSBvY2N1cmVuY2VzIG9mIHRoZSBpdGVtIGluIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBvY2N1cnJlbmNlc09mOiBmdW5jdGlvbiBvY2N1cnJlbmNlc09mIChvYmosIHdoYXQpIHtcbiAgICAgICAgICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoIDwgMikgcmV0dXJuIDA7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvY2N1cnJlbmNlc09mKG9iai50b1N0cmluZygpLCB3aGF0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvY2N1cnJlbmNlc09mKGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhvYmoudG9TdHJpbmcoKSksIHdoYXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHdoYXQgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB3aGF0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4cCA9IG5ldyBSZWdFeHAod2hhdC50b1N0cmluZygpLCAnZycpLCBtO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUobSA9IHJlZ2V4cC5leGVjKG9iaikpIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2Ygb2JqICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvYmosIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtID09PSB3aGF0KSBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBvYmplY3QncyBrZXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PFN0cmluZ3xOdW1iZXI+fSBUaGUgb2JqZWN0J3Mga2V5IHNldFxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGtleXMgOiBmdW5jdGlvbiBrZXlzIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvKSwgaWR4O1xuICAgICAgICAgICAgICAgIGlmKGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkeCA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgJ3NpemUnIG9yICdsZW5ndGgnIG9mIGFuIG9iamVjdC5cbiAgICAgICAgICAgICAqIDx1bD5cbiAgICAgICAgICAgICAqICAgICAgPGxpPiBTdHJpbmcgICAtPiBUaGUgc3RyaW5nJ3MgbGVuZ3RoICA8L2xpPlxuICAgICAgICAgICAgICogICAgICA8bGk+IE51bWJlciAgIC0+IFRoZSBudW1iZXIgb2YgZGlnaXRzIDwvbGk+XG4gICAgICAgICAgICAgKiAgICAgIDxsaT4gT2JqZWN0ICAgLT4gVGhlIG51bWJlciBvZiBrZXlzICAgPC9saT5cbiAgICAgICAgICAgICAqICAgICAgPGxpPiBBcnJheSAgICAtPiBUaGUgbnVtYmVyIG9mIGl0ZW1zICA8L2xpPlxuICAgICAgICAgICAgICogICAgICA8bGk+IEZ1bmN0aW9uIC0+IDEgICAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgKiA8L3VsPlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWJlciBvZiBpdGVtcyB3aXRoaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzaXplOiBmdW5jdGlvbiBzaXplIChvKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIG8gPT09ICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8udG9TdHJpbmcoKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBvIGluc3RhbmNlb2YgQXJyYXk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIG8gPT09ICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgbGlicy5vYmplY3QuaXNBcmd1bWVudHMobykgJiYgdHlwZW9mIG8ubGVuZ3RoICE9PSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3QgY2FuIGJlIGNvbnZlcnRlZCB0byBhIG51bWJlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgbnVtZXJpYywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzTnVtZXJpYzogZnVuY3Rpb24gaXNOdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQoaXRlbSkpICYmIGlzRmluaXRlKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyBhbiBvYmplY3QgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGEgbnVtYmVyLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldE51bWVyaWM6IGZ1bmN0aW9uIGdldE51bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBbXSwgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKCFpc05hTihwYXJzZUZsb2F0KGl0ZW0pKSAmJiBpc0Zpbml0ZShpdGVtKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlbiA9PT0gMSA/IHJlc1swXSA6IHJlcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3QgaGFzIG5vIGtleXMsIGlmIGFuIGFycmF5IGhhcyBubyBpdGVtcywgb3IgaWYgYSBzdHJpbmcgPT09ICcnLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyAnZW1wdHknLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNFbXB0eTogZnVuY3Rpb24gaXNFbXB0eSAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUoaXRlbSkgPT09IDAgJiYgaXRlbSAhPT0gZmFsc2UgJiYgaXRlbSAhPT0gJycgJiYgaXRlbSAhPT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBhcnJheXMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiBpc0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSBpbnN0YW5jZW9mIEFycmF5O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIG9iamVjdHMgYW5kIG5vdCBhcnJheXMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBvYmplY3QgYW5kIG5vdCBhbiBhcnJheSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSAmJiB0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgc3RyaW5ncywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgc3RyaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzU3RyaW5nOiBmdW5jdGlvbiBpc1N0cmluZyAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBib29sZWFucywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgYm9vbGVhbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0Jvb2xlYW46IGZ1bmN0aW9uIGlzQm9vbGVhbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbic7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGxmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gaXNGdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnZnVuY3Rpb24nO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsbGwsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzTnVsbDogZnVuY3Rpb24gaXNOdWxsICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gbnVsbDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCB1bmRlZmluZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiBpc1VuZGVmaW5lZCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBhcmd1bWVudHMgb2JqZWN0cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGFuIGFyZ3VtZW50cyBvYmplY3QsIGZhbHNlIG90aGVyd2lzZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaXRlbSkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJzIGFuIG9iamVjdCB0byBhIG51bWJlciwgaWYgcG9zc2libGUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGEgZmxvYXQgb3IgTmFOLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRvTnVtYmVyOiBmdW5jdGlvbiB0b051bWJlciAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUZsb2F0KG8pIDogTmFOKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFscy5sZW5ndGggPT09IDEgPyB2YWxzWzBdIDogdmFscztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVycyBhbiBvYmplY3QgdG8gYW4gaW50ZWdlciwgaWYgcG9zc2libGUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGFuIGludGVnZXIgb3IgTmFOLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRvSW50OiBmdW5jdGlvbiB0b0ludCAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByYWRpeCA9IC9eMHgvLnRlc3QobykgPyAxNiA6IDEwOyAvLyBDaGVjayBmb3IgaGV4IHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICB2YWxzLnB1c2gobGlicy5vYmplY3QuaXNOdW1lcmljKG8pID8gcGFyc2VJbnQobywgcmFkaXgpIDogTmFOKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFscy5sZW5ndGggPT09IDEgPyB2YWxzWzBdIDogdmFscztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBhcnJheSBpdGVtLCByYW5kb20gb2JqZWN0IHByb3BlcnR5LCByYW5kb20gY2hhcmFjdGVyIGluIGEgc3RyaW5nLCBvciByYW5kb20gZGlnaXQgaW4gYSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSAobykge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbyBpbnN0YW5jZW9mIEFycmF5ID9cbiAgICAgICAgICAgICAgICAgICAgICAgIG9bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogby5sZW5ndGgpXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBvW09iamVjdC5rZXlzKG8pW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKG8pLmxlbmd0aCldXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG8gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBvLCBuZWdhdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKG8ubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiBvIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVnYXRpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gTWF0aC5hYnModmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHZhbC50b1N0cmluZygpW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHZhbC50b1N0cmluZygpLmxlbmd0aCldO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ251bWJlcicpIHZhbCA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmVnYXRpdmUgPyAtdmFsIDogdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW52b2tlcyB0aGUgY2FsbGJhY2sgJ2YnIGZvciBlYWNoIHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoaXMgaXMgY2FsbGVkXG4gICAgICAgICAgICAgKiBvbiBhIG51bWJlciBvciBmdW5jdGlvbiwgdGhlIG9iamVjdCB3aWxsIGJlIGNhc3QgdG8gYSBzdHJpbmcuPGJyPjxicj5cbiAgICAgICAgICAgICAqIFRoZSBjYWxsYmFjayBgZmAgd2lsbCBiZSBpbnZva2VkIHdpdGggdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAgICAgICAgICAgKiA8dWw+XG4gICAgICAgICAgICAgKiBcdDxsaT52YWx1ZSAgICAgLSBUaGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgb2JqZWN0IGJlaW5nIGl0ZXJhdGVkIG92ZXI8L2xpPlxuICAgICAgICAgICAgICogXHQ8bGk+a2V5ICAgICAgIC0gVGhlIGtleSBvZiB0aGUgY3VycmVudCBvYmplY3QgKGlmIGFuIG9iamVjdCwgdGhlIGluZGV4IGlmIGFuIGFycmF5KTwvbGk+XG4gICAgICAgICAgICAgKiBcdDxsaT5pdGVyYXRpb24gLSBUaGUgY3VycmVudCBpdGVyYXRpb24gKHNhbWUgYXMga2V5IGlmIGEgc3RyaW5nIG9yIGFycmF5KTwvbGk+XG4gICAgICAgICAgICAgKiBcdDxsaT5leGl0ICAgICAgLSBBIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYnJlYWsgdGhlIGxvb3AgYW5kIHJldHVybiB0aGUgdmFsdWVzIHBhc3NlZCB0byBpdCxcbiAgICAgICAgICAgICAqIFx0XHRcdFx0XHRvciBhIHNpbmdsZSB2YWx1ZSBpZiBvbmx5IGEgc2luZ2xlIHZhbHVlIGlzIHBhc3NlZC48L2xpPlxuICAgICAgICAgICAgICogPC91bD5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcmFuZ2VBPTBdIFRoZSBpdGVyYXRpb24gc3RhcnQgaW5kZXhcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3JhbmdlQj0nbGVuZ3RoIG9mIHRoZSBpdGVtJ10gVGhlIGl0ZXJhdGlvbiBlbmQgaW5kZXhcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Kn0gVGhlIHZhbHVlIHBhc3NlZCB0byB0aGUgZXhpdCBwYXJhbWV0ZXIgb2YgdGhlIGNhbGxiYWNrLi4uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKG8sIHJhbmdlQSwgcmFuZ2VCLCBmKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBDYW4ndCB1c2UgbGFzdCBoZXJlLi4gd291bGQgY2F1c2UgY2lyY3VsYXIgcmVmLi4uXG4gICAgICAgICAgICAgICAgZiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgayA+PSAwOyBrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoYXJndW1lbnRzW2tdIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGYgPSBhcmd1bWVudHNba107XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciByZXQgICAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICBicm9rZW4gPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZiAgID0gbyxcbiAgICAgICAgICAgICAgICAgICAga2V5cywgcHJvcGVydHksIHZhbHVlLFxuXG4gICAgICAgICAgICAgICAgICAgIGV4aXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicm9rZW4gICA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQgICAgICA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpIDogYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZG9lcyBzb21lIGZ1bmt5IHN0dWZmIGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaVxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBcmdzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcmd1bWVudHNdJywgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQSA9IHBhcnNlSW50KHJhbmdlQSk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQSA9IChpc05hTihyYW5nZUEpIHx8ICFpc0Zpbml0ZShyYW5nZUEpKSA/IDAgOiByYW5nZUE7XG5cbiAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcGFyc2VJbnQocmFuZ2VCKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gKGlzTmFOKHJhbmdlQikgfHwgIWlzRmluaXRlKHJhbmdlQikpID8ga2V5cy5sZW5ndGggOiByYW5nZUI7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwLCBuO1xuICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhyYW5nZUEpID4gTWF0aC5hYnMocmFuZ2VCKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VCIDwgMCkgcmFuZ2VCID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQSA8IDApIHJhbmdlQSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPiBrZXlzLmxlbmd0aCAtIDEpIHJhbmdlQSA9IGtleXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPj0gcmFuZ2VCOyBuLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBleGl0LCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZUIgPSByYW5nZUIgKyAxID4ga2V5cy5sZW5ndGggPyBrZXlzLmxlbmd0aCA6IHJhbmdlQiArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUIgPCAwKSByYW5nZUIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBIDwgMCkgcmFuZ2VBID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPCByYW5nZUI7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGV4aXQsIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnJva2VuKSBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIGZhbHNlLCB0aGVcbiAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgZiA9IGYgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGYgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZG9lcyBzb21lIGZ1bmt5IHN0dWZmIGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaS4uLlxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBcmdzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcmd1bWVudHNdJywgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIHRydWUsIHRoZVxuICAgICAgICAgICAgICogbG9vcCBpcyBicm9rZW4gYW5kIGZhbHNlIGlzIHJldHVybmVkOyBvdGhlcndpc2UgdHJ1ZSBpcyByZXR1cm5lZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBub25lIG9mIHRoZSBjYWxsYmFjayBpbnZvY2F0aW9ucyByZXR1cm5lZCBmYWxzZS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbnk6IGZ1bmN0aW9uIGFueSAobywgZikge1xuICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbywga2V5cywgcHJvcGVydHksIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSBzZWxmID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHNlbGYpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIGlkeCAgPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBrZXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyZXQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyBhbiBvYmplY3QgdG8gYW4gYXJyYXkuIEZvciBzdHJpbmdzLCBudW1iZXJzLCBhbmQgZnVuY3Rpb25zIHRoaXMgd2lsbFxuICAgICAgICAgICAgICogcmV0dXJuIGEgY2hhciBhcnJheSB0byB0aGVpciByZXNwZWN0aXZlIC50b1N0cmluZygpIHZhbHVlc1xuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIG9iamVjdCwgY29udmVydGVkIHRvIGFuIGFycmF5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiB0b0FycmF5IChvKSB7XG4gICAgICAgICAgICAgICAgaWYobyBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAodmFsKSB7IGFyci5wdXNoKHZhbCk7IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGZpcnN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICogdGhhdCBpdGVtIHdpbGwgYmUgcmV0dXJuZWQsIHJhdGhlciB0aGFuIGFuIGFycmF5LlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbj0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJldHVyblxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBmaXJzdCBuIGVsZW1lbnRzIG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIGZpcnN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgbiA9IHBhcnNlSW50KG4sIDEwKTtcbiAgICAgICAgICAgICAgICBuID0gaXNOYU4obikgfHwgIWlzRmluaXRlKG4pID8gMSA6IG47XG4gICAgICAgICAgICAgICAgdmFyIHYgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobiAhPT0gMCkgdiA9IG8udG9TdHJpbmcoKS5zbGljZSgwLCBuKTsgZWxzZSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSkgcmV0dXJuIG9bMF07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuICE9PSAwID8gby5zbGljZSgwLCBuKSA6IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDAsIG4gLSAxLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7IHZba2V5XSA9IGl0ZW07IH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHYpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IDEgPyB2W2tleXNbMF1dIDogdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHYubGVuZ3RoID09PSAxID8gdlswXSA6IHY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGxhc3QgbiBlbGVtZW50cyBvZiBhbiBvYmplY3QuIElmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIGFuZCBvbmx5IG9uZSBpdGVtcyBpcyByZXRyaWV2ZWQsXG4gICAgICAgICAgICAgKiB0aGF0IGl0ZW0gd2lsbCBiZSByZXR1cm5lZCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW249MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbGFzdCBuIGVsZW1lbnRzIG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgcmV0dXJuIG87XG5cbiAgICAgICAgICAgICAgICBuID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgICAgICAgICAgIG4gPSBpc05hTihuKSB8fCAhaXNGaW5pdGUobikgPyAxIDogbjtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IG51bGwsIGtleXMsIGxlbiA9IGxpYnMub2JqZWN0LnNpemUobyksIGlkeDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYobGlicy5vYmplY3QuaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IE9iamVjdC5rZXlzKG8pO1xuICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdiA9IFtdOyBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXJndW1lbnRzIG9iamVjdCBzaG91bGQgaWdub3JlIHVuZGVmaW5lZCBtZW1iZXJzLi4uXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goa2V5cywgMCwgbGVuLCBmdW5jdGlvbiAoaykgeyBpZihvW2tdICE9PSB1bmRlZmluZWQpIHYudW5zaGlmdChvW2tdKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHYgPSB2LnNsaWNlKDAsIG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKC1uKTsgZWxzZSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSkgcmV0dXJuIG9bby5sZW5ndGggLTFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbiAhPT0gMCA/IG8uc2xpY2UoLW4pIDogW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPCAwKSBuID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBsZW4gLSBuLCBsZW4sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHsgdltrZXldID0gaXRlbTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyh2KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXMubGVuZ3RoID09PSAxID8gdltrZXlzWzBdXSA6IHY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMSA/IHZbMF0gOiB2Lmxlbmd0aCA+IDAgPyB2IDogbnVsbDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgdGhlIGxhc3QgaXRlbSBpbiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYW4gXCJlbXB0eVwiIGZ1bmN0aW9uIHdpbGwgYmUgcmV0dXJuZWQuXG4gICAgICAgICAgICAgKiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYSBjYWxsYmFjayBjYW4gYWx3YXlzIGJlIGludm9rZWQsIHdpdGhvdXQgY2hlY2tpbmcgaWYgdGhlIGFyZ3VtZW50IGlzIGEgZnVuY3Rpb25cbiAgICAgICAgICAgICAqIG92ZXIgYW5kIG92ZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIGdldCB0aGUgY2FsbGJhY2sgZm9yLlxuICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IElmIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGFuIFwiZW1wdHlcIiBmdW5jdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXRDYWxsYmFjazogZnVuY3Rpb24gZ2V0Q2FsbGJhY2sgKG8pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGFzdCA9IGxpYnMub2JqZWN0Lmxhc3Qobyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxhc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGxhc3QgOiBOVUxMX0ZVTkNUSU9OO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaW5kIGEgY2hpbGQgb2YgYW4gb2JqZWN0IHVzaW5nIHRoZSBnaXZlbiBwYXRoLCBzcGxpdCBieSB0aGUgZ2l2ZW4gZGVsaW1pdGVyIChvciAnLicgYnkgZGVmYXVsdClcbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIHRoZSBjaGlsZCBvYmplY3RcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2RlbGltaXRlcj0nLiddIFRoZSBwYXRoIGRlbGltaXRlclxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGRvbmUgQSBjYWxsYmFjayBmb3IgY29tcGxldGlvblxuICAgICAgICAgICAgICogQHJldHVybiB7KnxOdWxsfSBUaGUgY2hpbGQgb2JqZWN0IGF0IHRoZSBnaXZlbiBzdHJpbmcgcGF0aCwgb3IgbnVsbCBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZpbmRDaGlsZEF0UGF0aDogZnVuY3Rpb24gZmluZENoaWxkQXRQYXRoIChvLCBwYXRoLCBkZWxpbWl0ZXIsIG9yaWdpbmFsLCBpbnZva2VkLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgZG9uZSA9IGxpYnMub2JqZWN0LmdldENhbGxiYWNrKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvO1xuXG4gICAgICAgICAgICAgICAgb3JpZ2luYWwgPSAoIShvcmlnaW5hbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSAmJiBvcmlnaW5hbCkgPyBvcmlnaW5hbCA6IHNlbGY7XG4gICAgICAgICAgICAgICAgaW52b2tlZCAgPSBpbnZva2VkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdvYmplY3QnICYmIHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSB0eXBlb2YgZGVsaW1pdGVyID09PSAnc3RyaW5nJyA/IGRlbGltaXRlciA6ICcuJztcbiAgICAgICAgICAgICAgICAgICAgcGF0aCAgICAgID0gcGF0aC5zcGxpdChkZWxpbWl0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwID0gcGF0aC5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBpZihwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAobywgaywgaSwgZXhpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHBhdGgubGVuZ3RoID09PSAwICYmIGsgPT09IHApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZS5jYWxsKG9yaWdpbmFsLCBvLCBzZWxmLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52b2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXQobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0gbGlicy5vYmplY3QuZmluZENoaWxkQXRQYXRoKG8sIHBhdGguam9pbihkZWxpbWl0ZXIpLCBkZWxpbWl0ZXIsIG9yaWdpbmFsLCBpbnZva2VkLCBkb25lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYob2JqICE9PSBudWxsKSBleGl0KG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoIWludm9rZWQgJiYgb3JpZ2luYWwgPT09IHNlbGYgJiYgZG9uZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSBkb25lLmNhbGwob3JpZ2luYWwsIG51bGwsIHNlbGYsIG51bGwpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQcm9kdWNlcyBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIG9iamVjdCwgdGhhdCBpcywgaWYgSlNPTi5zdHJpbmdpZnkgY2FuIGhhbmRsZSBpdC48YnI+XG4gICAgICAgICAgICAgKiBUaGUgb2JqZWN0IG11c3QgYmUgbm9uLWNpcmN1bGFyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Kn0gQSBzaGFsbG93IGNsb25lIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIGNsb25lIChvKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvID09PSAnbnVtYmVyJykgcmV0dXJuIG87XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGNsb25lIG9iamVjdDogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIGFycmF5IG9yIG9iamVjdCB1c2luZyBvbmx5IHRoZSB0eXBlcyBhbGxvd2VkLiBUaGF0IGlzLCBpZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkgaXMgb2YgYSB0eXBlIGxpc3RlZFxuICAgICAgICAgICAgICogaW4gdGhlIGFyZ3VtZW50cywgdGhlbiBpdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBmaWx0ZXJlZCBhcnJheS4gSW4gdGhpcyBjYXNlICdhcnJheScgaXMgYSB2YWxpZCB0eXBlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHR5cGVzIEEgbGlzdCBvZiB0eXBlb2YgdHlwZXMgdGhhdCBhcmUgYWxsb3dlZCBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gQW4gYXJyYXkgZmlsdGVyZWQgYnkgb25seSB0aGUgYWxsb3dlZCB0eXBlcy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgb25seTogZnVuY3Rpb24gb25seSAobywgdHlwZXMpIHtcbiAgICAgICAgICAgICAgICB0eXBlcyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB0eXBlcy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWxsb3dzIHRoZSAncGx1cmFsJyBmb3JtIG9mIHRoZSB0eXBlLi4uXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaCh0eXBlcywgZnVuY3Rpb24gKHR5cGUsIGtleSkgeyB0aGlzW2tleV0gPSB0eXBlLnJlcGxhY2UoL3MkLywgJycpOyB9KTtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JyB8fCAhbykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgdmFyIGlzQXJyYXkgID0gbyBpbnN0YW5jZW9mIEFycmF5ID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IGlzQXJyYXkgPyBbXSA6IHt9LFxuICAgICAgICAgICAgICAgICAgICB0eXBlQXJyICA9IHR5cGVzLmluZGV4T2YoJ2FycmF5JyksXG4gICAgICAgICAgICAgICAgICAgIHR5cGVPYmogID0gdHlwZXMuaW5kZXhPZignb2JqZWN0IG9iamVjdCcpO1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSXRlbSA9IHR5cGVzLmluZGV4T2YodHlwZW9mIGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVPYmogIT09IC0xICYmIHR5cGVBcnIgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZigodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmICEoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSkgfHwgKHR5cGVvZiBpdGVtICE9PSAnb2JqZWN0JyAmJiB0eXBlSXRlbSAhPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVPYmogIT09IC0xICYmIHR5cGVBcnIgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlcy5wdXNoKCdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVJdGVtICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlSXRlbSAhPT0gLTEgfHwgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSAmJiB0eXBlQXJyICE9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZpbHRlcnMgYW4gb2JqZWN0IHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBvYmplY3RzLCBhIG5ldyBvYmplY3Qgd2lsbCBiZSByZXR1cm5lZCwgd2l0aFxuICAgICAgICAgICAgICogdGhlIHZhbHVlcyB0aGF0IHBhc3NlZCB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3Igc3RyaW5ncywgYSBuZXcgc3RyaW5nIHdpbGwgYmUgcmV0dXJuZWQgd2l0aCB0aGUgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICogdGhhdCBwYXNzZWQgdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIG51bWJlcnMsIGEgbmV3IG51bWJlciB3aWxsIGJlIHJldHVybmVkIHdpdGggdGhlIGRpZ2l0cyB0aGF0IHBhc3NlZFxuICAgICAgICAgICAgICogdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRnVuY3Rpb25zIHdpbGwgYmUgb3BlcmF0ZWQgb24gYXMgc3RyaW5ncy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gdXNlZCB0byBmaWx0ZXIgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBmaWx0ZXJlZCBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uIHdoZXJlIChvLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcCA9IHByZWRpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgcHJlZGljYXRlID0gZnVuY3Rpb24gKGkpIHsgcmV0dXJuIGkgPT0gdGVtcDsgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzT2JqZWN0ID0gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmICEobyBpbnN0YW5jZW9mIEFycmF5KSA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSAhaXNPYmplY3QgPyBbXSA6IHt9O1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHByZWRpY2F0ZS5jYWxsKGl0ZW0sIGl0ZW0sIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzT2JqZWN0KSBmaWx0ZXJlZFtrZXldID0gaXRlbTsgZWxzZSBmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIGZpbHRlcmVkID0gZmlsdGVyZWQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCBieSBrZXlzIHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIHVzZWQgdG8gZmlsdGVyIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdoZXJlS2V5czogZnVuY3Rpb24gd2hlcmVLZXlzIChvLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcCA9IHByZWRpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgcHJlZGljYXRlID0gZnVuY3Rpb24gKGspIHsgcmV0dXJuIGsgPT0gdGVtcDsgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzT2JqZWN0ID0gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmICEobyBpbnN0YW5jZW9mIEFycmF5KSA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSAhaXNPYmplY3QgPyBbXSA6IHt9O1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHByZWRpY2F0ZS5jYWxsKGtleSwga2V5LCBpdGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNPYmplY3QpIGZpbHRlcmVkW2tleV0gPSBpdGVtOyBlbHNlIGZpbHRlcmVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgZmlsdGVyZWQgPSBmaWx0ZXJlZC5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZvciBvYmplY3RzLCBpbnZlcnRzIHRoZSBvYmplY3RzIGtleXMvdmFsdWVzLiBJZiB0aGUgdmFsdWUgaXNuJ3QgYSBudW1iZXIgb3IgYXJyYXksIGl0IHdpbGwgYmUgb21pdHRlZC5cbiAgICAgICAgICAgICAqIEZvciBzdHJpbmdzLCBpdCB3aWxsIHJldmVyc2UgdGhlIHN0cmluZy5cbiAgICAgICAgICAgICAqIEZvciBudW1iZXIsIGl0IHdpbGwgY29tcHV0ZSB0aGUgbnVtYmVyJ3MgaW52ZXJzZSAoaS5lLiAxIC8geCkuXG4gICAgICAgICAgICAgKiBGb3IgZnVuY3Rpb25zLCBpbnZlcnQgcmV0dXJucyBhIG5ldyBmdW5jdGlvbiB0aGF0IHdyYXBzIHRoZSBnaXZlbiBmdW5jdGlvbiBhbmQgaW52ZXJ0cyBpdCdzIHJlc3VsdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBpbnZlcnNlLCBhcyBkZXNjcmliZWQgYWJvdmUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGludmVydDogZnVuY3Rpb24gaW52ZXJ0IChvKSB7XG4gICAgICAgICAgICAgICAgaWYobyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJykgICByZXR1cm4gbGlicy5zdHJpbmcucmV2ZXJzZShvKTtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ251bWJlcicpICAgcmV0dXJuIDEgLyBvO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpICByZXR1cm4gIW87XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkgeyByZXR1cm4gbGlicy5vYmplY3QuaW52ZXJ0KG8uYXBwbHkobywgYXJndW1lbnRzKSk7IH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIGl0ZW0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighb2JqW2l0ZW1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dID0ga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRtcCA9IG9ialtpdGVtXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0ucHVzaCh0bXAsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG1heGltdW0gaXRlbSBpbiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIG1heGltdW0gaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heDogZnVuY3Rpb24gbWF4IChvLCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgaWYoIW8gfHwgdHlwZW9mIG8gIT09ICdvYmplY3QnKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICBpZighKGZ1bmMgaW5zdGFuY2VvZiBGdW5jdGlvbikpIGZ1bmMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgdmFyIG1heCwgbWF4VmFsdWU7XG5cbiAgICAgICAgICAgICAgICBpZighZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA+PSBtYXgpIG1heCA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIG1heFZhbHVlID0gZnVuYy5jYWxsKG1heCwgbWF4KTtcblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmdW5jLmNhbGwoaXRlbSwgaXRlbSkgPj0gbWF4VmFsdWUpIG1heCA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWF4O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtaW5pbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmdW5jIElmIHBhc3NlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtaW5pbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW46IGZ1bmN0aW9uIG1pbiAobywgZnVuYykge1xuICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICB2YXIgbWluLCBtaW5WYWx1ZTtcblxuICAgICAgICAgICAgICAgIGlmKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtIDw9IG1pbikgbWluID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgbWluVmFsdWUgPSBmdW5jLmNhbGwobWluLCBtaW4pO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZ1bmMuY2FsbChpdGVtLCBpdGVtKSA8PSBtaW5WYWx1ZSkgbWluID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtaW47XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRlc3RzIHdoZXRoZXIgb3Igbm90IHRoZSBvYmplY3QgaGFzIGEgbWV0aG9kIGNhbGxlZCAnbWV0aG9kJy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byB0ZXN0IGV4aXN0ZW5jZSBmb3IuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaGFzIGEgZnVuY3Rpb24gY2FsbGVkICdtZXRob2QnLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGltcGxlbWVudHM6IGZ1bmN0aW9uIF9pbXBsZW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgYSAgICA9IGFyZ3Muc2hpZnQoKTtcblxuICAgICAgICAgICAgICAgIGlmKCFhKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3MsIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYVttXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTYW1lIGFzIE9iamVjdC5qLmltcGxlbWVudHMsIGV4Y2VwY3Qgd2l0aCBhIGhhc093blByb3BlcnR5IGNoZWNrLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBUaGUgbmFtZSBvZiB0aGUgbWV0aG9kIHRvIHRlc3QgZXhpc3RlbmNlIGZvci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBoYXMgaXRzIG93biBmdW5jdGlvbiBjYWxsZWQgJ21ldGhvZCcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW1wbGVtZW50c093bjogZnVuY3Rpb24gaW1wbGVtZW50c093biAobywgbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICBpZighYSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmdzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGFbbV0gaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgIW8uaGFzT3duUHJvcGVydHkobWV0aG9kKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBsaWJzO1xufVxuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGxpYnM7XG59KCkpO1xuIiwiZXhwb3J0cy5lbmRpYW5uZXNzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0xFJyB9O1xuXG5leHBvcnRzLmhvc3RuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5ob3N0bmFtZVxuICAgIH1cbiAgICBlbHNlIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubG9hZGF2ZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudXB0aW1lID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gMCB9O1xuXG5leHBvcnRzLmZyZWVtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLnRvdGFsbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy5jcHVzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy50eXBlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0Jyb3dzZXInIH07XG5cbmV4cG9ydHMucmVsZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLm5ldHdvcmtJbnRlcmZhY2VzXG49IGV4cG9ydHMuZ2V0TmV0d29ya0ludGVyZmFjZXNcbj0gZnVuY3Rpb24gKCkgeyByZXR1cm4ge30gfTtcblxuZXhwb3J0cy5hcmNoID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2phdmFzY3JpcHQnIH07XG5cbmV4cG9ydHMucGxhdGZvcm0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnYnJvd3NlcicgfTtcblxuZXhwb3J0cy50bXBkaXIgPSBleHBvcnRzLnRtcERpciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJy90bXAnO1xufTtcblxuZXhwb3J0cy5FT0wgPSAnXFxuJztcbiJdfQ==
