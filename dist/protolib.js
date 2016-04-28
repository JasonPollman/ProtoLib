(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    'use strict';

    /**
     * Function Identifier.
     * @type {Number}
     */
    var oid = -1,

     /**
      * True if the Node.js environment is loaded, false otherwise.
      * @type {Boolean}
      */
    IS_BROWSER = typeof window !== 'undefined';

    // This provides a way to determine the name of a function constructor in a platform agnostic way...
    Object.defineProperty(Object.prototype, '__get_protolib_id__', {
        configurable : true,
        enumerable   : false,
        get          : function () {
            if(typeof this.__protolib_id__ !== 'string' && (typeof this === 'object' || typeof this === 'function')) {
                console.log('setting id of', this.name ? this.name : this, 'to 0x' + (oid + 1).toString(16));
                Object.defineProperty(this, '__protolib_id__', {
                    configurable : false,
                    enumberable  : false,
                    writable     : false,
                    value        : '0x' + (++oid).toString(16)
                });
            }
            return this.__protolib_id__;
        }
    });

    var _objectUid   = Object.__get_protolib_id__,
        _numberUid   = Number.__get_protolib_id__,
        _stringUid   = String.__get_protolib_id__,
        _arrayUid    = Array.__get_protolib_id__,
        _functionUid = Function.__get_protolib_id__,
        _dateUid     = Date.__get_protolib_id__;

    var ProtoLib = function (handle) {
        // Prevent Function.call or binding...
        if(!(this instanceof ProtoLib)) return new ProtoLib(handle);

        // Set either the user the default "handle" (library accessor)
        handle = typeof handle === 'string' ? handle : '_';

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
        inheritanceChain = {},

        /**
         * The static library
         */
        libs = require('./lib/libs')(),

        /**
         * The protolibrary
         */
        libp = require('./lib/libp')(libs, getThisValueAndInvoke);

        // Map the object ids to the library names...
        libp[_objectUid]   = libp.object;
        libp[_stringUid]   = libp.string;
        libp[_numberUid]   = libp.number;
        libp[_arrayUid]    = libp.array;
        libp[_functionUid] = libp.function;
        libp[_dateUid]     = libp.date;

        // Tuck unnamed static extensions here...
        libs.my = {};

        /**
         * Deletes the cache for the given constructor, and all others that inherits from its prototype.
         * Which means if constr === Object, all cache will be deleted.
         * @param {Function} constr The constructor to delete the cache for.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function deleteCacheForConstructor (constr) {
            for(var i in inheritanceChain) {
                if(inheritanceChain.hasOwnProperty(i)) {
                    if(inheritanceChain[i].indexOf(constr.__get_protolib_id__) > -1) {
                        delete cached[i];
                        delete inheritanceChain[i];
                    }
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

        function getProto (o) {
            try {
                return Object.getPrototypeOf(o);
            }
            catch (e) {
                // IE throw when calling Object.getPrototypeOf on primitive values...
                // But not with deprecated __proto__ ???
                return o.__proto__ || o.constructor.prototype; // jshint ignore:line
            }
        }

        /**
         * Adds the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function applyLibraryToPrototypes () {
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
                        var ccId,
                            proto = getProto(this),
                            cId   = proto.constructor.__get_protolib_id__,
                            lib   = {},
                            i     = 0,
                            last  = null;

                        currentThis = this;

                        do {
                            ccId = proto.constructor.__get_protolib_id__;
                            if(cached[ccId] && i === 0) {
                                return cached[ccId];
                            }
                            else {
                                if(!libp[ccId]) libp[ccId] = {};
                                for(var m in libp[ccId])
                                    if(libp[ccId].hasOwnProperty(m)) lib[m] = libp[ccId][m];

                                if(!inheritanceChain[ccId]) inheritanceChain[ccId] = [];
                                inheritanceChain[cId].unshift(ccId);

                                cached[cId] = lib;
                                last = ccId;
                            }

                            ++i;
                        }
                        while (proto = getProto(proto)); // jshint ignore:line

                        lib.__protolib_cId__ = cId;
                        return lib;
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
         * @param {Function=} [constr=Object] The constructor of the object to extend.
         * @param {Function} callback The method to add.
         * @return {Boolean} True if the method was added, false otherwise.
         */
        this.extend = function (name, constr, staticNamespace, callback) {
            callback = libs.object.getCallback(arguments);

            if(typeof name !== 'string'     || !(callback instanceof Function)) return false;
            if(typeof constr !== 'function' || constr === callback) constr = Object;

            var constructorId   = constr.__get_protolib_id__,
                constructorName = typeof staticNamespace === 'string' ?
                    staticNamespace : typeof constr.name === 'string' ? constr.name : 'my';

            switch(true) {
                case constr === Object:
                    constructorName = 'object';
                    break;

                case constr === Array:
                    constructorName = 'array';
                    break;

                case constr === String:
                    constructorName = 'string';
                    break;

                case constr === Number:
                    constructorName = 'number';
                    break;

                case constr === Function:
                    constructorName = 'function';
                    break;

                case constr === Date:
                    constructorName = 'date';
                    break;
            }

            // Set this property so we can remove it later if ProtoLib.remove is called on it...
            Object.defineProperty(constr, '__protolib_static_namespace__', {
                configurable : true,
                writable     : true,
                enumerable   : false,
                value        : constructorName
            });

            if(!libp[constructorId])   libp[constructorId]   = {};
            if(!libs[constructorName]) libs[constructorName] = {};

            libs[constructorName][name] = callback;
            libp[constructorId][name]   = function () {
                var args = libs.object.toArray(arguments);
                return getThisValueAndInvoke(function (c) {
                    args.push(c);
                    return callback.apply(c, args);
                });
            };

            deleteCacheForConstructor(constr);
            return true;
        };

        /**
         * Removes a library method from a constructor's prototype.
         * @param {String} name The name of the library method to remove.
         * @param {Function} constr The constructor to remove the method from.
         * @return {Boolean} True if the method was removed, false otherwise.
         */
        this.remove = function (name, constr) {
            if(typeof name !== 'string' || typeof constr !== 'function') return false;

            var uid = constr.__get_protolib_id__;
            if(libp[uid] && libp[uid][name]) {
                delete libp[uid][name];

                if(libs[constr.__protolib_static_namespace__] && libs[constr.__protolib_static_namespace__][name])
                    delete libs[constr.__protolib_static_namespace__][name];

                deleteCacheForConstructor(constr);
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
            return self;
        };

        // Apply the library to the object prototype, and attach all the static functions
        // to the current ProtoLib instance...
        self.load();
    };

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


    Object.setPrototypeOf = Object.setPrototypeOf || function (obj, proto) {
        var p = obj.__proto__ || obj.constructor.prototype;
        p = proto;
        return obj;
    };

    /**
     * Alters Firefox's Function.toString() results to match Chrome/Safari.
     * @param {String} s The string representation of the function.
     * @return {String} The altered string, with newlines replaced and 'use strict' removed.
     */
    function fixFirefoxFunctionString (s) {
        return s.replace(/(?:\r)?\n+/g, '').replace(/"use strict";|'use strict';/g, '');
    }

    /**
     * IE doesn't allow Object.keys on primitive types...
     * @return {Array<String|Number>}
     */
    function getKeys (o) {
        switch(typeof o) {
            case 'object':
                return o ? Object.keys(o) : [];

            case 'string':
                var keys = [];
                for(var i = 0; i < o.length; i++) keys.push(i.toString());
                return keys;

            default:
                return [];
        }
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
                        while(m = regexp.exec(obj)) count++; // jshint ignore:line
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
                if(o === undefined || o === null) return [];

                var keys = getKeys(o), idx;
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
                    keys = getKeys(self);
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
                    keys = getKeys(self);
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
                    keys = getKeys(self);
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
                    var keys = getKeys(v);
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
                    keys = getKeys(o);
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
                    keys = getKeys(v);
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
                    predicate = function (i) { return i == temp; }; // jshint ignore:line
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
                    predicate = function (k) { return k == temp; }; // jshint ignore:line
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3I4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBJZGVudGlmaWVyLlxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdmFyIG9pZCA9IC0xLFxuXG4gICAgIC8qKlxuICAgICAgKiBUcnVlIGlmIHRoZSBOb2RlLmpzIGVudmlyb25tZW50IGlzIGxvYWRlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICovXG4gICAgSVNfQlJPV1NFUiA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnO1xuXG4gICAgLy8gVGhpcyBwcm92aWRlcyBhIHdheSB0byBkZXRlcm1pbmUgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiBjb25zdHJ1Y3RvciBpbiBhIHBsYXRmb3JtIGFnbm9zdGljIHdheS4uLlxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnX19nZXRfcHJvdG9saWJfaWRfXycsIHtcbiAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgIGdldCAgICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB0aGlzLl9fcHJvdG9saWJfaWRfXyAhPT0gJ3N0cmluZycgJiYgKHR5cGVvZiB0aGlzID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdGhpcyA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0dGluZyBpZCBvZicsIHRoaXMubmFtZSA/IHRoaXMubmFtZSA6IHRoaXMsICd0byAweCcgKyAob2lkICsgMSkudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fcHJvdG9saWJfaWRfXycsIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVudW1iZXJhYmxlICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZSAgICAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgICAgIDogJzB4JyArICgrK29pZCkudG9TdHJpbmcoMTYpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fX3Byb3RvbGliX2lkX187XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBfb2JqZWN0VWlkICAgPSBPYmplY3QuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX251bWJlclVpZCAgID0gTnVtYmVyLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9zdHJpbmdVaWQgICA9IFN0cmluZy5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfYXJyYXlVaWQgICAgPSBBcnJheS5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfZnVuY3Rpb25VaWQgPSBGdW5jdGlvbi5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfZGF0ZVVpZCAgICAgPSBEYXRlLl9fZ2V0X3Byb3RvbGliX2lkX187XG5cbiAgICB2YXIgUHJvdG9MaWIgPSBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICAgIC8vIFByZXZlbnQgRnVuY3Rpb24uY2FsbCBvciBiaW5kaW5nLi4uXG4gICAgICAgIGlmKCEodGhpcyBpbnN0YW5jZW9mIFByb3RvTGliKSkgcmV0dXJuIG5ldyBQcm90b0xpYihoYW5kbGUpO1xuXG4gICAgICAgIC8vIFNldCBlaXRoZXIgdGhlIHVzZXIgdGhlIGRlZmF1bHQgXCJoYW5kbGVcIiAobGlicmFyeSBhY2Nlc3NvcilcbiAgICAgICAgaGFuZGxlID0gdHlwZW9mIGhhbmRsZSA9PT0gJ3N0cmluZycgPyBoYW5kbGUgOiAnXyc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgc2VsZiByZWZlcmVuY2UuXG4gICAgICAgICAqIEB0eXBlIHtQcm90b0xpYn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciBvciBub3QgdGhlIGxpYnJhcnkgZnVuY3Rpb25zIGhhdmUgYmVlbiBhdHRhY2hlZCB0byB0aGUgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBhdHRhY2hlZCA9IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQb2ludHMgdG8gdGhlIGN1cnJlbnQgdGhpcyBpdGVtLlxuICAgICAgICAgKiBAdHlwZSB7Kn1cbiAgICAgICAgICovXG4gICAgICAgIGN1cnJlbnRUaGlzID0gbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcmVzIGNhY2hlZCBsaWJyYXJ5IHByb3RvIHJlZmVyZW5jZSBvYmplY3RzXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBjYWNoZWQgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcmVzIHRoZSBjb25zdHJ1Y3RvciBjaGFpbiBmb3IgZWFjaCBwcm90b3R5cGUgYXMgYW4gYXJyYXkuXG4gICAgICAgICAqIEZvciBleGFtcGxlOiB7IHN0cmluZzogWydvYmplY3QnLCAnc3RyaW5nJ10gfS5cbiAgICAgICAgICogQW5vdGhlciBleGFtcGxlOiB7IG15Q3VzdG9tQ2xhc3NUaGF0RXh0ZW5kc1N0cmluZzogWydvYmplY3QnLCAnc3RyaW5nJywgJ215Q3VzdG9tQ2xhc3NUaGF0RXh0ZW5kc1N0cmluZyddIH1cbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGluaGVyaXRhbmNlQ2hhaW4gPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHN0YXRpYyBsaWJyYXJ5XG4gICAgICAgICAqL1xuICAgICAgICBsaWJzID0gcmVxdWlyZSgnLi9saWIvbGlicycpKCksXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBwcm90b2xpYnJhcnlcbiAgICAgICAgICovXG4gICAgICAgIGxpYnAgPSByZXF1aXJlKCcuL2xpYi9saWJwJykobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKTtcblxuICAgICAgICAvLyBNYXAgdGhlIG9iamVjdCBpZHMgdG8gdGhlIGxpYnJhcnkgbmFtZXMuLi5cbiAgICAgICAgbGlicFtfb2JqZWN0VWlkXSAgID0gbGlicC5vYmplY3Q7XG4gICAgICAgIGxpYnBbX3N0cmluZ1VpZF0gICA9IGxpYnAuc3RyaW5nO1xuICAgICAgICBsaWJwW19udW1iZXJVaWRdICAgPSBsaWJwLm51bWJlcjtcbiAgICAgICAgbGlicFtfYXJyYXlVaWRdICAgID0gbGlicC5hcnJheTtcbiAgICAgICAgbGlicFtfZnVuY3Rpb25VaWRdID0gbGlicC5mdW5jdGlvbjtcbiAgICAgICAgbGlicFtfZGF0ZVVpZF0gICAgID0gbGlicC5kYXRlO1xuXG4gICAgICAgIC8vIFR1Y2sgdW5uYW1lZCBzdGF0aWMgZXh0ZW5zaW9ucyBoZXJlLi4uXG4gICAgICAgIGxpYnMubXkgPSB7fTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBjb25zdHJ1Y3RvciwgYW5kIGFsbCBvdGhlcnMgdGhhdCBpbmhlcml0cyBmcm9tIGl0cyBwcm90b3R5cGUuXG4gICAgICAgICAqIFdoaWNoIG1lYW5zIGlmIGNvbnN0ciA9PT0gT2JqZWN0LCBhbGwgY2FjaGUgd2lsbCBiZSBkZWxldGVkLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIHRvIGRlbGV0ZSB0aGUgY2FjaGUgZm9yLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IgKGNvbnN0cikge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIGluaGVyaXRhbmNlQ2hhaW4pIHtcbiAgICAgICAgICAgICAgICBpZihpbmhlcml0YW5jZUNoYWluLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGluaGVyaXRhbmNlQ2hhaW5baV0uaW5kZXhPZihjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfXykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlZFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbmhlcml0YW5jZUNoYWluW2ldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwZW5kcyBhbGwgdGhlIGxpYnJhcnkgZnVuY3Rpb25zIHRvIHRoaXMgaW5zdGFuY2UgZm9yIHN0YXRpYyB1c2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gYXR0YWNoTGlicmFyeVRvU2VsZiAoKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gbGlicylcbiAgICAgICAgICAgICAgICBpZihsaWJzLmhhc093blByb3BlcnR5KGkpICYmICFzZWxmW2ldKSBzZWxmW2ldID0gbGlic1tpXTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0UHJvdG8gKG8pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSUUgdGhyb3cgd2hlbiBjYWxsaW5nIE9iamVjdC5nZXRQcm90b3R5cGVPZiBvbiBwcmltaXRpdmUgdmFsdWVzLi4uXG4gICAgICAgICAgICAgICAgLy8gQnV0IG5vdCB3aXRoIGRlcHJlY2F0ZWQgX19wcm90b19fID8/P1xuICAgICAgICAgICAgICAgIHJldHVybiBvLl9fcHJvdG9fXyB8fCBvLmNvbnN0cnVjdG9yLnByb3RvdHlwZTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkcyB0aGUgbGlicmFyeSBtZXRob2RzIGZyb20gdGhlIHByaW1pdGl2ZSBvYmplY3QgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhcHBseUxpYnJhcnlUb1Byb3RvdHlwZXMgKCkge1xuICAgICAgICAgICAgaWYoIWF0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgYXR0YWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCBoYW5kbGUsIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IHVzZXJzIHRvIG92ZXJ3cml0ZSB0aGUgaGFuZGxlIG9uIGEgcGVyIGluc3RhbmNlIGJhc2lzLi4uXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRoaXNbaGFuZGxlXSAhPT0gdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBoYW5kbGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgICAgIDogdlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIHRoZSBsaWJwIGxpYnJhcnkuLi5cbiAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2NJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm90byA9IGdldFByb3RvKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNJZCAgID0gcHJvdG8uY29uc3RydWN0b3IuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWIgICA9IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgICAgID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0ICA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUaGlzID0gdGhpcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNjSWQgPSBwcm90by5jb25zdHJ1Y3Rvci5fX2dldF9wcm90b2xpYl9pZF9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNhY2hlZFtjY0lkXSAmJiBpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZWRbY2NJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighbGlicFtjY0lkXSkgbGlicFtjY0lkXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG0gaW4gbGlicFtjY0lkXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxpYnBbY2NJZF0uaGFzT3duUHJvcGVydHkobSkpIGxpYlttXSA9IGxpYnBbY2NJZF1bbV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWluaGVyaXRhbmNlQ2hhaW5bY2NJZF0pIGluaGVyaXRhbmNlQ2hhaW5bY2NJZF0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbltjSWRdLnVuc2hpZnQoY2NJZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVkW2NJZF0gPSBsaWI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgPSBjY0lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChwcm90byA9IGdldFByb3RvKHByb3RvKSk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWIuX19wcm90b2xpYl9jSWRfXyA9IGNJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIHRoZSBwcmltaXRpdmUgb2JqZWN0IHByb3RvdHlwZXMuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzICgpIHtcbiAgICAgICAgICAgIGlmKGF0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIE9iamVjdC5wcm90b3R5cGVbaGFuZGxlXTtcbiAgICAgICAgICAgICAgICBhdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmVzIHRoZSBsYXN0IGl0ZW0gZnJvbSB0aGUgJ3RoaXNQb2ludGVyU3RhY2snIGFuZCBpbnZva2VzIHRoZSBwcm92aWRlZCBjYWxsYmFjayB3aXRoIGl0LlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBjdXJyZW50ICd0aGlzJyB2YWx1ZS5cbiAgICAgICAgICogQHJldHVybiBUaGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldFRoaXNWYWx1ZUFuZEludm9rZSAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjdXJyZW50VGhpcyAhPT0gdW5kZWZpbmVkICYmIGN1cnJlbnRUaGlzICE9PSBudWxsID8gY3VycmVudFRoaXMudmFsdWVPZigpIDogY3VycmVudFRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIGhhbmRsZVxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gaCBUaGUgbmV3IGhhbmRsZVxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0SGFuZGxlID0gZnVuY3Rpb24gKGgpIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBoID09PSAnc3RyaW5nJykgaGFuZGxlID0gaDtcbiAgICAgICAgICAgIHJlbW92ZUxpYnJhcnlGcm9tUHJvdG90eXBlcygpO1xuICAgICAgICAgICAgYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkcyBhIGxpYnJhcnkgbWV0aG9kIHRvIGEgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgbGlicmFyeSBtZXRob2QgdG8gYWRkLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gW2NvbnN0cj1PYmplY3RdIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgb2JqZWN0IHRvIGV4dGVuZC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgYWRkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXh0ZW5kID0gZnVuY3Rpb24gKG5hbWUsIGNvbnN0ciwgc3RhdGljTmFtZXNwYWNlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgICAgIHx8ICEoY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBjb25zdHIgIT09ICdmdW5jdGlvbicgfHwgY29uc3RyID09PSBjYWxsYmFjaykgY29uc3RyID0gT2JqZWN0O1xuXG4gICAgICAgICAgICB2YXIgY29uc3RydWN0b3JJZCAgID0gY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gdHlwZW9mIHN0YXRpY05hbWVzcGFjZSA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgICAgICAgICBzdGF0aWNOYW1lc3BhY2UgOiB0eXBlb2YgY29uc3RyLm5hbWUgPT09ICdzdHJpbmcnID8gY29uc3RyLm5hbWUgOiAnbXknO1xuXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBPYmplY3Q6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ2FycmF5JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gU3RyaW5nOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gTnVtYmVyOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnbnVtYmVyJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gRnVuY3Rpb246XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IERhdGU6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdkYXRlJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGlzIHByb3BlcnR5IHNvIHdlIGNhbiByZW1vdmUgaXQgbGF0ZXIgaWYgUHJvdG9MaWIucmVtb3ZlIGlzIGNhbGxlZCBvbiBpdC4uLlxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvbnN0ciwgJ19fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fJywge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlICAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBjb25zdHJ1Y3Rvck5hbWVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZighbGlicFtjb25zdHJ1Y3RvcklkXSkgICBsaWJwW2NvbnN0cnVjdG9ySWRdICAgPSB7fTtcbiAgICAgICAgICAgIGlmKCFsaWJzW2NvbnN0cnVjdG9yTmFtZV0pIGxpYnNbY29uc3RydWN0b3JOYW1lXSA9IHt9O1xuXG4gICAgICAgICAgICBsaWJzW2NvbnN0cnVjdG9yTmFtZV1bbmFtZV0gPSBjYWxsYmFjaztcbiAgICAgICAgICAgIGxpYnBbY29uc3RydWN0b3JJZF1bbmFtZV0gICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChjKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGMsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZGVsZXRlQ2FjaGVGb3JDb25zdHJ1Y3Rvcihjb25zdHIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgYSBsaWJyYXJ5IG1ldGhvZCBmcm9tIGEgY29uc3RydWN0b3IncyBwcm90b3R5cGUuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBsaWJyYXJ5IG1ldGhvZCB0byByZW1vdmUuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0ciBUaGUgY29uc3RydWN0b3IgdG8gcmVtb3ZlIHRoZSBtZXRob2QgZnJvbS5cbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWV0aG9kIHdhcyByZW1vdmVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlbW92ZSA9IGZ1bmN0aW9uIChuYW1lLCBjb25zdHIpIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgY29uc3RyICE9PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIHZhciB1aWQgPSBjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfXztcbiAgICAgICAgICAgIGlmKGxpYnBbdWlkXSAmJiBsaWJwW3VpZF1bbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgbGlicFt1aWRdW25hbWVdO1xuXG4gICAgICAgICAgICAgICAgaWYobGlic1tjb25zdHIuX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX19dICYmIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXTtcblxuICAgICAgICAgICAgICAgIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyB0aGUgcHJvdG90eXBlIGxpYnJhcnkgcmVmZXJlbmNlIGZyb20gdGhlIG9iamVjdCBwcm90b3R5cGUuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy51bmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZW1vdmVMaWJyYXJ5RnJvbVByb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcHBsaWVzIHRoZSBsaWJyYXJ5IHRvIHRoZSBvYmplY3QgcHJvdG90eXBlIGFuZCBhbGwgc3RhdGljIGZ1bmN0aW9uc1xuICAgICAgICAgKiB0byB0aGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZS5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhcHBseUxpYnJhcnlUb1Byb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIGF0dGFjaExpYnJhcnlUb1NlbGYoKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSBsaWJyYXJ5IHRvIHRoZSBvYmplY3QgcHJvdG90eXBlLCBhbmQgYXR0YWNoIGFsbCB0aGUgc3RhdGljIGZ1bmN0aW9uc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZS4uLlxuICAgICAgICBzZWxmLmxvYWQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuICFJU19CUk9XU0VSID9cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgID0gUHJvdG9MaWIgOlxuICAgICAgICB3aW5kb3cuUHJvdG9MaWIgPSBQcm90b0xpYiA7XG59KCkpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgZnVuY3Rpb24gbGlicCAobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKSB7XG4gICAgICAgIHZhciBsaWJwID0ge1xuICAgICAgICAgICAgc3RyaW5nOiB7XG5cbiAgICAgICAgICAgICAgICBjYW1lbGl6ZTogZnVuY3Rpb24gY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuY2FtZWxpemUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkZWNhbWVsaXplOiBmdW5jdGlvbiBkZWNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmRlY2FtZWxpemUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkaWZmZXJlbmNlRnJvbVN0cmluZzogZnVuY3Rpb24gZGlmZmVyZW5jZUZyb21TdHJpbmcgKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5kaWZmZXJlbmNlRnJvbVN0cmluZyhzLCBvdGhlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByZXBsYWNlVG9rZW5zOiBmdW5jdGlvbiByZXBsYWNlVG9rZW5zICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJlcGxhY2VTdHJpbmdUb2tlbnMocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbnRlcnNlY3RTdHJpbmc6IGZ1bmN0aW9uIGludGVyc2VjdFN0cmluZyAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmludGVyc2VjdFN0cmluZyhzLCBvdGhlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByZXBlYXQ6IGZ1bmN0aW9uIHJlcGVhdCAodGltZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJlcGVhdChzLCB0aW1lcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBydHJpbTogZnVuY3Rpb24gcnRyaW0gKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJ0cmltKHMsIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbHRyaW06IGZ1bmN0aW9uIGx0cmltICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5sdHJpbShzLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGh0bWxFbmNvZGU6IGZ1bmN0aW9uIGh0bWxFbmNvZGUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuaHRtbEVuY29kZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGh0bWxEZWNvZGU6IGZ1bmN0aW9uIGh0bWxEZWNvZGUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuaHRtbERlY29kZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFkZFNsYXNoZXM6IGZ1bmN0aW9uIGFkZFNsYXNoZXMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuYWRkU2xhc2hlcyhzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHVjRmlyc3Q6IGZ1bmN0aW9uIHVjRmlyc3QgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcudWNGaXJzdChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGxjRmlyc3Q6IGZ1bmN0aW9uIGxjRmlyc3QgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubGNGaXJzdChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gdGl0bGVDYXNlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnRpdGxlQ2FzZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNwbGljZTogZnVuY3Rpb24gc3BsaWNlIChpbmRleCwgY291bnQsIGFkZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuc3BsaWNlKHMsIGluZGV4LCBjb3VudCwgYWRkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGVsbGlwc2VzOiBmdW5jdGlvbiBlbGxpcHNlc18gKGxlbmd0aCwgcGxhY2UsIGVsbGlwc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5lbGxpcHNlcyhzLCBsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChzcGxpdHRlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuc2h1ZmZsZShzLCBzcGxpdHRlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByZXZlcnNlOiBmdW5jdGlvbiByZXZlcnNlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJldmVyc2Uocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3aXRob3V0VHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aG91dFRyYWlsaW5nU2xhc2ggKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud2l0aG91dFRyYWlsaW5nU2xhc2gocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3aXRoVHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aFRyYWlsaW5nU2xhc2ggKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud2l0aFRyYWlsaW5nU2xhc2gocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByZWdleHBTYWZlOiBmdW5jdGlvbiByZWdleHBTYWZlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJlZ2V4cFNhZmUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAobGVuZ3RoLCBkZWxpbSwgcHJlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5wYWQocywgbGVuZ3RoLCBkZWxpbSwgcHJlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG5ld2xpbmVUb0JyZWFrOiBmdW5jdGlvbiBuZXdsaW5lVG9CcmVhayAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5uZXdsaW5lVG9CcmVhayhzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHRhYnNUb1NwYW46IGZ1bmN0aW9uIHRhYnNUb1NwYW4gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcudGFic1RvU3BhbihzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdvcmRXcmFwVG9MZW5ndGg6IGZ1bmN0aW9uIHdvcmRXcmFwVG9MZW5ndGggKHdpZHRoLCBwYWRsZWZ0LCBwYWRyaWdodCwgb21pdEZpcnN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53b3JkV3JhcFRvTGVuZ3RoKHMsIHdpZHRoLCBwYWRsZWZ0LCBwYWRyaWdodCwgb21pdEZpcnN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGFycmF5OiB7XG4gICAgICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnNodWZmbGUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB1bmlvbjogZnVuY3Rpb24gdW5pb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkudW5pb24uYXBwbHkoYSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkaWZmZXJlbmNlOiBmdW5jdGlvbiBkaWZmZXJlbmNlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmRpZmZlcmVuY2UuYXBwbHkoYSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbnRlcnNlY3Q6IGZ1bmN0aW9uIGludGVyc2VjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5pbnRlcnNlY3QuYXBwbHkoYSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3aXRob3V0OiBmdW5jdGlvbiB3aXRob3V0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LndpdGhvdXQuYXBwbHkoYSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByb3RhdGU6IGZ1bmN0aW9uIHJvdGF0ZSAoZGlyZWN0aW9uLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsIGRpcmVjdGlvbiwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJvdGF0ZUxlZnQ6IGZ1bmN0aW9uIHJvdGF0ZUxlZnQgKGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGVMZWZ0KGEsIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByb3RhdGVSaWdodDogZnVuY3Rpb24gcm90YXRlUmlnaHQgKGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGVSaWdodChhLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWFrZVVuaXF1ZTogZnVuY3Rpb24gbWFrZVVuaXF1ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5Lm1ha2VVbmlxdWUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB1bmlxdWU6IGZ1bmN0aW9uIHVuaXF1ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnVuaXF1ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFzY2VuZGluZzogZnVuY3Rpb24gYXNjZW5kaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuYXNjZW5kaW5nKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGVzY2VuZGluZzogZnVuY3Rpb24gZGVzY2VuZGluZyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmRlc2NlbmRpbmcoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG51bWJlcjoge1xuXG4gICAgICAgICAgICAgICAgdG86IGZ1bmN0aW9uIHRvXyAoaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNJbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gJSAxID09PSAwICYmIG4udG9TdHJpbmcoKS5pbmRleE9mKCcuJykgPT09IC0xKSBpc0ludCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNJbnQgPyBsaWJzLm51bWJlci5yYW5kb21JbnRJblJhbmdlKG4sIGspIDogbGlicy5udW1iZXIucmFuZG9tTnVtYmVySW5SYW5nZShuLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGlzSW50OiBmdW5jdGlvbiBpc0ludCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5pc0ludChuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZhY3RvcmlhbDogZnVuY3Rpb24gZmFjdG9yaWFsICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmZhY3RvcmlhbChuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNob29zZTogZnVuY3Rpb24gY2hvb3NlIChrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jaG9vc2Uobiwgayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAobGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5wYWQobiwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRheXNGcm9tOiBmdW5jdGlvbiBkYXlzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzRnJvbU5vdzogZnVuY3Rpb24gZGF5c0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbTogZnVuY3Rpb24gc2Vjb25kc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0Zyb21Ob3c6IGZ1bmN0aW9uIHNlY29uZHNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeWVhcnNGcm9tOiBmdW5jdGlvbiB5ZWFyc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHllYXJzRnJvbU5vdzogZnVuY3Rpb24geWVhcnNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1vbnRoc0Zyb206IGZ1bmN0aW9uIG1vbnRoc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1vbnRoc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tTm93OiBmdW5jdGlvbiBtb250aHNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1vbnRoc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBob3Vyc0Zyb206IGZ1bmN0aW9uIGhvdXJzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaG91cnNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaG91cnNGcm9tTm93OiBmdW5jdGlvbiBob3Vyc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaG91cnNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb206IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tTm93OiBmdW5jdGlvbiBtaW51dGVzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1vbnRoc0FnbzogZnVuY3Rpb24gbW9udGhzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1vbnRoc0FnbyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRheXNBZ286IGZ1bmN0aW9uIGRheXNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0FnbyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNBZ286IGZ1bmN0aW9uIHNlY29uZHNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0FnbyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbnV0ZXNBZ286IGZ1bmN0aW9uIG1pbnV0ZXNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0FnbyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHllYXJzQWdvOiBmdW5jdGlvbiB5ZWFyc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0FnbyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmNsb2NrVGltZShuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZnVuY3Rpb246IHtcbiAgICAgICAgICAgICAgICBpbmhlcml0czogZnVuY3Rpb24gaW5oZXJpdHMgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZnVuY3Rpb24uaW5oZXJpdHMobywgcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgICAgIGhpc3RvZ3JhbTogZnVuY3Rpb24gaGlzdG9ncmFtICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lmhpc3RvZ3JhbShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKHN0YXJ0LCBlbmQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5lYWNoKG8sIHN0YXJ0LCBlbmQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG9jY3VycmVuY2VzT2Y6IGZ1bmN0aW9uIG9jY3VycmVuY2VzT2YgKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm9jY3VycmVuY2VzT2Yobywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBrZXlzOiBmdW5jdGlvbiBrZXlzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmtleXMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzaXplOiBmdW5jdGlvbiBzaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bWVyaWM6IGZ1bmN0aW9uIGlzTnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXROdW1lcmljOiBmdW5jdGlvbiBnZXROdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldE51bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRW1wdHkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiBpc0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc1B1cmVPYmplY3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNTdHJpbmcobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gaXNVbmRlZmluZWQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNVbmRlZmluZWQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bGwobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Jvb2xlYW46IGZ1bmN0aW9uIGlzQm9vbGVhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0Jvb2xlYW4obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbiBpc0Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRnVuY3Rpb24obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNBcmd1bWVudHMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b051bWJlcjogZnVuY3Rpb24gdG9OdW1iZXIgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9OdW1iZXIobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0ludDogZnVuY3Rpb24gdG9JbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9JbnQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiB0b0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXRDYWxsYmFjazogZnVuY3Rpb24gZ2V0Q2FsbGJhY2sgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2sobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5yYW5kb20obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBldmVyeTogZnVuY3Rpb24gZXZlcnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYW55OiBmdW5jdGlvbiBhbnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFueShvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiBmaXJzdCAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmlyc3Qobywgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5sYXN0KG8sIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmluZENoaWxkQXRQYXRoOiBmdW5jdGlvbiBmaW5kQ2hpbGRBdFBhdGggKHBhdGgsIGRlbGltaXRlciwgZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmluZENoaWxkQXRQYXRoKG8sIHBhdGgsIGRlbGltaXRlciwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gY2xvbmUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY2xvbmUobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBvbmx5OiBmdW5jdGlvbiBvbmx5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5vbmx5LmFwcGx5KG8sIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uIHdoZXJlIChwcmVkaWNhdGVGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qud2hlcmUobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmVLZXlzOiBmdW5jdGlvbiB3aGVyZUtleXMgKHByZWRpY2F0ZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC53aGVyZUtleXMobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW52ZXJ0OiBmdW5jdGlvbiBpbnZlcnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW52ZXJ0KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWF4OiBmdW5jdGlvbiBtYXggKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm1heChvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbjogZnVuY3Rpb24gbWluIChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5taW4obywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzOiBmdW5jdGlvbiBfaW1wbGVtZW50cyAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pbXBsZW1lbnRzKG8sIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzT3duOiBmdW5jdGlvbiBpbXBsZW1lbnRzT3duIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmltcGxlbWVudHNPd24obywgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRhdGU6IHtcbiAgICAgICAgICAgICAgICBhZHZhbmNlRGF5czogZnVuY3Rpb24gYWR2YW5jZURheXMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuYWR2YW5jZURheXMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFkdmFuY2VNb250aHM6IGZ1bmN0aW9uIGFkdmFuY2VNb250aHMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuYWR2YW5jZU1vbnRocyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWR2YW5jZVllYXJzOiBmdW5jdGlvbiBhZHZhbmNlWWVhcnMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuYWR2YW5jZVllYXJzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5eW1tZGQ6IGZ1bmN0aW9uIHl5bW1kZCAoZGVsaW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lnl5bW1kZChkLCBkZWxpbSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAob21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5jbG9ja1RpbWUoZCwgISFvbWl0TVMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBsaWJwO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGxpYnA7XG59KCkpO1xuIiwiZnVuY3Rpb24gbGlicyAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBJU19CUk9XU0VSID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcsXG4gICAgICAgIEhBU19PUyAgICAgPSBJU19CUk9XU0VSID8gZmFsc2UgOiB0eXBlb2YgcmVxdWlyZSgnb3MnKSA9PT0gJ29iamVjdCc7XG5cblxuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiAob2JqLCBwcm90bykge1xuICAgICAgICB2YXIgcCA9IG9iai5fX3Byb3RvX18gfHwgb2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgcCA9IHByb3RvO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBbHRlcnMgRmlyZWZveCdzIEZ1bmN0aW9uLnRvU3RyaW5nKCkgcmVzdWx0cyB0byBtYXRjaCBDaHJvbWUvU2FmYXJpLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIGZ1bmN0aW9uLlxuICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGFsdGVyZWQgc3RyaW5nLCB3aXRoIG5ld2xpbmVzIHJlcGxhY2VkIGFuZCAndXNlIHN0cmljdCcgcmVtb3ZlZC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcgKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKD86XFxyKT9cXG4rL2csICcnKS5yZXBsYWNlKC9cInVzZSBzdHJpY3RcIjt8J3VzZSBzdHJpY3QnOy9nLCAnJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSUUgZG9lc24ndCBhbGxvdyBPYmplY3Qua2V5cyBvbiBwcmltaXRpdmUgdHlwZXMuLi5cbiAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmd8TnVtYmVyPn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRLZXlzIChvKSB7XG4gICAgICAgIHN3aXRjaCh0eXBlb2Ygbykge1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbyA/IE9iamVjdC5rZXlzKG8pIDogW107XG5cbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgby5sZW5ndGg7IGkrKykga2V5cy5wdXNoKGkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIE5VTExfRlVOQ1RJT04gPSBmdW5jdGlvbiBFTVBUWV9DQUxMQkFDS19SRVBMQUNFTUVOVCAoKSB7fTtcblxuICAgIHZhciBsaWJzID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdHJpbmcgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHN0cmluZzoge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENhbWVsaXplcyBhbGwgb2YgdGhlIHByb3ZpZGVkIHN0cmluZyBhcmd1bWVudHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLlN0cmluZ30gc3RyaW5nIEEgbGlzdCBvZiBzdHJpbmdzIHRvIGNhbWVsaXplLlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn0gQW4gYXJyYXkgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cywgd2l0aCBhbGwgc3RyaW5ncyBjYW1lbGl6ZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNhbWVsaXplOiBmdW5jdGlvbiBjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHMgPT09ICdmdW5jdGlvbicpIHMgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcocy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBzLnRvU3RyaW5nKCkucmVwbGFjZSgvW15hLXowLTkkXS9naSwgJ18nKS5yZXBsYWNlKC9cXCQoXFx3KS9nLCAnJF8kMScpLnNwbGl0KC9bXFxzX10rL2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChzLCAxLCBzLmxlbmd0aCwgZnVuY3Rpb24gKGksIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tdID0gbGlicy5zdHJpbmcudWNGaXJzdChpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcyA9IGxpYnMuc3RyaW5nLmxjRmlyc3Qocy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gocyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldC5sZW5ndGggPT09IDEgPyByZXRbMF0gOiByZXQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlY2FtZWxpemVzIGFsbCBvZiB0aGUgcHJvdmlkZWQgc3RyaW5nIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSBzdHJpbmcgQSBsaXN0IG9mIHN0cmluZ3MgdG8gZGVjYW1lbGl6ZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PFN0cmluZz59IEFuIGFycmF5IG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMsIHdpdGggYWxsIHN0cmluZ3MgZGVjYW1lbGl6ZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRlY2FtZWxpemU6IGZ1bmN0aW9uIGRlY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzID09PSAnZnVuY3Rpb24nKSBzID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzID0gcy50b1N0cmluZygpLnJlcGxhY2UoLyhbQS1aJF0pL2csIGZ1bmN0aW9uICgkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcgJyArICh0eXBlb2YgJCA9PT0gJ3N0cmluZycgPyAkLnRvTG93ZXJDYXNlKCkgOiAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaCh0eXBlb2YgcyA9PT0gJ3N0cmluZycgPyBzLnRyaW0oKSA6IHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQubGVuZ3RoID09PSAxID8gcmV0WzBdIDogcmV0O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFsbCB0aGUgY2hhcmFjdGVycyBmb3VuZCBpbiBvbmUgc3RyaW5nIGJ1dCBub3QgdGhlIG90aGVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG90aGVyIFRoZSBzdHJpbmcgdG8gY29tcHV0ZSB0aGUgZGlmZmVyZW5jZSBhZ2FpbnN0LlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIGRpZmZlcmVuY2Ugc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaWZmZXJlbmNlRnJvbVN0cmluZzogZnVuY3Rpb24gZGlmZmVyZW5jZUZyb21TdHJpbmcgKHMsIG90aGVyKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG90aGVyICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyAhPT0gJ3N0cmluZycpIHJldHVybiBzO1xuICAgICAgICAgICAgICAgIHZhciBzYXJyID0gcy5zcGxpdCgnJyksIG9hcnIgPSBvdGhlci5zcGxpdCgnJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGlmZmVyZW5jZUZyb21BcnJheShzYXJyLCBvYXJyKS5qb2luKCcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwbGFjZXMgdG9rZW5zIChzbmlwcGV0cyBvZiB0ZXh0IHdyYXBwZWQgaW4gYnJhY2tldHMpIHdpdGggdGhlaXIgdmFsdWVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgdG9rZW4gcmVwbGFjZWQgdmFsdWVzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXBsYWNlVG9rZW5zOiBmdW5jdGlvbiByZXBsYWNlVG9rZW5zIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZ2VuZXJpYy5yZXBsYWNlU3RyaW5nVG9rZW5zKHMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIG9ubHkgdGhlIGNoYXJhY3RlcnMgY29tbW9uIHRvIGJvdGggc3RyaW5nc1xuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG90aGVyIFRoZSBzdHJpbmcgdG8gY29tcHV0ZSB0aGUgaW50ZXJzZWN0aW9uIGFnYWluc3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBpbnRlcnNlY3Rpb24gYmV0d2VlbiB0aGUgdHdvIHN0cmluZ3MuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGludGVyc2VjdFN0cmluZzogZnVuY3Rpb24gaW50ZXJzZWN0U3RyaW5nIChzLCBvdGhlcikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvdGhlciAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHMgIT09ICdzdHJpbmcnKSByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB2YXIgc2FyciA9IHMuc3BsaXQoJycpLCBvYXJyID0gb3RoZXIuc3BsaXQoJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmludGVyc2VjdEFycmF5KHNhcnIsIG9hcnIpLmpvaW4oJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBlYXQgYSBzdHJpbmcgJ3RpbWVzJyB0aW1lcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lcyBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByZXBlYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0IChzLCB0aW1lcykge1xuICAgICAgICAgICAgICAgIHRpbWVzID0gcGFyc2VJbnQodGltZXMsIDEwKTtcbiAgICAgICAgICAgICAgICB0aW1lcyA9IGlzTmFOKHRpbWVzKSB8fCAhaXNGaW5pdGUodGltZXMpIHx8IHRpbWVzIDw9IDAgPyAxIDogdGltZXM7XG5cbiAgICAgICAgICAgICAgICB2YXIgb3MgPSBzO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCB0aW1lczsgaSsrKSBzICs9IG9zO1xuICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSaWdodCB0cmltcyBhIHN0cmluZy4gU2FtZSBhcyBTdHJpbmcudHJpbSwgYnV0IG9ubHkgZm9yIHRoZSBlbmQgb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3doYXQ9J1xcXFxzKyddIFdoYXQgdG8gdHJpbS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJpZ2h0IHRyaW1tZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJ0cmltOiBmdW5jdGlvbiBydHJpbSAocywgd2hhdCkge1xuICAgICAgICAgICAgICAgIHdoYXQgPSB0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgPyB3aGF0IDogJ1xcXFxzKyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZShuZXcgUmVnRXhwKHdoYXQgKyAnJCcpLCAnJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIExlZnQgdHJpbXMgYSBzdHJpbmcuIFNhbWUgYXMgU3RyaW5nLnRyaW0sIGJ1dCBvbmx5IGZvciB0aGUgYmVnaW5uaW5nIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFt3aGF0PSdcXFxccysnXSBXaGF0IHRvIHRyaW0uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBsZWZ0IHRyaW1tZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGx0cmltOiBmdW5jdGlvbiBsdHJpbSAocywgd2hhdCkge1xuICAgICAgICAgICAgICAgIHdoYXQgPSB0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgPyB3aGF0IDogJ1xcXFxzKyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZShuZXcgUmVnRXhwKCdeJyArIHdoYXQpLCAnJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVzY2FwZXMgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIEhUTUwgZXNjYXBlZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaHRtbEVuY29kZTogZnVuY3Rpb24gaHRtbEVuY29kZSAocykge1xuICAgICAgICAgICAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgICAgICAgICAgICAgICcmJyAgOiAnJmFtcDsnLFxuICAgICAgICAgICAgICAgICAgICAnPCcgIDogJyZsdDsnLFxuICAgICAgICAgICAgICAgICAgICAnPicgIDogJyZndDsnLFxuICAgICAgICAgICAgICAgICAgICAnXCInICA6ICcmcXVvdDsnLFxuICAgICAgICAgICAgICAgICAgICAnXFwnJyA6ICcmIzAzOTsnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bJjw+XCInXS9nLCBmdW5jdGlvbiAobSkgeyByZXR1cm4gbWFwW21dOyB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVW4tZXNjYXBlcyBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgSFRNTCBlc2NhcGVkIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBodG1sRGVjb2RlOiBmdW5jdGlvbiBodG1sRGVjb2RlIChzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgJyZhbXA7JyAgOiAnJicsXG4gICAgICAgICAgICAgICAgICAgICcmbHQ7JyAgIDogJzwnLFxuICAgICAgICAgICAgICAgICAgICAnJmd0OycgICA6ICc+JyxcbiAgICAgICAgICAgICAgICAgICAgJyZxdW90OycgOiAnXCInLFxuICAgICAgICAgICAgICAgICAgICAnJiMwMzk7JyA6ICdcXCcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oJmFtcDt8Jmx0O3wmZ3Q7fCZxdW90O3wmIzAzOTspL2csIGZ1bmN0aW9uIChtKSB7IHJldHVybiBtYXBbbV07IH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGFuICdldmFsJyBzYWZlIHN0cmluZywgYnkgYWRkaW5nIHNsYXNoZXMgdG8gXCIsICcsIFxcdCwgXFxuLCBcXGYsIFxcciwgYW5kIHRoZSBOVUxMIGJ5dGUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEEgc3RyaW5nIHdpdGggc2xhc2hlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZGRTbGFzaGVzOiBmdW5jdGlvbiBhZGRTbGFzaGVzIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvW1xcXFxcIidcXHRcXG5cXGZcXHJdL2csICdcXFxcJCYnKS5yZXBsYWNlKC9cXHUwMDAwL2csICdcXFxcMCcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBjYXBpdGFsaXplZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgdXBwZXIgY2FzZWQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdWNGaXJzdDogZnVuY3Rpb24gdWNGaXJzdCAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgbG93ZXJjYXNlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgbG93ZXIgY2FzZWQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbGNGaXJzdDogZnVuY3Rpb24gbGNGaXJzdCAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgcy5zbGljZSgxKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyBpbiBUaXRsZSBDYXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgdGl0bGUgY2FzZWQgc3RyaW5nLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gdGl0bGVDYXNlIChzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gocy5zcGxpdCgnICcpLCBmdW5jdGlvbiAodCkgeyBhcnIucHVzaChsaWJzLnN0cmluZy51Y0ZpcnN0KHQpKTsgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyci5qb2luKCcgJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNwbGljZXMgYSBzdHJpbmcsIG11Y2ggbGlrZSBhbiBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCBUaGUgaW5kZXggdG8gYmVnaW4gc3BsaWNpbmcgdGhlIHN0cmluZyBhdFxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50IFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0byBkZWxldGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhZGQgVGhlIHN0cmluZyB0byBhcHBlbmQgYXQgdGhlIHNwbGljZWQgc2VjdGlvblxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3BsaWNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKHMsIGluZGV4LCBjb3VudCwgYWRkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuc2xpY2UoMCwgaW5kZXgpICsgKGFkZCB8fCAnJykgKyBzLnNsaWNlKGluZGV4ICsgY291bnQpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm4gYSB0cnVuY2F0ZWQgc3RyaW5nIHdpdGggZWxsaXBzZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IGxlbmd0aCBUaGUgbGVuZ3RoIG9mIHRoZSBkZXNpcmVkIHN0cmluZy4gSWYgb21taXRlZCwgdGhlIHN0cmluZ3Mgb3JpZ2luYWwgbGVuZ3RoIHdpbGwgYmUgdXNlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW3BsYWNlPSdiYWNrJ10gUG9zc2libGUgdmFsdWVzIGFyZSAnZnJvbnQnIGFuZCAnYmFjaycuIFNwZWNpZnlpbmcgJ2Zyb250JyB3aWxsIHRydW5jYXRlIHRoZVxuICAgICAgICAgICAgICogc3RyaW5nIGFuZCBhZGQgZWxsaXBzZXMgdG8gdGhlIGZyb250LCAnYmFjaycgKG9yIGFueSBvdGhlciB2YWx1ZSkgd2lsbCBhZGQgdGhlIGVsbGlwc2VzIHRvIHRoZSBiYWNrLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZWxsaXBzZXM9Jy4uLiddIFRoZSBzdHJpbmcgdmFsdWUgb2YgdGhlIGVsbGlwc2VzLiBVc2UgdGhpcyB0byBhZGQgYW55dGhpbmcgb3RoZXIgdGhhbiAnLi4uJ1xuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gQSB0cnVuY2F0ZWQgc3RyaW5nIHdpdGggZWxsaXBzZXMgKGlmIGl0cyBsZW5ndGggaXMgZ3JlYXRlciB0aGFuICdsZW5ndGgnKVxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVsbGlwc2VzOiBmdW5jdGlvbiBlbGxpcHNlc18gKHMsIGxlbmd0aCwgcGxhY2UsIGVsbGlwc2VzKSB7XG4gICAgICAgICAgICAgICAgaWYoaXNOYU4ocGFyc2VJbnQobGVuZ3RoLCAxMCkpKSBsZW5ndGggPSBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZihsZW5ndGggPCAwIHx8ICFpc0Zpbml0ZShsZW5ndGgpKSBsZW5ndGggPSAwO1xuXG4gICAgICAgICAgICAgICAgZWxsaXBzZXMgPSB0eXBlb2YgZWxsaXBzZXMgPT09ICdzdHJpbmcnID8gZWxsaXBzZXMgOiAnLi4uJztcbiAgICAgICAgICAgICAgICBpZihzLmxlbmd0aCA8PSBsZW5ndGgpIHJldHVybiBzO1xuXG4gICAgICAgICAgICAgICAgaWYobGVuZ3RoIDw9IGVsbGlwc2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxsaXBzZXMuc3Vic3RyaW5nKDAsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYoIXBsYWNlIHx8IHBsYWNlICE9PSAnZnJvbnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnN1YnN0cigwLCBsZW5ndGggLSBlbGxpcHNlcy5sZW5ndGgpICsgZWxsaXBzZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxsaXBzZXMgKyBzLnN1YnN0cigwLCBsZW5ndGggLSBlbGxpcHNlcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2h1ZmZsZXMgYSBzdHJpbmdcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzcGxpdHRlciBBIHN0cmluZyB1c2VkIHRvIHNwbGl0IHRoZSBzdHJpbmcsIHRvIHRva2VuaXplIGl0IGJlZm9yZSBzaHVmZmxpbmcuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBtaXhlZCB1cCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKHMsIHNwbGl0dGVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBzLnNwbGl0KHR5cGVvZiBzcGxpdHRlciA9PT0gJ3N0cmluZycgPyBzcGxpdHRlciA6ICcnKSwgbiA9IGEubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJlcGxhY2VTcGxpdHMgPSBuIC0gMTtcblxuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IG4gLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSksXG4gICAgICAgICAgICAgICAgICAgICAgICB0bXAgPSBhW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICAgICAgICAgICAgICBhW2pdID0gdG1wO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IDA7IGsgPCByZXBsYWNlU3BsaXRzOyBrKyspIGEuc3BsaWNlKGxpYnMubnVtYmVyLnJhbmRvbUludEluUmFuZ2UoMCwgYS5sZW5ndGgpLCAwLCBzcGxpdHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuam9pbignJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldmVyc2VzIGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmV2ZXJzZWQgc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXZlcnNlOiBmdW5jdGlvbiByZXZlcnNlIChzKSB7XG4gICAgICAgICAgICAgICAgaWYocy5sZW5ndGggPCA2NCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IHMubGVuZ3RoOyBpID49IDA7IGktLSkgc3RyICs9IHMuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0cmlwcyB0aGUgdHJhaWxpbmcgc2xhc2hlcyBmcm9tIGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogSWYgdXNpbmcgTm9kZS5qcywgaXQgd2lsbCByZXBsYWNlIHRoZSB0cmFpbGluZyBzbGFzaCBiYXNlZCBvbiB0aGUgdmFsdWUgb2Ygb3MucGxhdGZvcm1cbiAgICAgICAgICAgICAqIChpLmUuIGlmIHdpbmRvd3MsICdcXFxcJyB3aWxsIGJlIHJlcGxhY2VkLCAnLycgb3RoZXJ3aXNlKS5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdpdGhvdXRUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRob3V0VHJhaWxpbmdTbGFzaCAocykge1xuICAgICAgICAgICAgICAgIGlmKCFJU19CUk9XU0VSICYmIEhBU19PUyAmJiByZXF1aXJlKCdvcycpLnBsYXRmb3JtID09PSAnd2luMzInKSByZXR1cm4gcy5yZXBsYWNlKC9cXFxcKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZCBhIHRyYWlsaW5nIHNsYXNoIHRvIGEgc3RyaW5nLCBpZiBpdCBkb2Vzbid0IGFscmVhZHkgaGF2ZSBvbmUuXG4gICAgICAgICAgICAgKiBJZiB1c2luZyBOb2RlLmpzLCBpdCB3aWxsIHJlcGxhY2UgdGhlIHRyYWlsaW5nIHNsYXNoIGJhc2VkIG9uIHRoZSB2YWx1ZSBvZiBvcy5wbGF0Zm9ybVxuICAgICAgICAgICAgICogKGkuZS4gaWYgd2luZG93cywgJ1xcXFwnIHdpbGwgYmUgcmVwbGFjZWQsICcvJyBvdGhlcndpc2UpLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHN0cmluZyB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgd2l0aFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhUcmFpbGluZ1NsYXNoIChzKSB7XG4gICAgICAgICAgICAgICAgaWYoIUlTX0JST1dTRVIgJiYgSEFTX09TICYmIHJlcXVpcmUoJ29zJykucGxhdGZvcm0gPT09ICd3aW4zMicpIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKSArICdcXFxcJztcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud2l0aG91dFRyYWlsaW5nU2xhc2gocykgKyAnLyc7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEVzY2FwZXMgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVycy4gVGhpcyBpcyB1c2VmdWwgaXMgeW91IHdpc2ggdG8gY3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgICAgICAgICAgICogZnJvbSBhIHN0b3JlZCBzdHJpbmcgdmFsdWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVndWxhciBleHByZXNzaW9uIHNhZmUgc3RyaW5nXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVnZXhwU2FmZTogZnVuY3Rpb24gcmVnZXhwU2FmZSAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQYWRzIGEgc3RyaW5nIHdpdGggJ2RlbGltJyBjaGFyYWN0ZXJzIHRvIHRoZSBzcGVjaWZpZWQgbGVuZ3RoLiBJZiB0aGUgbGVuZ3RoIGlzIGxlc3MgdGhhbiB0aGUgc3RyaW5nIGxlbmd0aCxcbiAgICAgICAgICAgICAqIHRoZSBzdHJpbmcgd2lsbCBiZSB0cnVuY2F0ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIFRoZSBsZW5ndGggdG8gcGFkIHRoZSBzdHJpbmcgdG8uIElmIGxlc3MgdGhhdCB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHRoZSBzdHJpbmcgd2lsbFxuICAgICAgICAgICAgICogYmUgcmV0dXJuZWQuIElmIGxlc3MgdGhhbiB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHRoZSBzdHJpbmcgd2lsbCBiZSBzbGljZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkZWxpbT0nICddIFRoZSBjaGFyYWN0ZXIgdG8gcGFkIHRoZSBzdHJpbmcgd2l0aC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtwcmU9ZmFsc2VdIElmIHRydWUsIHRoZSBwYWRkaW5nIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nLCBvdGhlcndpc2UgdGhlIHBhZGRpbmdcbiAgICAgICAgICAgICAqIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGVuZC5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwYWRkZWQgc3RyaW5nXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKHMsIGxlbmd0aCwgZGVsaW0sIHByZSkge1xuICAgICAgICAgICAgICAgIHZhciBpLCB0aGlzTGVuZ3RoID0gcy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBpZighZGVsaW0pIGRlbGltID0gJyAnO1xuICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnOyBlbHNlIGlmKGlzTmFOKHBhcnNlSW50KGxlbmd0aCwgMTApKSkgcmV0dXJuIHM7XG5cbiAgICAgICAgICAgICAgICBsZW5ndGggPSBwYXJzZUludChsZW5ndGgsIDEwKTtcbiAgICAgICAgICAgICAgICBpZihsZW5ndGggPCB0aGlzTGVuZ3RoKSByZXR1cm4gIXByZSA/IHMuc2xpY2UoMCwgbGVuZ3RoKSA6IHMuc2xpY2UoLWxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZihwcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgbGVuZ3RoIC0gdGhpc0xlbmd0aDsgaSsrKSBzID0gZGVsaW0gKyBzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgbGVuZ3RoIC0gdGhpc0xlbmd0aDsgaSsrKSBzICs9IGRlbGltO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwbGFjZXMgbmV3bGluZXMgd2l0aCBiciB0YWdzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggbmV3bGluZXMgY29udmVydGVkIHRvIGJyIHRhZ3MuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5ld2xpbmVUb0JyZWFrOiBmdW5jdGlvbiBuZXdsaW5lVG9CcmVhayAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoLyhcXHJcXG58XFxuKS9nLCAnPGJyPicpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyB0YWJzIHdpdGggYSBzcGFuIGVsZW1lbnQgd2l0aCB0aGUgY2xhc3MgJ3RhYidcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRhYnMgY29udmVydGVkIHRvIHNwYW5zIHdpdGggdGhlIGNsYXNzICd0YWInXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRhYnNUb1NwYW46IGZ1bmN0aW9uIHRhYnNUb1NwYW4gKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXHQvZywgJzxzcGFuIGNsYXNzPVwidGFiXCI+PC9zcGFuPicpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGp1c3RzIGEgc3RyaW5nIHRvIGZpdCB3aXRoaW4gdGhlIGNvbmZpbmVzIG9mICd3aWR0aCcsIHdpdGhvdXQgYnJlYWtpbmcgd29yZHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtsZW5ndGg9MTIwXSBUaGUgbGVuZ3RoIHRvIHdvcmQgd3JhcCB0aGUgc3RyaW5nIHRvLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcGFkbGVmdD0wXSBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgdG8gcGFkIHRoZSBzdHJpbmcgb24gdGhlIGxlZnRcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3BhZHJpZ2h0PTBdIFRoZSBudW1iZXIgb2YgY29sdW1ucyB0byBwYWQgdGhlIHN0cmluZyBvbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IG9taXRGaXJzdCBJZiB0cnVlLCB0aGUgZmlyc3QgbGluZSB3aWxsIG5vdCBiZSBwYWRkZWQgbGVmdFxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIGFkanVzdGVkIGFuZCBwYWRkZWQgZm9yIHRoZSBzdGRvdXQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgd29yZFdyYXBUb0xlbmd0aDogZnVuY3Rpb24gd29yZFdyYXBUb0xlbmd0aCAocywgd2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpIHtcbiAgICAgICAgICAgICAgICBpZihwYWRyaWdodCA9PT0gdW5kZWZpbmVkICYmIHBhZGxlZnQpIHBhZHJpZ2h0ID0gcGFkbGVmdDtcblxuICAgICAgICAgICAgICAgIHBhZGxlZnQgID0gIWlzTmFOKHBhcnNlSW50KHBhZGxlZnQsICAxMCkpID8gcGFyc2VJbnQocGFkbGVmdCwgMTApICA6IDA7XG4gICAgICAgICAgICAgICAgcGFkcmlnaHQgPSAhaXNOYU4ocGFyc2VJbnQocGFkcmlnaHQsIDEwKSkgPyBwYXJzZUludChwYWRyaWdodCwgMTApIDogMDtcblxuICAgICAgICAgICAgICAgIHZhciBwYWRkaW5nTGVmdCA9ICcnO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBwYWRsZWZ0OyAgbisrKSBwYWRkaW5nTGVmdCAgKz0gJyAnO1xuXG4gICAgICAgICAgICAgICAgdmFyIGNvbHMgICA9ICFpc05hTihwYXJzZUludCh3aWR0aCwgMTApKSA/IGxlbmd0aCA6IDEyMCxcbiAgICAgICAgICAgICAgICAgICAgYXJyICAgID0gcy5zcGxpdCgnICcpLFxuICAgICAgICAgICAgICAgICAgICBpdGVtICAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICBsZW4gICAgPSAhb21pdEZpcnN0ID8gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdCA6IGNvbHMgLSBwYWRyaWdodCxcbiAgICAgICAgICAgICAgICAgICAgc3RyICAgID0gIW9taXRGaXJzdCA/IHBhZGRpbmdMZWZ0IDogJycsXG4gICAgICAgICAgICAgICAgICAgIG9sZW4gICA9IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQ7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSgoaXRlbSA9IGFyci5zaGlmdCgpKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0ubGVuZ3RoIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gaXRlbSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbiAtPSBpdGVtLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihpdGVtLmxlbmd0aCA+IG9sZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBpdGVtLnN1YnN0cmluZygwLCBsZW4gLSAxKSArICctXFxuJyArIHBhZGRpbmdMZWZ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLnVuc2hpZnQoaXRlbS5zdWJzdHJpbmcobGVuLCBpdGVtLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbiA9IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbicgKyBwYWRkaW5nTGVmdCArIGl0ZW0gKyAnICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBjb2xzIC0gcGFkcmlnaHQgLSAxIC0gcGFkbGVmdCAtIGl0ZW0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERhdGUgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGRhdGU6IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ2RheXNJblRoZUZ1dHVyZScgZGF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gZGF5c0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgZGF5cyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIGRheXMuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWR2YW5jZURheXM6IGZ1bmN0aW9uIGFkdmFuY2VEYXlzIChkLCBkYXlzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICBkYXlzSW5UaGVGdXR1cmUgPSBkYXlzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyhkYXlzSW5UaGVGdXR1cmUpID8gZGF5c0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAoZGF5c0luVGhlRnV0dXJlICogODY0MDAwMDApKTtcblxuICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAnbW9udGhzSW5UaGVGdXR1cmUnIG1vbnRocy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbW9udGhzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiBtb250aHMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCBtb250aHMuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWR2YW5jZU1vbnRoczogZnVuY3Rpb24gYWR2YW5jZU1vbnRocyAoZCwgbW9udGhzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICBtb250aHNJblRoZUZ1dHVyZSA9IG1vbnRoc0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMobW9udGhzSW5UaGVGdXR1cmUpID8gbW9udGhzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArIChtb250aHNJblRoZUZ1dHVyZSAqIDI2Mjk3NDYwMDApKTtcblxuICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAneWVhcnNJblRoZUZ1dHVyZScgeWVhcnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHllYXJzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiB5ZWFycyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIHllYXJzLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFkdmFuY2VZZWFyczogZnVuY3Rpb24gYWR2YW5jZVllYXJzIChkLCB5ZWFyc0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgeWVhcnNJblRoZUZ1dHVyZSA9IHllYXJzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyh5ZWFyc0luVGhlRnV0dXJlKSA/IHllYXJzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArICh5ZWFyc0luVGhlRnV0dXJlICogMzE1MzYwMDAwMDApKTtcblxuICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUoZC5nZXREYXkoKSA9PT0gMCB8fCBkLmdldERheSgpID09PSA2KSBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyA4NjQwMDAwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBkYXRlIGluIHRoZSB5eXl5LW1tLWRkIGZvcm1hdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2RlbGltPSctJ10gVGhlIGRlbGltaXRlciB0byB1c2VkIHRoZSBzZXBhcmF0ZSB0aGUgZGF0ZSBjb21wb25lbnRzIChlLmcuICctJyBvciAnLicpXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgZGF0ZSBpbiB0aGUgeXl5eS1tbS1kZCBmb3JtYXQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgeXl5eW1tZGQ6IGZ1bmN0aW9uIHl5eXltbWRkIChkLCBkZWxpbSkge1xuICAgICAgICAgICAgICAgIGRlbGltID0gdHlwZW9mIGRlbGltICE9PSAnc3RyaW5nJyA/ICctJyA6IGRlbGltIDtcblxuICAgICAgICAgICAgICAgIHZhciBkZCAgID0gZC5nZXREYXRlKCksXG4gICAgICAgICAgICAgICAgICAgIG1tICAgPSBkLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgICAgICAgICB5eXl5ID0gZC5nZXRGdWxsWWVhcigpO1xuXG4gICAgICAgICAgICAgICAgaWYoZGQgPCAxMCkgZGQgPSAnMCcgKyBkZDtcbiAgICAgICAgICAgICAgICBpZihtbSA8IDEwKSBtbSA9ICcwJyArIG1tO1xuICAgICAgICAgICAgICAgIHJldHVybiB5eXl5ICsgZGVsaW0gKyBtbSArIGRlbGltICsgZGQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIGEgZGF0ZSB0byB0aGUgSEg6TU06U1MuTVNFQyB0aW1lIGZvcm1hdFxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtvbWl0TVM9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgdGhlIE1TIHBvcnRpb24gb2YgdGhlIHJldHVybmVkIHN0cmluZ1xuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGZvcm1hdHRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAoZCwgb21pdE1TKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmNsb2NrVGltZShkLmdldFRpbWUoKSwgISFvbWl0TVMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBOdW1iZXIgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIG51bWJlcjoge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBpbiByYW5nZSBbbWluLCBtYXhdIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWluIFRoZSBtaW5pbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IEEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJhbmRvbUludEluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgIG1pbiA9IHBhcnNlSW50KG1pbiwgMTApO1xuICAgICAgICAgICAgICAgIG1heCA9IHBhcnNlSW50KG1heCwgMTApO1xuXG4gICAgICAgICAgICAgICAgaWYoaXNOYU4obWluKSAmJiAhaXNGaW5pdGUobWluKSkgbWluID0gMDtcbiAgICAgICAgICAgICAgICBpZihpc05hTihtYXgpICYmICFpc0Zpbml0ZShtYXgpKSBtYXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIGZsb2F0IGluIHJhbmdlIFttaW4sIG1heF0gKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXggVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAqIEByZXR1cm4ge051bWJlcn0gQSByYW5kb20gbnVtYmVyIGJldHdlZW4gbWluIGFuZCBtYXhcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmFuZG9tTnVtYmVySW5SYW5nZTogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgICAgICAgICAgICAgbWluID0gcGFyc2VJbnQobWluLCAxMCk7XG4gICAgICAgICAgICAgICAgbWF4ID0gcGFyc2VJbnQobWF4LCAxMCk7XG5cbiAgICAgICAgICAgICAgICBpZihpc05hTihtaW4pICYmICFpc0Zpbml0ZShtaW4pKSBtaW4gPSAwO1xuICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1heCkgJiYgIWlzRmluaXRlKG1heCkpIG1heCA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkgKyBtaW47XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlY3Vyc2l2ZWx5IGNvbXB1dGVzIHRoZSBmYWN0b3JpYWwgb2YgdGhlIG51bWJlciBuLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gQSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8SW5maW5pdHl9IG4hXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZhY3RvcmlhbDogZnVuY3Rpb24gZmFjdG9yaWFsIChuKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPCAwKSByZXR1cm4gTmFOO1xuICAgICAgICAgICAgICAgIGlmKG4gPiAxNzApIHJldHVybiBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICBpZihuID09PSAwIHx8IG4gPT09IDEpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIHJldHVybiBuICogZmFjdG9yaWFsKG4gLSAxKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpcyB0aGUgZ2l2ZW4gbnVtYmVycyBhcmUgaW50ZWdlcnNcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uTnVtYmVyfSBuIE51bWJlcnMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIGFsbCBhcmd1bWVudHMgYXJlIGludGVnZXJzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzSW50OiBmdW5jdGlvbiBpc0ludCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiBuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVjdXJzaXZlbHkgY29tcHV0ZXMgbiBjaG9vc2Ugay5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIEEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGsgQSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8SW5maW5pdHl9IG4gY2hvb3NlIGsuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNob29zZTogZnVuY3Rpb24gY2hvb3NlIChuLCBrKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IHR5cGVvZiBrICE9PSAnbnVtYmVyJykgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgICAgICBpZihrID09PSAwKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKG4gKiBjaG9vc2UobiAtIDEsIGsgLSAxKSkgLyBrO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQYWRzIGEgbnVtYmVyIHdpdGggcHJlY2VlZGluZyB6ZXJvcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIFRoZSBmaW5hbCBsZW5ndGggb2YgdGhlIHN0cmluZ1xuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHBhZGRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAobiwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnBhZChuLnRvU3RyaW5nKCksIGxlbmd0aCwgJzAnLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF5c0Zyb206IGZ1bmN0aW9uIGRheXNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRheXNGcm9tTm93OiBmdW5jdGlvbiBkYXlzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2Vjb25kc0Zyb206IGZ1bmN0aW9uIHNlY29uZHNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0U2Vjb25kcyhkYXRlLmdldFNlY29uZHMoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlY29uZHNGcm9tTm93OiBmdW5jdGlvbiBzZWNvbmRzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB5ZWFycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHllYXJzRnJvbTogZnVuY3Rpb24geWVhcnNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB5ZWFycy5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgeWVhcnNGcm9tTm93OiBmdW5jdGlvbiB5ZWFyc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vbnRoc0Zyb206IGZ1bmN0aW9uIG1vbnRoc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRNb250aChkYXRlLmdldE1vbnRoKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vbnRoc0Zyb21Ob3c6IGZ1bmN0aW9uIG1vbnRoc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBob3Vycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhvdXJzRnJvbTogZnVuY3Rpb24gaG91cnNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0SG91cnMoZGF0ZS5nZXRIb3VycygpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBob3Vycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtaW51dGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldE1pbnV0ZXMoZGF0ZS5nZXRNaW51dGVzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1pbnV0ZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbnV0ZXNGcm9tTm93OiBmdW5jdGlvbiBtaW51dGVzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRpbWUsIG1vbnRocyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtb250aHNBZ286IGZ1bmN0aW9uIG1vbnRoc0FnbyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0aW1lLCBkYXlzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRheXNBZ286IGZ1bmN0aW9uIGRheXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGltZSwgc2Vjb25kcyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWNvbmRzQWdvOiBmdW5jdGlvbiBzZWNvbmRzQWdvIChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRpbWUsIG1pbnV0ZXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWludXRlc0FnbzogZnVuY3Rpb24gbWludXRlc0FnbyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0aW1lLCB5ZWFycyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgYSBudW1iZXIgdG8gdGhlIEhIOk1NOlNTLk1TRUMgdGltZSBmb3JtYXRcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0IFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAbWVtYmVyb2YgTnVtYmVyLnByb3RvdHlwZVxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW29taXRNUz1mYWxzZV0gV2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgTVMgcG9ydGlvbiBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgZm9ybWF0dGVkIG51bWJlciwgbm93IGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lICh0LCBvbWl0TVMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXMsIHNlY3MsIG1pbnMsIGhycztcblxuICAgICAgICAgICAgICAgIG1zID0gdCAlIDEwMDA7XG4gICAgICAgICAgICAgICAgdCA9ICh0IC0gbXMpIC8gMTAwMDtcblxuICAgICAgICAgICAgICAgIHNlY3MgPSB0ICUgNjA7XG4gICAgICAgICAgICAgICAgdCA9ICh0IC0gc2VjcykgLyA2MDtcblxuICAgICAgICAgICAgICAgIG1pbnMgPSB0ICUgNjA7XG4gICAgICAgICAgICAgICAgaHJzID0gKHQgLSBtaW5zKSAvIDYwO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnBhZChocnMudG9TdHJpbmcoKSwgMikgICsgJzonICsgbGlicy5udW1iZXIucGFkKG1pbnMudG9TdHJpbmcoKSwgMikgKyAnOicgK1xuICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm51bWJlci5wYWQoc2Vjcy50b1N0cmluZygpLCAyKSArICgob21pdE1TID09PSB0cnVlKSA/ICcnIDogJy4nICsgbGlicy5udW1iZXIucGFkKG1zLnRvU3RyaW5nKCksIDMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRnVuY3Rpb24gbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uOiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RydWN0b3IgVGhlIGluaGVyaXRpbmcgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHN1cGVyQ29uc3RydWN0b3IgVGhlIHBhcmVudCBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluaGVyaXRzOiBmdW5jdGlvbiBpbmhlcml0cyAoY29uc3RydWN0b3IsIHN1cGVyQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCB8fCBjb25zdHJ1Y3RvciA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0IG5vdCBiZSAnICsgJ251bGwgb3IgdW5kZWZpbmVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc3VwZXJDb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkIHx8IHN1cGVyQ29uc3RydWN0b3IgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBzdXBlciBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgJyArICdiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBzdXBlciBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCAnICsgJ2hhdmUgYSBwcm90b3R5cGUnKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yLnN1cGVyXyA9IHN1cGVyQ29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKGNvbnN0cnVjdG9yLnByb3RvdHlwZSwgc3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFycmF5IGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBhcnJheToge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNodWZmbGVzIGFuIGFycmF5XG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbWl4ZWQgdXAgYXJyYXlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAoYSkge1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IGEubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpLCB0bXAgPSBhW2ldO1xuICAgICAgICAgICAgICAgICAgICBhW2ldID0gYVtqXTtcbiAgICAgICAgICAgICAgICAgICAgYVtqXSA9IHRtcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbXB1dGVzIHRoZSB1bmlvbiBiZXR3ZWVuIHRoZSBjdXJyZW50IGFycmF5LCBhbmQgYWxsIHRoZSBhcnJheSBvYmplY3RzIHBhc3NlZCBpbi4gVGhhdCBpcyxcbiAgICAgICAgICAgICAqIHRoZSBzZXQgb2YgdW5pcXVlIG9iamVjdHMgcHJlc2VudCBpbiBhbGwgb2YgdGhlIGFycmF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5BcnJheX0gYXJyIEEgbGlzdCBvZiBhcnJheSBvYmplY3RzXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIHVuaW9uIHNldCBvZiB0aGUgcHJvdmlkZWQgYXJyYXlzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1bmlvbjogZnVuY3Rpb24gdW5pb24gKGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgIHZhciB1bmlvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGFycmF5LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodW5pb24uaW5kZXhPZihpdGVtKSA9PT0gLTEpIHVuaW9uLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhbGwgdGhlIGl0ZW1zIHVuaXF1ZSB0byBhbGwgYXJyYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5BcnJheX0gYXJyYXlzIFRoZSBBcnJheSBvYmplY3RzIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBvdGhlciBUaGUgYXJyYXkgdG8gY29tcHV0ZSB0aGUgZGlmZmVyZW5jZSBmcm9tLlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgdW5pcXVlIHRvIGVhY2ggYXJyYXkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpZmZlcmVuY2U6IGZ1bmN0aW9uIGRpZmZlcmVuY2UgKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcnJheXMgPSBsaWJzLm9iamVjdC5vbmx5KGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSwgJ2FycmF5Jyk7XG5cbiAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkoYXJyYXlzWzBdKTtcbiAgICAgICAgICAgICAgICB2YXIgaSwgc2ltcGxlRGlmZiA9IFtdO1xuXG4gICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXNbMF0ubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcnJheXNbMV0uaW5kZXhPZihhcnJheXNbMF1baV0pID09PSAtMSkgc2ltcGxlRGlmZi5wdXNoKGFycmF5c1swXVtpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgYXJyYXlzWzFdLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzWzBdLmluZGV4T2YoYXJyYXlzWzFdW2ldKSA9PT0gLTEpIHNpbXBsZURpZmYucHVzaChhcnJheXNbMV1baV0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaW1wbGVEaWZmO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gYXJyYXlzWzBdLCBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IoaSA9IDE7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGRpZmZlcmVuY2UubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFycmF5c1tpXS5pbmRleE9mKGRpZmZlcmVuY2Vbbl0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZS5wdXNoKGRpZmZlcmVuY2Vbbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IDA7IGsgPCBhcnJheXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaWYoYXJyYXlzW2ldICE9PSBhcnJheXMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGlmZmVyZW5jZSA9IGludGVybWVkaWF0ZTtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRpZmZlcmVuY2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGl0ZW1zIGNvbW1vbiB0byBhbGwgYXJyYXlzLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5BcnJheX0gaXRlbXMgVGhlIGFycmF5cyBmcm9tIHdoaWNoIHRvIGNvbXB1dGUgdGhlIGludGVyc2VjdGlvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIGl0ZW1zIGNvbW1vbiB0byBib3RoIGFycmF5cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW50ZXJzZWN0OiBmdW5jdGlvbiBpbnRlcnNlY3QgKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcnJheXMgPSBsaWJzLm9iamVjdC5vbmx5KGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSwgJ2FycmF5Jyk7XG5cbiAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkoYXJyYXlzWzBdKTtcblxuICAgICAgICAgICAgICAgIHZhciBpbnRlcnNlY3Rpb24gPSBhcnJheXNbMF0sIGludGVybWVkaWF0ZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGludGVyc2VjdGlvbi5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzW2ldLmluZGV4T2YoaW50ZXJzZWN0aW9uW25dKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlLnB1c2goaW50ZXJzZWN0aW9uW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gYXJyYXlzW2ldLmluZGV4T2YoaW50ZXJzZWN0aW9uW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJheXNbaV0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gaW50ZXJtZWRpYXRlO1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IGFycmF5IGZyb20gdGhlIGN1cnJlbnQgb25lLCB3aXRoIGFsbCBvY2N1cmVuY2VzIG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMgb21taXRlZC48YnI+XG4gICAgICAgICAgICAgKiBGb3IgZXhhbXBsZTogPGVtPlsxLDIsMyw0LDVdLndpdGhvdXQoMSk8L2VtPiB3aWxsIHJldHVybiA8ZW0+WzIsMyw0LDVdPC9lbT5cbiAgICAgICAgICAgICAqIGFuZCA8ZW0+WzEsIG51bGwsIDIsIG51bGwsIHVuZGVmaW5lZF0ud2l0aG91dChudWxsLCB1bmRlZmluZWQpPC9lbT4gd2lsbCByZXR1cm4gPGVtPlsxLCAyXTwvZW0+XG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheTwqPn0gQSBzaGFsbG93IGNvcHkgb2YgdGhlIGFycmF5IHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdpdGhvdXQ6IGZ1bmN0aW9uIHdpdGhvdXQgKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpLFxuICAgICAgICAgICAgICAgICAgICByZXMgID0gW107XG5cbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGEsIGZ1bmN0aW9uICh2KSB7IGlmKGFyZ3MuaW5kZXhPZih2KSA9PT0gLTEpIHJlcy5wdXNoKHYpOyB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSb3RhdGVzIHRoZSBhcnJheSBsZWZ0IG9yIHJpZ2h0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLiBJZiB0aGUgZGlyZWN0aW9uIGlzIGxlZnQsIGl0IHdpbGwgc2hpZnQgb2ZmIHRoZVxuICAgICAgICAgICAgICogZmlyc3QgPGVtPm48L2VtPiBlbGVtZW50cyBhbmQgcHVzaCB0aGVtIHRvIHRoZSBlbmQgb2YgdGhlIGFycmF5LiBJZiByaWdodCwgaXQgd2lsbCBwb3Agb2ZmIHRoZSBsYXN0IDxlbT5uPC9lbT5cbiAgICAgICAgICAgICAqIGl0ZW1zIGFuZCB1bnNoaWZ0IHRoZW0gb250byB0aGUgZnJvbnQgb2YgdGhlIGFycmF5LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkaXJlY3Rpb249J2xlZnQnXSBUaGUgZGlyZWN0aW9uIHRvIHJvdGF0ZSBhcnJheSBtZW1iZXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbYW1vdW50PTFdIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gc2hpZnRcbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgc2hpZnRlZC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByb3RhdGU6IGZ1bmN0aW9uIHJvdGF0ZSAoYSwgZGlyZWN0aW9uLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICBpZihkaXJlY3Rpb24gJiYgbGlicy5vYmplY3QuaXNOdW1lcmljKGRpcmVjdGlvbikgJiYgIWFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBhbW91bnQgICAgPSBkaXJlY3Rpb247XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZighYW1vdW50IHx8IChhbW91bnQgJiYgIWxpYnMub2JqZWN0LmlzTnVtZXJpYyhhbW91bnQpKSkgYW1vdW50ID0gMTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYW1vdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICE9PSAncmlnaHQnKSBhLnB1c2goYS5zaGlmdCgpKTsgZWxzZSBhLnVuc2hpZnQoYS5wb3AoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSb3RhdGVzIHRoZSBhcnJheSBsZWZ0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLlxuICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiB0aW1lcyB0byByb3RhdGUgdGhlIGFycmF5IGxlZnQuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgbGVmdC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgJ2xlZnQnLCBhbW91bnQpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSb3RhdGVzIHRoZSBhcnJheSByaWdodCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB0aW1lcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgdXNlZnVsIGlmIHRyeWluZyB0byBjcmVhdGUgYSBjaXJjdWxhciBxdWV1ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbYW1vdW50PTFdIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcm90YXRlIHRoZSBhcnJheSBsZWZ0LlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCByb3RhdGVkIHJpZ2h0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJvdGF0ZVJpZ2h0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgJ3JpZ2h0JywgYW1vdW50KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVtb3ZlcyBkdXBsaWNhdGVzIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgZGVzdHJ1Y3RpdmUgYWN0aW9uLCBhbmQgd2lsbCBtb2RpZnkgdGhlIGFycmF5IGluIHBsYWNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCB3aXRoIGR1cGxpY2F0ZXMgcmVtb3ZlZC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYWtlVW5pcXVlOiBmdW5jdGlvbiBtYWtlVW5pcXVlIChhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpc2l0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZih2aXNpdGVkLmluZGV4T2YoYVtpXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goYVtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGktLTsgLy8gU3BsaWNlIHdpbGwgYWZmZWN0IHRoZSBpbnRlcm5hbCBhcnJheSBwb2ludGVyLCBzbyBmaXggaXQuLi5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogR2V0cyBhbiBhcnJheSBvZiB1bmlxdWUgaXRlbXMgZnJvbSB0aGUgY3VycmVudCBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIG5vIGR1cGxpY2F0ZSB2YWx1ZXMuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmlzaXRlZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICB1bmlxdWUgID0gW107XG5cbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZS5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuaXF1ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU29ydHMgdGhlIGFycmF5IGluIGFzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGFycmF5IHNvcnRlZCBpbiBhc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYXNjZW5kaW5nOiBmdW5jdGlvbiBhc2NlbmRpbmcgKGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGEgIT09IHVuZGVmaW5lZCAmJiBhICE9PSBudWxsKSBhID0gYS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZihiICE9PSB1bmRlZmluZWQgJiYgYiAhPT0gbnVsbCkgYiA9IGIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgYXJyYXkgaW4gZGVzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGFycmF5IHNvcnRlZCBpbiBkZXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRlc2NlbmRpbmc6IGZ1bmN0aW9uIGRlc2NlbmRpbmcgKGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGEgIT09IHVuZGVmaW5lZCAmJiBhICE9PSBudWxsKSBhID0gYS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBpZihiICE9PSB1bmRlZmluZWQgJiYgYiAhPT0gbnVsbCkgYiA9IGIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPiBiID8gLTEgOiBhIDwgYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcnJheSBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgb2JqZWN0OiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIGZyZXF1ZW5jaWVzIGZvciBlYWNoIGl0ZW0gaW4gYWxsIG9mIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uKn0gb2JqcyBUaGUgb2JqZWN0cyB0byBjb21wdXRlIHRoZSBoaXN0b2dyYW0gZnJvbS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdDxOdW1iZXI+fSBBbiBvYmplY3QgdGhhdCBoYXMgdGhlIGl0ZW1zIGZyb20gYWxsIG9mIHRoZSBhcmd1bWVudHMgYXMgaXRzIGtleXMgYW5kIHRoZWlyIGZyZXF1ZW5jaWVzIGFzIGl0J3MgdmFsdWVzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoaXN0b2dyYW06IGZ1bmN0aW9uIGhpc3RvZ3JhbSAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhpc3RvZ3JhbSA9IHt9O1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWhpc3RvZ3JhbVtvXSkgaGlzdG9ncmFtW29dID0gMTsgZWxzZSBoaXN0b2dyYW1bb10rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZighaGlzdG9ncmFtWydmdW5jdGlvbiddKSBoaXN0b2dyYW1bJ2Z1bmN0aW9uJ10gPSAxOyBlbHNlIGhpc3RvZ3JhbVtvXSsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkobywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHR5cGVvZiB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgPT09IG51bGw6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnbnVsbCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgaW5zdGFuY2VvZiBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdhcnJheSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgaGlzdG9ncmFtW3ZhbF0gIT09ICdudW1iZXInKSBoaXN0b2dyYW1bdmFsXSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlzdG9ncmFtW3ZhbF0rKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhpc3RvZ3JhbTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIHNoYWxsb3cgY29weSBvZiAnaXRlbScuXG4gICAgICAgICAgICAgKiBAcGFyYW0geyp9IGl0ZW0gVGhlIGl0ZW0gdG8gc2hhbGxvdyBcImNvcHlcIi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IEEgc2hhbGxvdyBjb3B5IG9mIHRoZSBpdGVtLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjb3B5OiBmdW5jdGlvbiBjb3B5IChpdGVtKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvcHk7XG4gICAgICAgICAgICAgICAgaWYoIWl0ZW0pIHJldHVybiBpdGVtO1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlb2YgaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHkgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShpdGVtLCBmdW5jdGlvbiAobywgaykgeyBjb3B5W2tdID0gbzsgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG51bWJlciBvZiBvY2N1cmVuY2VzIG9mIFwid2hhdFwiXG4gICAgICAgICAgICAgKiBAcGFyYW0geyp9IG9iaiBUaGUgaXRlbSB0byBjb3VudCB0aGUgb2NjdXJlbmNlcyBvZiBcIndoYXRcIiBpbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gd2hhdCBUaGUgaXRlbSB0byBjb3VudCB0aGUgb2NjdXJlbmNlcyBvZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgb2NjdXJyZW5jZXNPZjogZnVuY3Rpb24gb2NjdXJyZW5jZXNPZiAob2JqLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHJldHVybiAwO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihvYmoudG9TdHJpbmcoKSwgd2hhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcob2JqLnRvU3RyaW5nKCkpLCB3aGF0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygd2hhdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKHdoYXQudG9TdHJpbmcoKSwgJ2cnKSwgbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKG0gPSByZWdleHAuZXhlYyhvYmopKSBjb3VudCsrOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KG9iaiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPT09IHdoYXQpIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG9iamVjdCdzIGtleXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nfE51bWJlcj59IFRoZSBvYmplY3QncyBrZXkgc2V0XG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAga2V5cyA6IGZ1bmN0aW9uIGtleXMgKG8pIHtcbiAgICAgICAgICAgICAgICBpZihvID09PSB1bmRlZmluZWQgfHwgbyA9PT0gbnVsbCkgcmV0dXJuIFtdO1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBnZXRLZXlzKG8pLCBpZHg7XG4gICAgICAgICAgICAgICAgaWYobGlicy5vYmplY3QuaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWR4ID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSAnc2l6ZScgb3IgJ2xlbmd0aCcgb2YgYW4gb2JqZWN0LlxuICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICogICAgICA8bGk+IFN0cmluZyAgIC0+IFRoZSBzdHJpbmcncyBsZW5ndGggIDwvbGk+XG4gICAgICAgICAgICAgKiAgICAgIDxsaT4gTnVtYmVyICAgLT4gVGhlIG51bWJlciBvZiBkaWdpdHMgPC9saT5cbiAgICAgICAgICAgICAqICAgICAgPGxpPiBPYmplY3QgICAtPiBUaGUgbnVtYmVyIG9mIGtleXMgICA8L2xpPlxuICAgICAgICAgICAgICogICAgICA8bGk+IEFycmF5ICAgIC0+IFRoZSBudW1iZXIgb2YgaXRlbXMgIDwvbGk+XG4gICAgICAgICAgICAgKiAgICAgIDxsaT4gRnVuY3Rpb24gLT4gMSAgICAgICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtYmVyIG9mIGl0ZW1zIHdpdGhpbiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNpemU6IGZ1bmN0aW9uIHNpemUgKG8pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby50b1N0cmluZygpLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIG8gaW5zdGFuY2VvZiBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBsaWJzLm9iamVjdC5pc0FyZ3VtZW50cyhvKSAmJiB0eXBlb2Ygby5sZW5ndGggIT09ICd1bmRlZmluZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG8pLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIGFuIG9iamVjdCBjYW4gYmUgY29udmVydGVkIHRvIGEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBudW1lcmljLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNOdW1lcmljOiBmdW5jdGlvbiBpc051bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhaXNOYU4ocGFyc2VGbG9hdChpdGVtKSkgJiYgaXNGaW5pdGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhIG51bWJlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0TnVtZXJpYzogZnVuY3Rpb24gZ2V0TnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IFtdLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goIWlzTmFOKHBhcnNlRmxvYXQoaXRlbSkpICYmIGlzRmluaXRlKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVuID09PSAxID8gcmVzWzBdIDogcmVzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIGFuIG9iamVjdCBoYXMgbm8ga2V5cywgaWYgYW4gYXJyYXkgaGFzIG5vIGl0ZW1zLCBvciBpZiBhIHN0cmluZyA9PT0gJycuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzICdlbXB0eScsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Quc2l6ZShpdGVtKSA9PT0gMCAmJiBpdGVtICE9PSBmYWxzZSAmJiBpdGVtICE9PSAnJyAmJiBpdGVtICE9PSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGFycmF5cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uIGlzQXJyYXkgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgQXJyYXk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgb2JqZWN0cyBhbmQgbm90IGFycmF5cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGFuIG9iamVjdCBhbmQgbm90IGFuIGFycmF5LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzUHVyZU9iamVjdDogZnVuY3Rpb24gaXNQdXJlT2JqZWN0ICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIShpdGVtIGluc3RhbmNlb2YgQXJyYXkpICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBzdHJpbmdzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBzdHJpbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uIGlzU3RyaW5nICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGJvb2xlYW5zLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBib29sZWFuLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzQm9vbGVhbjogZnVuY3Rpb24gaXNCb29sZWFuICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbiBpc0Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGxsbCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiBpc051bGwgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtID09PSBudWxsO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIHVuZGVmaW5lZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uIGlzVW5kZWZpbmVkICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGFyZ3VtZW50cyBvYmplY3RzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJndW1lbnRzIG9iamVjdCwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzQXJndW1lbnRzOiBmdW5jdGlvbiBpc0FyZ3VtZW50cyAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVtKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnMgYW4gb2JqZWN0IHRvIGEgbnVtYmVyLCBpZiBwb3NzaWJsZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBmbG9hdCBvciBOYU4uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9OdW1iZXI6IGZ1bmN0aW9uIHRvTnVtYmVyICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlRmxvYXQobykgOiBOYU4pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWxzLmxlbmd0aCA9PT0gMSA/IHZhbHNbMF0gOiB2YWxzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJzIGFuIG9iamVjdCB0byBhbiBpbnRlZ2VyLCBpZiBwb3NzaWJsZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYW4gaW50ZWdlciBvciBOYU4uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9JbnQ6IGZ1bmN0aW9uIHRvSW50ICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJhZGl4ID0gL14weC8udGVzdChvKSA/IDE2IDogMTA7IC8vIENoZWNrIGZvciBoZXggc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUludChvLCByYWRpeCkgOiBOYU4pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWxzLmxlbmd0aCA9PT0gMSA/IHZhbHNbMF0gOiB2YWxzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIGFycmF5IGl0ZW0sIHJhbmRvbSBvYmplY3QgcHJvcGVydHksIHJhbmRvbSBjaGFyYWN0ZXIgaW4gYSBzdHJpbmcsIG9yIHJhbmRvbSBkaWdpdCBpbiBhIG51bWJlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gcmFuZG9tIChvKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvIGluc3RhbmNlb2YgQXJyYXkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgb1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBvLmxlbmd0aCldIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIG9bT2JqZWN0LmtleXMobylbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogT2JqZWN0LmtleXMobykubGVuZ3RoKV1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IG8sIG5lZ2F0aXZlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoby5sZW5ndGggPT09IDApIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInICYmIG8gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWdhdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmFicyh2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFsID0gdmFsLnRvU3RyaW5nKClbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdmFsLnRvU3RyaW5nKCkubGVuZ3RoKV07XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnbnVtYmVyJykgdmFsID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZWdhdGl2ZSA/IC12YWwgOiB2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGVhY2ggcHJvcGVydHkgdGhlIG9iamVjdCBjb250YWlucy4gSWYgdGhpcyBpcyBjYWxsZWRcbiAgICAgICAgICAgICAqIG9uIGEgbnVtYmVyIG9yIGZ1bmN0aW9uLCB0aGUgb2JqZWN0IHdpbGwgYmUgY2FzdCB0byBhIHN0cmluZy48YnI+PGJyPlxuICAgICAgICAgICAgICogVGhlIGNhbGxiYWNrIGBmYCB3aWxsIGJlIGludm9rZWQgd2l0aCB0aGUgZm9sbG93aW5nIGFyZ3VtZW50czpcbiAgICAgICAgICAgICAqIDx1bD5cbiAgICAgICAgICAgICAqIFx0PGxpPnZhbHVlICAgICAtIFRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBvYmplY3QgYmVpbmcgaXRlcmF0ZWQgb3ZlcjwvbGk+XG4gICAgICAgICAgICAgKiBcdDxsaT5rZXkgICAgICAgLSBUaGUga2V5IG9mIHRoZSBjdXJyZW50IG9iamVjdCAoaWYgYW4gb2JqZWN0LCB0aGUgaW5kZXggaWYgYW4gYXJyYXkpPC9saT5cbiAgICAgICAgICAgICAqIFx0PGxpPml0ZXJhdGlvbiAtIFRoZSBjdXJyZW50IGl0ZXJhdGlvbiAoc2FtZSBhcyBrZXkgaWYgYSBzdHJpbmcgb3IgYXJyYXkpPC9saT5cbiAgICAgICAgICAgICAqIFx0PGxpPmV4aXQgICAgICAtIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBicmVhayB0aGUgbG9vcCBhbmQgcmV0dXJuIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIGl0LFxuICAgICAgICAgICAgICogXHRcdFx0XHRcdG9yIGEgc2luZ2xlIHZhbHVlIGlmIG9ubHkgYSBzaW5nbGUgdmFsdWUgaXMgcGFzc2VkLjwvbGk+XG4gICAgICAgICAgICAgKiA8L3VsPlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtyYW5nZUE9MF0gVGhlIGl0ZXJhdGlvbiBzdGFydCBpbmRleFxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcmFuZ2VCPSdsZW5ndGggb2YgdGhlIGl0ZW0nXSBUaGUgaXRlcmF0aW9uIGVuZCBpbmRleFxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW0gd2l0aGluIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgcGFzc2VkIHRvIHRoZSBleGl0IHBhcmFtZXRlciBvZiB0aGUgY2FsbGJhY2suLi5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWFjaDogZnVuY3Rpb24gZWFjaCAobywgcmFuZ2VBLCByYW5nZUIsIGYpIHtcblxuICAgICAgICAgICAgICAgIC8vIENhbid0IHVzZSBsYXN0IGhlcmUuLiB3b3VsZCBjYXVzZSBjaXJjdWxhciByZWYuLi5cbiAgICAgICAgICAgICAgICBmID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBrID49IDA7IGstLSkge1xuICAgICAgICAgICAgICAgICAgICBpZihhcmd1bWVudHNba10gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZiA9IGFyZ3VtZW50c1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJldCAgICA9IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlbiA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWxmICAgPSBvLFxuICAgICAgICAgICAgICAgICAgICBrZXlzLCBwcm9wZXJ0eSwgdmFsdWUsXG5cbiAgICAgICAgICAgICAgICAgICAgZXhpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlbiAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCAgICAgID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cykgOiBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHNlbGYgPT09ICdudW1iZXInIHx8IHR5cGVvZiBzZWxmID09PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBzZWxmID09PSAnYm9vbGVhbicpIHNlbGYgPSBvLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBkb2VzIHNvbWUgZnVua3kgc3R1ZmYgaGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykgc2VsZiA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzZWxmKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgU2FmYXJpXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc0FyZ3MgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIGlkeCAgPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICByYW5nZUEgPSBwYXJzZUludChyYW5nZUEpO1xuICAgICAgICAgICAgICAgICAgICByYW5nZUEgPSAoaXNOYU4ocmFuZ2VBKSB8fCAhaXNGaW5pdGUocmFuZ2VBKSkgPyAwIDogcmFuZ2VBO1xuXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQiA9IHBhcnNlSW50KHJhbmdlQik7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQiA9IChpc05hTihyYW5nZUIpIHx8ICFpc0Zpbml0ZShyYW5nZUIpKSA/IGtleXMubGVuZ3RoIDogcmFuZ2VCO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gMCwgbjtcbiAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMocmFuZ2VBKSA+IE1hdGguYWJzKHJhbmdlQikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQiA8IDApIHJhbmdlQiA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPCAwKSByYW5nZUEgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBID4ga2V5cy5sZW5ndGggLSAxKSByYW5nZUEgPSBrZXlzLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihuID0gcmFuZ2VBOyBuID49IHJhbmdlQjsgbi0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBrZXlzW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgZXhpdCwgaSsrLCBvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihicm9rZW4pIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcmFuZ2VCICsgMSA+IGtleXMubGVuZ3RoID8ga2V5cy5sZW5ndGggOiByYW5nZUIgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VCIDwgMCkgcmFuZ2VCID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQSA8IDApIHJhbmdlQSA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihuID0gcmFuZ2VBOyBuIDwgcmFuZ2VCOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBleGl0LCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSW52b2tlcyB0aGUgY2FsbGJhY2sgJ2YnIGZvciBldmVyeSBwcm9wZXJ0eSB0aGUgb2JqZWN0IGNvbnRhaW5zLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJucyBmYWxzZSwgdGhlXG4gICAgICAgICAgICAgKiBsb29wIGlzIGJyb2tlbiBhbmQgZmFsc2UgaXMgcmV0dXJuZWQ7IG90aGVyd2lzZSB0cnVlIGlzIHJldHVybmVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW0gd2l0aGluIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIG5vbmUgb2YgdGhlIGNhbGxiYWNrIGludm9jYXRpb25zIHJldHVybmVkIGZhbHNlLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV2ZXJ5OiBmdW5jdGlvbiBldmVyeSAobywgZikge1xuICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbywga2V5cywgcHJvcGVydHksIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSBzZWxmID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHNlbGYpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIHRydWUsIHRoZVxuICAgICAgICAgICAgICogbG9vcCBpcyBicm9rZW4gYW5kIGZhbHNlIGlzIHJldHVybmVkOyBvdGhlcndpc2UgdHJ1ZSBpcyByZXR1cm5lZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBub25lIG9mIHRoZSBjYWxsYmFjayBpbnZvY2F0aW9ucyByZXR1cm5lZCBmYWxzZS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbnk6IGZ1bmN0aW9uIGFueSAobywgZikge1xuICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbywga2V5cywgcHJvcGVydHksIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSBzZWxmID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHNlbGYpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgaSsrLCBvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJldCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhbiBhcnJheS4gRm9yIHN0cmluZ3MsIG51bWJlcnMsIGFuZCBmdW5jdGlvbnMgdGhpcyB3aWxsXG4gICAgICAgICAgICAgKiByZXR1cm4gYSBjaGFyIGFycmF5IHRvIHRoZWlyIHJlc3BlY3RpdmUgLnRvU3RyaW5nKCkgdmFsdWVzXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgb2JqZWN0LCBjb252ZXJ0ZWQgdG8gYW4gYXJyYXkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIHRvQXJyYXkgKG8pIHtcbiAgICAgICAgICAgICAgICBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KG8pO1xuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uICh2YWwpIHsgYXJyLnB1c2godmFsKTsgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgZmlyc3QgbiBlbGVtZW50cyBvZiBhbiBvYmplY3QuIElmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIGFuZCBvbmx5IG9uZSBpdGVtcyBpcyByZXRyaWV2ZWQsXG4gICAgICAgICAgICAgKiB0aGF0IGl0ZW0gd2lsbCBiZSByZXR1cm5lZCwgcmF0aGVyIHRoYW4gYW4gYXJyYXkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtuPTFdIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGZpcnN0IG4gZWxlbWVudHMgb2YgdGhlIGFycmF5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmaXJzdDogZnVuY3Rpb24gZmlyc3QgKG8sIG4pIHtcbiAgICAgICAgICAgICAgICBuID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgICAgICAgICAgIG4gPSBpc05hTihuKSB8fCAhaXNGaW5pdGUobikgPyAxIDogbjtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKDAsIG4pOyBlbHNlIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBpZihuID09PSAxKSByZXR1cm4gb1swXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG4gIT09IDAgPyBvLnNsaWNlKDAsIG4pIDogW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMCwgbiAtIDEsIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHsgdltrZXldID0gaXRlbTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gZ2V0S2V5cyh2KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXMubGVuZ3RoID09PSAxID8gdltrZXlzWzBdXSA6IHY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMSA/IHZbMF0gOiB2O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBsYXN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICogdGhhdCBpdGVtIHdpbGwgYmUgcmV0dXJuZWQgcmF0aGVyIHRoYW4gYW4gYXJyYXkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtuPTFdIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGxhc3QgbiBlbGVtZW50cyBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24gbGFzdCAobywgbikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHJldHVybiBvO1xuXG4gICAgICAgICAgICAgICAgbiA9IHBhcnNlSW50KG4sIDEwKTtcbiAgICAgICAgICAgICAgICBuID0gaXNOYU4obikgfHwgIWlzRmluaXRlKG4pID8gMSA6IG47XG4gICAgICAgICAgICAgICAgdmFyIHYgPSBudWxsLCBrZXlzLCBsZW4gPSBsaWJzLm9iamVjdC5zaXplKG8pLCBpZHg7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKG8pO1xuICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdiA9IFtdOyBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXJndW1lbnRzIG9iamVjdCBzaG91bGQgaWdub3JlIHVuZGVmaW5lZCBtZW1iZXJzLi4uXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goa2V5cywgMCwgbGVuLCBmdW5jdGlvbiAoaykgeyBpZihvW2tdICE9PSB1bmRlZmluZWQpIHYudW5zaGlmdChvW2tdKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHYgPSB2LnNsaWNlKDAsIG4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKC1uKTsgZWxzZSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSkgcmV0dXJuIG9bby5sZW5ndGggLTFdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbiAhPT0gMCA/IG8uc2xpY2UoLW4pIDogW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPCAwKSBuID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBsZW4gLSBuLCBsZW4sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHsgdltrZXldID0gaXRlbTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHYpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IDEgPyB2W2tleXNbMF1dIDogdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHYubGVuZ3RoID09PSAxID8gdlswXSA6IHYubGVuZ3RoID4gMCA/IHYgOiBudWxsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiB0aGUgbGFzdCBpdGVtIGluIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhbiBcImVtcHR5XCIgZnVuY3Rpb24gd2lsbCBiZSByZXR1cm5lZC5cbiAgICAgICAgICAgICAqIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhIGNhbGxiYWNrIGNhbiBhbHdheXMgYmUgaW52b2tlZCwgd2l0aG91dCBjaGVja2luZyBpZiB0aGUgYXJndW1lbnQgaXMgYSBmdW5jdGlvblxuICAgICAgICAgICAgICogb3ZlciBhbmQgb3Zlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gZ2V0IHRoZSBjYWxsYmFjayBmb3IuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gSWYgdGhlIGxhc3QgaXRlbSBpbiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYW4gXCJlbXB0eVwiIGZ1bmN0aW9uIHdpbGwgYmUgcmV0dXJuZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldENhbGxiYWNrOiBmdW5jdGlvbiBnZXRDYWxsYmFjayAobykge1xuICAgICAgICAgICAgICAgIHZhciBsYXN0ID0gbGlicy5vYmplY3QubGFzdChvKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGFzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gbGFzdCA6IE5VTExfRlVOQ1RJT047XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZpbmQgYSBjaGlsZCBvZiBhbiBvYmplY3QgdXNpbmcgdGhlIGdpdmVuIHBhdGgsIHNwbGl0IGJ5IHRoZSBnaXZlbiBkZWxpbWl0ZXIgKG9yICcuJyBieSBkZWZhdWx0KVxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gdGhlIGNoaWxkIG9iamVjdFxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZGVsaW1pdGVyPScuJ10gVGhlIHBhdGggZGVsaW1pdGVyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZG9uZSBBIGNhbGxiYWNrIGZvciBjb21wbGV0aW9uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfE51bGx9IFRoZSBjaGlsZCBvYmplY3QgYXQgdGhlIGdpdmVuIHN0cmluZyBwYXRoLCBvciBudWxsIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZmluZENoaWxkQXRQYXRoOiBmdW5jdGlvbiBmaW5kQ2hpbGRBdFBhdGggKG8sIHBhdGgsIGRlbGltaXRlciwgb3JpZ2luYWwsIGludm9rZWQsIGRvbmUpIHtcbiAgICAgICAgICAgICAgICBkb25lID0gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2soYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IG87XG5cbiAgICAgICAgICAgICAgICBvcmlnaW5hbCA9ICghKG9yaWdpbmFsIGluc3RhbmNlb2YgRnVuY3Rpb24pICYmIG9yaWdpbmFsKSA/IG9yaWdpbmFsIDogc2VsZjtcbiAgICAgICAgICAgICAgICBpbnZva2VkICA9IGludm9rZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9IHR5cGVvZiBkZWxpbWl0ZXIgPT09ICdzdHJpbmcnID8gZGVsaW1pdGVyIDogJy4nO1xuICAgICAgICAgICAgICAgICAgICBwYXRoICAgICAgPSBwYXRoLnNwbGl0KGRlbGltaXRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHAgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChvLCBrLCBpLCBleGl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocGF0aC5sZW5ndGggPT09IDAgJiYgayA9PT0gcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb25lLmNhbGwob3JpZ2luYWwsIG8sIHNlbGYsIGspO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZva2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBsaWJzLm9iamVjdC5maW5kQ2hpbGRBdFBhdGgobywgcGF0aC5qb2luKGRlbGltaXRlciksIGRlbGltaXRlciwgb3JpZ2luYWwsIGludm9rZWQsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihvYmogIT09IG51bGwpIGV4aXQob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighaW52b2tlZCAmJiBvcmlnaW5hbCA9PT0gc2VsZiAmJiBkb25lIGluc3RhbmNlb2YgRnVuY3Rpb24pIGRvbmUuY2FsbChvcmlnaW5hbCwgbnVsbCwgc2VsZiwgbnVsbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFByb2R1Y2VzIGEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgb2JqZWN0LCB0aGF0IGlzLCBpZiBKU09OLnN0cmluZ2lmeSBjYW4gaGFuZGxlIGl0Ljxicj5cbiAgICAgICAgICAgICAqIFRoZSBvYmplY3QgbXVzdCBiZSBub24tY2lyY3VsYXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBBIHNoYWxsb3cgY2xvbmUgb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gY2xvbmUgKG8pIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG8gPT09ICdudW1iZXInKSByZXR1cm4gbztcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG8pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gY2xvbmUgb2JqZWN0OiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZpbHRlcnMgYW4gYXJyYXkgb3Igb2JqZWN0IHVzaW5nIG9ubHkgdGhlIHR5cGVzIGFsbG93ZWQuIFRoYXQgaXMsIGlmIHRoZSBpdGVtIGluIHRoZSBhcnJheSBpcyBvZiBhIHR5cGUgbGlzdGVkXG4gICAgICAgICAgICAgKiBpbiB0aGUgYXJndW1lbnRzLCB0aGVuIGl0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGZpbHRlcmVkIGFycmF5LiBJbiB0aGlzIGNhc2UgJ2FycmF5JyBpcyBhIHZhbGlkIHR5cGUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLlN0cmluZ30gdHlwZXMgQSBsaXN0IG9mIHR5cGVvZiB0eXBlcyB0aGF0IGFyZSBhbGxvd2VkIGluIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBBbiBhcnJheSBmaWx0ZXJlZCBieSBvbmx5IHRoZSBhbGxvd2VkIHR5cGVzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBvbmx5OiBmdW5jdGlvbiBvbmx5IChvLCB0eXBlcykge1xuICAgICAgICAgICAgICAgIHR5cGVzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHR5cGVzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBbGxvd3MgdGhlICdwbHVyYWwnIGZvcm0gb2YgdGhlIHR5cGUuLi5cbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHR5cGVzLCBmdW5jdGlvbiAodHlwZSwga2V5KSB7IHRoaXNba2V5XSA9IHR5cGUucmVwbGFjZSgvcyQvLCAnJyk7IH0pO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnIHx8ICFvKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICB2YXIgaXNBcnJheSAgPSBvIGluc3RhbmNlb2YgQXJyYXkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gaXNBcnJheSA/IFtdIDoge30sXG4gICAgICAgICAgICAgICAgICAgIHR5cGVBcnIgID0gdHlwZXMuaW5kZXhPZignYXJyYXknKSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZU9iaiAgPSB0eXBlcy5pbmRleE9mKCdvYmplY3Qgb2JqZWN0Jyk7XG5cbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJdGVtID0gdHlwZXMuaW5kZXhPZih0eXBlb2YgaXRlbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZU9iaiAhPT0gLTEgJiYgdHlwZUFyciA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgIShpdGVtIGluc3RhbmNlb2YgQXJyYXkpKSB8fCAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnICYmIHR5cGVJdGVtICE9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZU9iaiAhPT0gLTEgJiYgdHlwZUFyciAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzLnB1c2goJ29iamVjdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZUl0ZW0gIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVJdGVtICE9PSAtMSB8fCAoaXRlbSBpbnN0YW5jZW9mIEFycmF5ICYmIHR5cGVBcnIgIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmlsdGVycyBhbiBvYmplY3QgdXNpbmcgdGhlIGdpdmVuIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIG9iamVjdHMsIGEgbmV3IG9iamVjdCB3aWxsIGJlIHJldHVybmVkLCB3aXRoXG4gICAgICAgICAgICAgKiB0aGUgdmFsdWVzIHRoYXQgcGFzc2VkIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBzdHJpbmdzLCBhIG5ldyBzdHJpbmcgd2lsbCBiZSByZXR1cm5lZCB3aXRoIHRoZSBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgKiB0aGF0IHBhc3NlZCB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3IgbnVtYmVycywgYSBuZXcgbnVtYmVyIHdpbGwgYmUgcmV0dXJuZWQgd2l0aCB0aGUgZGlnaXRzIHRoYXQgcGFzc2VkXG4gICAgICAgICAgICAgKiB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiBGdW5jdGlvbnMgd2lsbCBiZSBvcGVyYXRlZCBvbiBhcyBzdHJpbmdzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbHRlciB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIGZpbHRlcmVkIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3aGVyZTogZnVuY3Rpb24gd2hlcmUgKG8sIHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgIGlmKCEocHJlZGljYXRlIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wID0gcHJlZGljYXRlO1xuICAgICAgICAgICAgICAgICAgICBwcmVkaWNhdGUgPSBmdW5jdGlvbiAoaSkgeyByZXR1cm4gaSA9PSB0ZW1wOyB9OyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzT2JqZWN0ID0gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmICEobyBpbnN0YW5jZW9mIEFycmF5KSA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSAhaXNPYmplY3QgPyBbXSA6IHt9O1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHByZWRpY2F0ZS5jYWxsKGl0ZW0sIGl0ZW0sIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzT2JqZWN0KSBmaWx0ZXJlZFtrZXldID0gaXRlbTsgZWxzZSBmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIGZpbHRlcmVkID0gZmlsdGVyZWQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCBieSBrZXlzIHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIHVzZWQgdG8gZmlsdGVyIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdoZXJlS2V5czogZnVuY3Rpb24gd2hlcmVLZXlzIChvLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcCA9IHByZWRpY2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgcHJlZGljYXRlID0gZnVuY3Rpb24gKGspIHsgcmV0dXJuIGsgPT0gdGVtcDsgfTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYobyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiAwID09PSAnYm9vbGVhbicpIHJldHVybiBwcmVkaWNhdGUuY2FsbChvLCBvLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gIWlzT2JqZWN0ID8gW10gOiB7fTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChrZXksIGtleSwgaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzT2JqZWN0KSBmaWx0ZXJlZFtrZXldID0gaXRlbTsgZWxzZSBmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIGZpbHRlcmVkID0gZmlsdGVyZWQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGb3Igb2JqZWN0cywgaW52ZXJ0cyB0aGUgb2JqZWN0cyBrZXlzL3ZhbHVlcy4gSWYgdGhlIHZhbHVlIGlzbid0IGEgbnVtYmVyIG9yIGFycmF5LCBpdCB3aWxsIGJlIG9taXR0ZWQuXG4gICAgICAgICAgICAgKiBGb3Igc3RyaW5ncywgaXQgd2lsbCByZXZlcnNlIHRoZSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBGb3IgbnVtYmVyLCBpdCB3aWxsIGNvbXB1dGUgdGhlIG51bWJlcidzIGludmVyc2UgKGkuZS4gMSAvIHgpLlxuICAgICAgICAgICAgICogRm9yIGZ1bmN0aW9ucywgaW52ZXJ0IHJldHVybnMgYSBuZXcgZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgZ2l2ZW4gZnVuY3Rpb24gYW5kIGludmVydHMgaXQncyByZXN1bHQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgaW52ZXJzZSwgYXMgZGVzY3JpYmVkIGFib3ZlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnZlcnQ6IGZ1bmN0aW9uIGludmVydCAobykge1xuICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycpICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJldmVyc2Uobyk7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSAgIHJldHVybiAxIC8gbztcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSAgcmV0dXJuICFvO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvLmFwcGx5KG8sIGFyZ3VtZW50cykpOyB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIW9ialtpdGVtXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXAgPSBvYmpbaXRlbV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dLnB1c2godG1wLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmdW5jIElmIHBhc3NlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXg6IGZ1bmN0aW9uIG1heCAobywgZnVuYykge1xuICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHZhciBtYXgsIG1heFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgaWYoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPj0gbWF4KSBtYXggPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICBtYXhWYWx1ZSA9IGZ1bmMuY2FsbChtYXgsIG1heCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnVuYy5jYWxsKGl0ZW0sIGl0ZW0pID49IG1heFZhbHVlKSBtYXggPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgbWluaW11bSBpdGVtIGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZnVuYyBJZiBwYXNzZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgbWluaW11bSBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluOiBmdW5jdGlvbiBtaW4gKG8sIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBpZighbyB8fCB0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKCEoZnVuYyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgZnVuYyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgdmFyIG1pbiwgbWluVmFsdWU7XG5cbiAgICAgICAgICAgICAgICBpZighZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA8PSBtaW4pIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWluID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIG1pblZhbHVlID0gZnVuYy5jYWxsKG1pbiwgbWluKTtcblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmdW5jLmNhbGwoaXRlbSwgaXRlbSkgPD0gbWluVmFsdWUpIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWluO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUZXN0cyB3aGV0aGVyIG9yIG5vdCB0aGUgb2JqZWN0IGhhcyBhIG1ldGhvZCBjYWxsZWQgJ21ldGhvZCcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gdGVzdCBleGlzdGVuY2UgZm9yLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGhhcyBhIGZ1bmN0aW9uIGNhbGxlZCAnbWV0aG9kJywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbXBsZW1lbnRzOiBmdW5jdGlvbiBfaW1wbGVtZW50cyAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICBpZighYSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmdzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGFbbV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2FtZSBhcyBPYmplY3Quai5pbXBsZW1lbnRzLCBleGNlcGN0IHdpdGggYSBoYXNPd25Qcm9wZXJ0eSBjaGVjay5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byB0ZXN0IGV4aXN0ZW5jZSBmb3IuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaGFzIGl0cyBvd24gZnVuY3Rpb24gY2FsbGVkICdtZXRob2QnLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGltcGxlbWVudHNPd246IGZ1bmN0aW9uIGltcGxlbWVudHNPd24gKG8sIG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgaWYoIWEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJncywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhW21dIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICFvLmhhc093blByb3BlcnR5KG1ldGhvZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbGlicztcbn1cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsaWJzO1xufSgpKTtcbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iXX0=
