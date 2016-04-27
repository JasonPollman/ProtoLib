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
        inheritanceList = {},

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
            for(var i in inheritanceList) {
                if(inheritanceList.hasOwnProperty(i)) {
                    if(inheritanceList[i].indexOf(constr.__get_protolib_id__) > -1) {
                        delete cached[i];
                        delete inheritanceList[i];
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
                        var pid, proto, addMethod,
                            lib  = {},
                            i    = 0,
                            last = null;

                        addMethod = function addMethod (o, k) { if(!lib[k]) lib[k] = o; };
                        proto = getProto(this);

                        do {
                            currentThis = this;
                            pid = proto.constructor.__get_protolib_id__;

                            if(cached[pid] && i === 0) {
                                return cached[pid];
                            }
                            else if(libp[pid]) {
                                libs.object.each(libp[pid], addMethod);
                                if(!inheritanceList[pid]) inheritanceList[pid] = [pid];
                                if(last) inheritanceList[last].unshift(pid);
                                cached[last] = lib;
                                last = pid;
                            }

                            ++i;
                        }
                        while (proto = getProto(proto)); // jshint ignore:line
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
                if(o === undefined || o == null) return [];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5N0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gSWRlbnRpZmllci5cbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHZhciBvaWQgPSAtMSxcblxuICAgICAvKipcbiAgICAgICogVHJ1ZSBpZiB0aGUgTm9kZS5qcyBlbnZpcm9ubWVudCBpcyBsb2FkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAqL1xuICAgIElTX0JST1dTRVIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIFRoaXMgcHJvdmlkZXMgYSB3YXkgdG8gZGV0ZXJtaW5lIHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gY29uc3RydWN0b3IgaW4gYSBwbGF0Zm9ybSBhZ25vc3RpYyB3YXkuLi5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ19fZ2V0X3Byb3RvbGliX2lkX18nLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICBnZXQgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgdGhpcy5fX3Byb3RvbGliX2lkX18gIT09ICdzdHJpbmcnICYmICh0eXBlb2YgdGhpcyA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHRoaXMgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3Byb3RvbGliX2lkX18nLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtYmVyYWJsZSAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6ICcweCcgKyAoKytvaWQpLnRvU3RyaW5nKDE2KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19wcm90b2xpYl9pZF9fO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgX29iamVjdFVpZCAgID0gT2JqZWN0Ll9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9udW1iZXJVaWQgICA9IE51bWJlci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfc3RyaW5nVWlkICAgPSBTdHJpbmcuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2FycmF5VWlkICAgID0gQXJyYXkuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2Z1bmN0aW9uVWlkID0gRnVuY3Rpb24uX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2RhdGVVaWQgICAgID0gRGF0ZS5fX2dldF9wcm90b2xpYl9pZF9fO1xuXG4gICAgdmFyIFByb3RvTGliID0gZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgICAgICAvLyBQcmV2ZW50IEZ1bmN0aW9uLmNhbGwgb3IgYmluZGluZy4uLlxuICAgICAgICBpZighKHRoaXMgaW5zdGFuY2VvZiBQcm90b0xpYikpIHJldHVybiBuZXcgUHJvdG9MaWIoaGFuZGxlKTtcblxuICAgICAgICAvLyBTZXQgZWl0aGVyIHRoZSB1c2VyIHRoZSBkZWZhdWx0IFwiaGFuZGxlXCIgKGxpYnJhcnkgYWNjZXNzb3IpXG4gICAgICAgIGhhbmRsZSA9IHR5cGVvZiBoYW5kbGUgPT09ICdzdHJpbmcnID8gaGFuZGxlIDogJ18nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHNlbGYgcmVmZXJlbmNlLlxuICAgICAgICAgKiBAdHlwZSB7UHJvdG9MaWJ9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSBsaWJyYXJ5IGZ1bmN0aW9ucyBoYXZlIGJlZW4gYXR0YWNoZWQgdG8gdGhlIHByb3RvdHlwZXMuXG4gICAgICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYXR0YWNoZWQgPSBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUG9pbnRzIHRvIHRoZSBjdXJyZW50IHRoaXMgaXRlbS5cbiAgICAgICAgICogQHR5cGUgeyp9XG4gICAgICAgICAqL1xuICAgICAgICBjdXJyZW50VGhpcyA9IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyBjYWNoZWQgbGlicmFyeSBwcm90byByZWZlcmVuY2Ugb2JqZWN0c1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgY2FjaGVkID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyB0aGUgY29uc3RydWN0b3IgY2hhaW4gZm9yIGVhY2ggcHJvdG90eXBlIGFzIGFuIGFycmF5LlxuICAgICAgICAgKiBGb3IgZXhhbXBsZTogeyBzdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZyddIH0uXG4gICAgICAgICAqIEFub3RoZXIgZXhhbXBsZTogeyBteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZycsICdteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmcnXSB9XG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBpbmhlcml0YW5jZUxpc3QgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHN0YXRpYyBsaWJyYXJ5XG4gICAgICAgICAqL1xuICAgICAgICBsaWJzID0gcmVxdWlyZSgnLi9saWIvbGlicycpKCksXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBwcm90b2xpYnJhcnlcbiAgICAgICAgICovXG4gICAgICAgIGxpYnAgPSByZXF1aXJlKCcuL2xpYi9saWJwJykobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKTtcblxuICAgICAgICAvLyBNYXAgdGhlIG9iamVjdCBpZHMgdG8gdGhlIGxpYnJhcnkgbmFtZXMuLi5cbiAgICAgICAgbGlicFtfb2JqZWN0VWlkXSAgID0gbGlicC5vYmplY3Q7XG4gICAgICAgIGxpYnBbX3N0cmluZ1VpZF0gICA9IGxpYnAuc3RyaW5nO1xuICAgICAgICBsaWJwW19udW1iZXJVaWRdICAgPSBsaWJwLm51bWJlcjtcbiAgICAgICAgbGlicFtfYXJyYXlVaWRdICAgID0gbGlicC5hcnJheTtcbiAgICAgICAgbGlicFtfZnVuY3Rpb25VaWRdID0gbGlicC5mdW5jdGlvbjtcbiAgICAgICAgbGlicFtfZGF0ZVVpZF0gICAgID0gbGlicC5kYXRlO1xuXG4gICAgICAgIC8vIFR1Y2sgdW5uYW1lZCBzdGF0aWMgZXh0ZW5zaW9ucyBoZXJlLi4uXG4gICAgICAgIGxpYnMubXkgPSB7fTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBjb25zdHJ1Y3RvciwgYW5kIGFsbCBvdGhlcnMgdGhhdCBpbmhlcml0cyBmcm9tIGl0cyBwcm90b3R5cGUuXG4gICAgICAgICAqIFdoaWNoIG1lYW5zIGlmIGNvbnN0ciA9PT0gT2JqZWN0LCBhbGwgY2FjaGUgd2lsbCBiZSBkZWxldGVkLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIHRvIGRlbGV0ZSB0aGUgY2FjaGUgZm9yLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IgKGNvbnN0cikge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIGluaGVyaXRhbmNlTGlzdCkge1xuICAgICAgICAgICAgICAgIGlmKGluaGVyaXRhbmNlTGlzdC5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihpbmhlcml0YW5jZUxpc3RbaV0uaW5kZXhPZihjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfXykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlZFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbmhlcml0YW5jZUxpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcHBlbmRzIGFsbCB0aGUgbGlicmFyeSBmdW5jdGlvbnMgdG8gdGhpcyBpbnN0YW5jZSBmb3Igc3RhdGljIHVzZS5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhdHRhY2hMaWJyYXJ5VG9TZWxmICgpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBsaWJzKVxuICAgICAgICAgICAgICAgIGlmKGxpYnMuaGFzT3duUHJvcGVydHkoaSkgJiYgIXNlbGZbaV0pIHNlbGZbaV0gPSBsaWJzW2ldO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRQcm90byAobykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJRSB0aHJvdyB3aGVuIGNhbGxpbmcgT2JqZWN0LmdldFByb3RvdHlwZU9mIG9uIHByaW1pdGl2ZSB2YWx1ZXMuLi5cbiAgICAgICAgICAgICAgICAvLyBCdXQgbm90IHdpdGggZGVwcmVjYXRlZCBfX3Byb3RvX18gPz8/XG4gICAgICAgICAgICAgICAgcmV0dXJuIG8uX19wcm90b19fIHx8IG8uY29uc3RydWN0b3IucHJvdG90eXBlOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRzIHRoZSBsaWJyYXJ5IG1ldGhvZHMgZnJvbSB0aGUgcHJpbWl0aXZlIG9iamVjdCBwcm90b3R5cGVzLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFwcGx5TGlicmFyeVRvUHJvdG90eXBlcyAoKSB7XG4gICAgICAgICAgICBpZighYXR0YWNoZWQpIHtcbiAgICAgICAgICAgICAgICBhdHRhY2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsIGhhbmRsZSwge1xuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlICAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3cgdXNlcnMgdG8gb3ZlcndyaXRlIHRoZSBoYW5kbGUgb24gYSBwZXIgaW5zdGFuY2UgYmFzaXMuLi5cbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhpc1toYW5kbGVdICE9PSB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGhhbmRsZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0YWJsZSAgICAgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiB2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgdGhlIGxpYnAgbGlicmFyeS4uLlxuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwaWQsIHByb3RvLCBhZGRNZXRob2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGliICA9IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgICAgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRNZXRob2QgPSBmdW5jdGlvbiBhZGRNZXRob2QgKG8sIGspIHsgaWYoIWxpYltrXSkgbGliW2tdID0gbzsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvID0gZ2V0UHJvdG8odGhpcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGhpcyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGlkID0gcHJvdG8uY29uc3RydWN0b3IuX19nZXRfcHJvdG9saWJfaWRfXztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNhY2hlZFtwaWRdICYmIGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFtwaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGxpYnBbcGlkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGxpYnBbcGlkXSwgYWRkTWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWluaGVyaXRhbmNlTGlzdFtwaWRdKSBpbmhlcml0YW5jZUxpc3RbcGlkXSA9IFtwaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsYXN0KSBpbmhlcml0YW5jZUxpc3RbbGFzdF0udW5zaGlmdChwaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZWRbbGFzdF0gPSBsaWI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgPSBwaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHByb3RvID0gZ2V0UHJvdG8ocHJvdG8pKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGliO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmVzIHRoZSBsaWJyYXJ5IG1ldGhvZHMgZnJvbSB0aGUgcHJpbWl0aXZlIG9iamVjdCBwcm90b3R5cGVzLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUxpYnJhcnlGcm9tUHJvdG90eXBlcyAoKSB7XG4gICAgICAgICAgICBpZihhdHRhY2hlZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBPYmplY3QucHJvdG90eXBlW2hhbmRsZV07XG4gICAgICAgICAgICAgICAgYXR0YWNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlcyB0aGUgbGFzdCBpdGVtIGZyb20gdGhlICd0aGlzUG9pbnRlclN0YWNrJyBhbmQgaW52b2tlcyB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgd2l0aCBpdC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgd2l0aCB0aGUgY3VycmVudCAndGhpcycgdmFsdWUuXG4gICAgICAgICAqIEByZXR1cm4gVGhlIHJlc3VsdCBvZiB0aGUgaW52b2NhdGlvbiBvZiB0aGUgY2FsbGJhY2suXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRUaGlzVmFsdWVBbmRJbnZva2UgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY3VycmVudFRoaXMgIT09IHVuZGVmaW5lZCAmJiBjdXJyZW50VGhpcyAhPT0gbnVsbCA/IGN1cnJlbnRUaGlzLnZhbHVlT2YoKSA6IGN1cnJlbnRUaGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBoYW5kbGVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGggVGhlIG5ldyBoYW5kbGVcbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldEhhbmRsZSA9IGZ1bmN0aW9uIChoKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgaCA9PT0gJ3N0cmluZycpIGhhbmRsZSA9IGg7XG4gICAgICAgICAgICByZW1vdmVMaWJyYXJ5RnJvbVByb3RvdHlwZXMoKTtcbiAgICAgICAgICAgIGFwcGx5TGlicmFyeVRvUHJvdG90eXBlcygpO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZHMgYSBsaWJyYXJ5IG1ldGhvZCB0byBhIHByb3RvdHlwZS5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGxpYnJhcnkgbWV0aG9kIHRvIGFkZC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IFtjb25zdHI9T2JqZWN0XSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIG9iamVjdCB0byBleHRlbmQuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBtZXRob2QgdG8gYWRkLlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBtZXRob2Qgd2FzIGFkZGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmV4dGVuZCA9IGZ1bmN0aW9uIChuYW1lLCBjb25zdHIsIHN0YXRpY05hbWVzcGFjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2soYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgaWYodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnICAgICB8fCAhKGNhbGxiYWNrIGluc3RhbmNlb2YgRnVuY3Rpb24pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyICE9PSAnZnVuY3Rpb24nIHx8IGNvbnN0ciA9PT0gY2FsbGJhY2spIGNvbnN0ciA9IE9iamVjdDtcblxuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9ySWQgICA9IGNvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9IHR5cGVvZiBzdGF0aWNOYW1lc3BhY2UgPT09ICdzdHJpbmcnID9cbiAgICAgICAgICAgICAgICAgICAgc3RhdGljTmFtZXNwYWNlIDogdHlwZW9mIGNvbnN0ci5uYW1lID09PSAnc3RyaW5nJyA/IGNvbnN0ci5uYW1lIDogJ215JztcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gT2JqZWN0OlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gQXJyYXk6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdhcnJheSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IFN0cmluZzpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IE51bWJlcjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ251bWJlcic7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IEZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnZnVuY3Rpb24nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBEYXRlOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnZGF0ZSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXQgdGhpcyBwcm9wZXJ0eSBzbyB3ZSBjYW4gcmVtb3ZlIGl0IGxhdGVyIGlmIFByb3RvTGliLnJlbW92ZSBpcyBjYWxsZWQgb24gaXQuLi5cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb25zdHIsICdfX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfXycsIHtcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmFsdWUgICAgICAgIDogY29uc3RydWN0b3JOYW1lXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYoIWxpYnBbY29uc3RydWN0b3JJZF0pICAgbGlicFtjb25zdHJ1Y3RvcklkXSAgID0ge307XG4gICAgICAgICAgICBpZighbGlic1tjb25zdHJ1Y3Rvck5hbWVdKSBsaWJzW2NvbnN0cnVjdG9yTmFtZV0gPSB7fTtcblxuICAgICAgICAgICAgbGlic1tjb25zdHJ1Y3Rvck5hbWVdW25hbWVdID0gY2FsbGJhY2s7XG4gICAgICAgICAgICBsaWJwW2NvbnN0cnVjdG9ySWRdW25hbWVdICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goYyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RyKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmVzIGEgbGlicmFyeSBtZXRob2QgZnJvbSBhIGNvbnN0cnVjdG9yJ3MgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgbGlicmFyeSBtZXRob2QgdG8gcmVtb3ZlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIHRvIHJlbW92ZSB0aGUgbWV0aG9kIGZyb20uXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgcmVtb3ZlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmUgPSBmdW5jdGlvbiAobmFtZSwgY29uc3RyKSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIGNvbnN0ciAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgICB2YXIgdWlkID0gY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX187XG4gICAgICAgICAgICBpZihsaWJwW3VpZF0gJiYgbGlicFt1aWRdW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxpYnBbdWlkXVtuYW1lXTtcblxuICAgICAgICAgICAgICAgIGlmKGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXSAmJiBsaWJzW2NvbnN0ci5fX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfX11bbmFtZV0pXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBsaWJzW2NvbnN0ci5fX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfX11bbmFtZV07XG5cbiAgICAgICAgICAgICAgICBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yKGNvbnN0cik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIHByb3RvdHlwZSBsaWJyYXJ5IHJlZmVyZW5jZSBmcm9tIHRoZSBvYmplY3QgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudW5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwbGllcyB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSBhbmQgYWxsIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgICogdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBhdHRhY2hMaWJyYXJ5VG9TZWxmKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSwgYW5kIGF0dGFjaCBhbGwgdGhlIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuLi5cbiAgICAgICAgc2VsZi5sb2FkKCk7XG4gICAgfTtcblxuICAgIHJldHVybiAhSVNfQlJPV1NFUiA/XG4gICAgICAgIG1vZHVsZS5leHBvcnRzICA9IFByb3RvTGliIDpcbiAgICAgICAgd2luZG93LlByb3RvTGliID0gUHJvdG9MaWIgO1xufSgpKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIGxpYnAgKGxpYnMsIGdldFRoaXNWYWx1ZUFuZEludm9rZSkge1xuICAgICAgICB2YXIgbGlicCA9IHtcbiAgICAgICAgICAgIHN0cmluZzoge1xuXG4gICAgICAgICAgICAgICAgY2FtZWxpemU6IGZ1bmN0aW9uIGNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGVjYW1lbGl6ZTogZnVuY3Rpb24gZGVjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5kZWNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZUZyb21TdHJpbmc6IGZ1bmN0aW9uIGRpZmZlcmVuY2VGcm9tU3RyaW5nIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZGlmZmVyZW5jZUZyb21TdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwbGFjZVRva2VuczogZnVuY3Rpb24gcmVwbGFjZVRva2VucyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBsYWNlU3RyaW5nVG9rZW5zKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0U3RyaW5nOiBmdW5jdGlvbiBpbnRlcnNlY3RTdHJpbmcgKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5pbnRlcnNlY3RTdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQgKHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBlYXQocywgdGltZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcnRyaW06IGZ1bmN0aW9uIHJ0cmltICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5ydHJpbShzLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGx0cmltOiBmdW5jdGlvbiBsdHJpbSAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubHRyaW0ocywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRW5jb2RlOiBmdW5jdGlvbiBodG1sRW5jb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxFbmNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRGVjb2RlOiBmdW5jdGlvbiBodG1sRGVjb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxEZWNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZGRTbGFzaGVzOiBmdW5jdGlvbiBhZGRTbGFzaGVzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmFkZFNsYXNoZXMocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB1Y0ZpcnN0OiBmdW5jdGlvbiB1Y0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnVjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsY0ZpcnN0OiBmdW5jdGlvbiBsY0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmxjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uIHRpdGxlQ2FzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy50aXRsZUNhc2Uocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoaW5kZXgsIGNvdW50LCBhZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNwbGljZShzLCBpbmRleCwgY291bnQsIGFkZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBlbGxpcHNlczogZnVuY3Rpb24gZWxsaXBzZXNfIChsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZWxsaXBzZXMocywgbGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAoc3BsaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNodWZmbGUocywgc3BsaXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gcmV2ZXJzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXZlcnNlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhvdXRUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVnZXhwU2FmZTogZnVuY3Rpb24gcmVnZXhwU2FmZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZWdleHBTYWZlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCwgZGVsaW0sIHByZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucGFkKHMsIGxlbmd0aCwgZGVsaW0sIHByZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBuZXdsaW5lVG9CcmVhazogZnVuY3Rpb24gbmV3bGluZVRvQnJlYWsgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubmV3bGluZVRvQnJlYWsocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0YWJzVG9TcGFuOiBmdW5jdGlvbiB0YWJzVG9TcGFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnRhYnNUb1NwYW4ocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3b3JkV3JhcFRvTGVuZ3RoOiBmdW5jdGlvbiB3b3JkV3JhcFRvTGVuZ3RoICh3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud29yZFdyYXBUb0xlbmd0aChzLCB3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhcnJheToge1xuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5zaHVmZmxlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pb246IGZ1bmN0aW9uIHVuaW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnVuaW9uLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kaWZmZXJlbmNlLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0OiBmdW5jdGlvbiBpbnRlcnNlY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuaW50ZXJzZWN0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dDogZnVuY3Rpb24gd2l0aG91dCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS53aXRob3V0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlOiBmdW5jdGlvbiByb3RhdGUgKGRpcmVjdGlvbiwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCBkaXJlY3Rpb24sIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlTGVmdChhLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZVJpZ2h0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlUmlnaHQoYSwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1ha2VVbmlxdWU6IGZ1bmN0aW9uIG1ha2VVbmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5tYWtlVW5pcXVlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS51bmlxdWUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmFzY2VuZGluZyhhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRlc2NlbmRpbmc6IGZ1bmN0aW9uIGRlc2NlbmRpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kZXNjZW5kaW5nKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBudW1iZXI6IHtcblxuICAgICAgICAgICAgICAgIHRvOiBmdW5jdGlvbiB0b18gKGspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzSW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMSkgaXNJbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzSW50ID8gbGlicy5udW1iZXIucmFuZG9tSW50SW5SYW5nZShuLCBrKSA6IGxpYnMubnVtYmVyLnJhbmRvbU51bWJlckluUmFuZ2Uobiwgayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaXNJbnQobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmYWN0b3JpYWw6IGZ1bmN0aW9uIGZhY3RvcmlhbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5mYWN0b3JpYWwobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjaG9vc2U6IGZ1bmN0aW9uIGNob29zZSAoaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2hvb3NlKG4sIGspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIucGFkKG4sIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzRnJvbTogZnVuY3Rpb24gZGF5c0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0Zyb206IGZ1bmN0aW9uIHNlY29uZHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tTm93OiBmdW5jdGlvbiBzZWNvbmRzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHllYXJzRnJvbTogZnVuY3Rpb24geWVhcnNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tOiBmdW5jdGlvbiBtb250aHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbU5vdzogZnVuY3Rpb24gbW9udGhzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaG91cnNGcm9tOiBmdW5jdGlvbiBob3Vyc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbU5vdzogZnVuY3Rpb24gbWludXRlc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNBZ286IGZ1bmN0aW9uIG1vbnRoc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzQWdvOiBmdW5jdGlvbiBkYXlzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzQWdvOiBmdW5jdGlvbiBzZWNvbmRzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzQWdvOiBmdW5jdGlvbiBtaW51dGVzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jbG9ja1RpbWUobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW5oZXJpdHM6IGZ1bmN0aW9uIGluaGVyaXRzIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmZ1bmN0aW9uLmluaGVyaXRzKG8sIHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgICAgICBoaXN0b2dyYW06IGZ1bmN0aW9uIGhpc3RvZ3JhbSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5oaXN0b2dyYW0obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjb3B5OiBmdW5jdGlvbiBjb3B5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBlYWNoOiBmdW5jdGlvbiBlYWNoIChzdGFydCwgZW5kLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZWFjaChvLCBzdGFydCwgZW5kLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBvY2N1cnJlbmNlc09mOiBmdW5jdGlvbiBvY2N1cnJlbmNlc09mICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5vY2N1cnJlbmNlc09mKG8sIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAga2V5czogZnVuY3Rpb24ga2V5cyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5rZXlzKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2l6ZTogZnVuY3Rpb24gc2l6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5zaXplKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNOdW1lcmljOiBmdW5jdGlvbiBpc051bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNOdW1lcmljKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZ2V0TnVtZXJpYzogZnVuY3Rpb24gZ2V0TnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5nZXROdW1lcmljKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNFbXB0eTogZnVuY3Rpb24gaXNFbXB0eSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0VtcHR5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNBcnJheTogZnVuY3Rpb24gaXNBcnJheSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0FycmF5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNQdXJlT2JqZWN0OiBmdW5jdGlvbiBpc1B1cmVPYmplY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNQdXJlT2JqZWN0KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uIGlzU3RyaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzU3RyaW5nKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uIGlzVW5kZWZpbmVkICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzVW5kZWZpbmVkKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiBpc051bGwgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNOdWxsKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNCb29sZWFuOiBmdW5jdGlvbiBpc0Jvb2xlYW4gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNCb29sZWFuKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gaXNGdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0Z1bmN0aW9uKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNBcmd1bWVudHM6IGZ1bmN0aW9uIGlzQXJndW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9OdW1iZXI6IGZ1bmN0aW9uIHRvTnVtYmVyICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvTnVtYmVyKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9JbnQ6IGZ1bmN0aW9uIHRvSW50ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvSW50KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9BcnJheTogZnVuY3Rpb24gdG9BcnJheSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC50b0FycmF5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZ2V0Q2FsbGJhY2s6IGZ1bmN0aW9uIGdldENhbGxiYWNrICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldENhbGxiYWNrKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmFuZG9tOiBmdW5jdGlvbiByYW5kb20gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QucmFuZG9tKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFueTogZnVuY3Rpb24gYW55IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5hbnkobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmaXJzdDogZnVuY3Rpb24gZmlyc3QgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmZpcnN0KG8sIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24gbGFzdCAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubGFzdChvLCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZpbmRDaGlsZEF0UGF0aDogZnVuY3Rpb24gZmluZENoaWxkQXRQYXRoIChwYXRoLCBkZWxpbWl0ZXIsIGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmZpbmRDaGlsZEF0UGF0aChvLCBwYXRoLCBkZWxpbWl0ZXIsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIGNsb25lICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmNsb25lKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgb25seTogZnVuY3Rpb24gb25seSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qub25seS5hcHBseShvLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbiB3aGVyZSAocHJlZGljYXRlRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LndoZXJlKG8sIHByZWRpY2F0ZUZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdoZXJlS2V5czogZnVuY3Rpb24gd2hlcmVLZXlzIChwcmVkaWNhdGVGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qud2hlcmVLZXlzKG8sIHByZWRpY2F0ZUZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludmVydDogZnVuY3Rpb24gaW52ZXJ0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1heDogZnVuY3Rpb24gbWF4IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5tYXgobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW46IGZ1bmN0aW9uIG1pbiAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubWluKG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50czogZnVuY3Rpb24gX2ltcGxlbWVudHMgKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW1wbGVtZW50cyhvLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50c093bjogZnVuY3Rpb24gaW1wbGVtZW50c093biAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pbXBsZW1lbnRzT3duKG8sIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgICAgICAgYWR2YW5jZURheXM6IGZ1bmN0aW9uIGFkdmFuY2VEYXlzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFkdmFuY2VEYXlzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZHZhbmNlTW9udGhzOiBmdW5jdGlvbiBhZHZhbmNlTW9udGhzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFkdmFuY2VNb250aHMoZCwgbiwgYWRqdXN0Rm9yV2Vla2VkKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFkdmFuY2VZZWFyczogZnVuY3Rpb24gYWR2YW5jZVllYXJzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFkdmFuY2VZZWFycyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeXltbWRkOiBmdW5jdGlvbiB5eW1tZGQgKGRlbGltKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC55eW1tZGQoZCwgZGVsaW0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY2xvY2tUaW1lKGQsICEhb21pdE1TKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbGlicDtcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsaWJwO1xufSgpKTtcbiIsImZ1bmN0aW9uIGxpYnMgKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgSVNfQlJPV1NFUiA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnLFxuICAgICAgICBIQVNfT1MgICAgID0gSVNfQlJPV1NFUiA/IGZhbHNlIDogdHlwZW9mIHJlcXVpcmUoJ29zJykgPT09ICdvYmplY3QnO1xuXG4gICAgLyoqXG4gICAgICogQWx0ZXJzIEZpcmVmb3gncyBGdW5jdGlvbi50b1N0cmluZygpIHJlc3VsdHMgdG8gbWF0Y2ggQ2hyb21lL1NhZmFyaS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmdW5jdGlvbi5cbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBhbHRlcmVkIHN0cmluZywgd2l0aCBuZXdsaW5lcyByZXBsYWNlZCBhbmQgJ3VzZSBzdHJpY3QnIHJlbW92ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nIChzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoLyg/Olxccik/XFxuKy9nLCAnJykucmVwbGFjZSgvXCJ1c2Ugc3RyaWN0XCI7fCd1c2Ugc3RyaWN0JzsvZywgJycpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIElFIGRvZXNuJ3QgYWxsb3cgT2JqZWN0LmtleXMgb24gcHJpbWl0aXZlIHR5cGVzLi4uXG4gICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nfE51bWJlcj59XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0S2V5cyAobykge1xuICAgICAgICBzd2l0Y2godHlwZW9mIG8pIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG8gPyBPYmplY3Qua2V5cyhvKSA6IFtdO1xuXG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG8ubGVuZ3RoOyBpKyspIGtleXMucHVzaChpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBrZXlzO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBOVUxMX0ZVTkNUSU9OID0gZnVuY3Rpb24gRU1QVFlfQ0FMTEJBQ0tfUkVQTEFDRU1FTlQgKCkge307XG5cbiAgICB2YXIgbGlicyA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RyaW5nIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBzdHJpbmc6IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDYW1lbGl6ZXMgYWxsIG9mIHRoZSBwcm92aWRlZCBzdHJpbmcgYXJndW1lbnRzLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHN0cmluZyBBIGxpc3Qgb2Ygc3RyaW5ncyB0byBjYW1lbGl6ZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PFN0cmluZz59IEFuIGFycmF5IG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMsIHdpdGggYWxsIHN0cmluZ3MgY2FtZWxpemVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjYW1lbGl6ZTogZnVuY3Rpb24gY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzID09PSAnZnVuY3Rpb24nKSBzID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzID0gcy50b1N0cmluZygpLnJlcGxhY2UoL1teYS16MC05JF0vZ2ksICdfJykucmVwbGFjZSgvXFwkKFxcdykvZywgJyRfJDEnKS5zcGxpdCgvW1xcc19dKy9nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gocywgMSwgcy5sZW5ndGgsIGZ1bmN0aW9uIChpLCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trXSA9IGxpYnMuc3RyaW5nLnVjRmlyc3QoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMgPSBsaWJzLnN0cmluZy5sY0ZpcnN0KHMuam9pbignJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQubGVuZ3RoID09PSAxID8gcmV0WzBdIDogcmV0O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWNhbWVsaXplcyBhbGwgb2YgdGhlIHByb3ZpZGVkIHN0cmluZyBhcmd1bWVudHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLlN0cmluZ30gc3RyaW5nIEEgbGlzdCBvZiBzdHJpbmdzIHRvIGRlY2FtZWxpemUuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmc+fSBBbiBhcnJheSBvZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzLCB3aXRoIGFsbCBzdHJpbmdzIGRlY2FtZWxpemVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkZWNhbWVsaXplOiBmdW5jdGlvbiBkZWNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICBpZihzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgcyA9PT0gJ2Z1bmN0aW9uJykgcyA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcyA9IHMudG9TdHJpbmcoKS5yZXBsYWNlKC8oW0EtWiRdKS9nLCBmdW5jdGlvbiAoJCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnICcgKyAodHlwZW9mICQgPT09ICdzdHJpbmcnID8gJC50b0xvd2VyQ2FzZSgpIDogJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2godHlwZW9mIHMgPT09ICdzdHJpbmcnID8gcy50cmltKCkgOiBzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0Lmxlbmd0aCA9PT0gMSA/IHJldFswXSA6IHJldDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhbGwgdGhlIGNoYXJhY3RlcnMgZm91bmQgaW4gb25lIHN0cmluZyBidXQgbm90IHRoZSBvdGhlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdGhlciBUaGUgc3RyaW5nIHRvIGNvbXB1dGUgdGhlIGRpZmZlcmVuY2UgYWdhaW5zdC5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQSBkaWZmZXJlbmNlIHN0cmluZy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlmZmVyZW5jZUZyb21TdHJpbmc6IGZ1bmN0aW9uIGRpZmZlcmVuY2VGcm9tU3RyaW5nIChzLCBvdGhlcikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvdGhlciAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHMgIT09ICdzdHJpbmcnKSByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB2YXIgc2FyciA9IHMuc3BsaXQoJycpLCBvYXJyID0gb3RoZXIuc3BsaXQoJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmRpZmZlcmVuY2VGcm9tQXJyYXkoc2Fyciwgb2Fycikuam9pbignJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlcGxhY2VzIHRva2VucyAoc25pcHBldHMgb2YgdGV4dCB3cmFwcGVkIGluIGJyYWNrZXRzKSB3aXRoIHRoZWlyIHZhbHVlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHRva2VuIHJlcGxhY2VkIHZhbHVlcy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVwbGFjZVRva2VuczogZnVuY3Rpb24gcmVwbGFjZVRva2VucyAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmdlbmVyaWMucmVwbGFjZVN0cmluZ1Rva2VucyhzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBvbmx5IHRoZSBjaGFyYWN0ZXJzIGNvbW1vbiB0byBib3RoIHN0cmluZ3NcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdGhlciBUaGUgc3RyaW5nIHRvIGNvbXB1dGUgdGhlIGludGVyc2VjdGlvbiBhZ2FpbnN0LlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgaW50ZXJzZWN0aW9uIGJldHdlZW4gdGhlIHR3byBzdHJpbmdzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnRlcnNlY3RTdHJpbmc6IGZ1bmN0aW9uIGludGVyc2VjdFN0cmluZyAocywgb3RoZXIpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3RoZXIgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzICE9PSAnc3RyaW5nJykgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgdmFyIHNhcnIgPSBzLnNwbGl0KCcnKSwgb2FyciA9IG90aGVyLnNwbGl0KCcnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5pbnRlcnNlY3RBcnJheShzYXJyLCBvYXJyKS5qb2luKCcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwZWF0IGEgc3RyaW5nICd0aW1lcycgdGltZXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gdGltZXMgVGhlIG51bWJlciBvZiB0aW1lcyB0byByZXBlYXQgdGhlIHN0cmluZ1xuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmVwZWF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXBlYXQ6IGZ1bmN0aW9uIHJlcGVhdCAocywgdGltZXMpIHtcbiAgICAgICAgICAgICAgICB0aW1lcyA9IHBhcnNlSW50KHRpbWVzLCAxMCk7XG4gICAgICAgICAgICAgICAgdGltZXMgPSBpc05hTih0aW1lcykgfHwgIWlzRmluaXRlKHRpbWVzKSB8fCB0aW1lcyA8PSAwID8gMSA6IHRpbWVzO1xuXG4gICAgICAgICAgICAgICAgdmFyIG9zID0gcztcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgdGltZXM7IGkrKykgcyArPSBvcztcbiAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmlnaHQgdHJpbXMgYSBzdHJpbmcuIFNhbWUgYXMgU3RyaW5nLnRyaW0sIGJ1dCBvbmx5IGZvciB0aGUgZW5kIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFt3aGF0PSdcXFxccysnXSBXaGF0IHRvIHRyaW0uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByaWdodCB0cmltbWVkIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBydHJpbTogZnVuY3Rpb24gcnRyaW0gKHMsIHdoYXQpIHtcbiAgICAgICAgICAgICAgICB3aGF0ID0gdHlwZW9mIHdoYXQgPT09ICdzdHJpbmcnID8gd2hhdCA6ICdcXFxccysnO1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UobmV3IFJlZ0V4cCh3aGF0ICsgJyQnKSwgJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBMZWZ0IHRyaW1zIGEgc3RyaW5nLiBTYW1lIGFzIFN0cmluZy50cmltLCBidXQgb25seSBmb3IgdGhlIGJlZ2lubmluZyBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbd2hhdD0nXFxcXHMrJ10gV2hhdCB0byB0cmltLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgbGVmdCB0cmltbWVkIHN0cmluZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBsdHJpbTogZnVuY3Rpb24gbHRyaW0gKHMsIHdoYXQpIHtcbiAgICAgICAgICAgICAgICB3aGF0ID0gdHlwZW9mIHdoYXQgPT09ICdzdHJpbmcnID8gd2hhdCA6ICdcXFxccysnO1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyB3aGF0KSwgJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFc2NhcGVzIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBIVE1MIGVzY2FwZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGh0bWxFbmNvZGU6IGZ1bmN0aW9uIGh0bWxFbmNvZGUgKHMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFwID0ge1xuICAgICAgICAgICAgICAgICAgICAnJicgIDogJyZhbXA7JyxcbiAgICAgICAgICAgICAgICAgICAgJzwnICA6ICcmbHQ7JyxcbiAgICAgICAgICAgICAgICAgICAgJz4nICA6ICcmZ3Q7JyxcbiAgICAgICAgICAgICAgICAgICAgJ1wiJyAgOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgICAgICAgICAgJ1xcJycgOiAnJiMwMzk7J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWyY8PlwiJ10vZywgZnVuY3Rpb24gKG0pIHsgcmV0dXJuIG1hcFttXTsgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFVuLWVzY2FwZXMgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIEhUTUwgZXNjYXBlZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaHRtbERlY29kZTogZnVuY3Rpb24gaHRtbERlY29kZSAocykge1xuICAgICAgICAgICAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgICAgICAgICAgICAgICcmYW1wOycgIDogJyYnLFxuICAgICAgICAgICAgICAgICAgICAnJmx0OycgICA6ICc8JyxcbiAgICAgICAgICAgICAgICAgICAgJyZndDsnICAgOiAnPicsXG4gICAgICAgICAgICAgICAgICAgICcmcXVvdDsnIDogJ1wiJyxcbiAgICAgICAgICAgICAgICAgICAgJyYjMDM5OycgOiAnXFwnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKCZhbXA7fCZsdDt8Jmd0O3wmcXVvdDt8JiMwMzk7KS9nLCBmdW5jdGlvbiAobSkgeyByZXR1cm4gbWFwW21dOyB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhbiAnZXZhbCcgc2FmZSBzdHJpbmcsIGJ5IGFkZGluZyBzbGFzaGVzIHRvIFwiLCAnLCBcXHQsIFxcbiwgXFxmLCBcXHIsIGFuZCB0aGUgTlVMTCBieXRlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIHN0cmluZyB3aXRoIHNsYXNoZXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWRkU2xhc2hlczogZnVuY3Rpb24gYWRkU2xhc2hlcyAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1tcXFxcXCInXFx0XFxuXFxmXFxyXS9nLCAnXFxcXCQmJykucmVwbGFjZSgvXFx1MDAwMC9nLCAnXFxcXDAnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgY2FwaXRhbGl6ZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIHVwcGVyIGNhc2VkLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVjRmlyc3Q6IGZ1bmN0aW9uIHVjRmlyc3QgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGxvd2VyY2FzZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGxvd2VyIGNhc2VkLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGxjRmlyc3Q6IGZ1bmN0aW9uIGxjRmlyc3QgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIHMuc2xpY2UoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgaW4gVGl0bGUgQ2FzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHRpdGxlIGNhc2VkIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uIHRpdGxlQ2FzZSAocykge1xuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHMuc3BsaXQoJyAnKSwgZnVuY3Rpb24gKHQpIHsgYXJyLnB1c2gobGlicy5zdHJpbmcudWNGaXJzdCh0KSk7IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhcnIuam9pbignICcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTcGxpY2VzIGEgc3RyaW5nLCBtdWNoIGxpa2UgYW4gYXJyYXkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXggVGhlIGluZGV4IHRvIGJlZ2luIHNwbGljaW5nIHRoZSBzdHJpbmcgYXRcbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8gZGVsZXRlXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWRkIFRoZSBzdHJpbmcgdG8gYXBwZW5kIGF0IHRoZSBzcGxpY2VkIHNlY3Rpb25cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHNwbGljZWQgc3RyaW5nLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNwbGljZTogZnVuY3Rpb24gc3BsaWNlIChzLCBpbmRleCwgY291bnQsIGFkZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnNsaWNlKDAsIGluZGV4KSArIChhZGQgfHwgJycpICsgcy5zbGljZShpbmRleCArIGNvdW50KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJuIGEgdHJ1bmNhdGVkIHN0cmluZyB3aXRoIGVsbGlwc2VzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBsZW5ndGggVGhlIGxlbmd0aCBvZiB0aGUgZGVzaXJlZCBzdHJpbmcuIElmIG9tbWl0ZWQsIHRoZSBzdHJpbmdzIG9yaWdpbmFsIGxlbmd0aCB3aWxsIGJlIHVzZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtwbGFjZT0nYmFjayddIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2Zyb250JyBhbmQgJ2JhY2snLiBTcGVjaWZ5aW5nICdmcm9udCcgd2lsbCB0cnVuY2F0ZSB0aGVcbiAgICAgICAgICAgICAqIHN0cmluZyBhbmQgYWRkIGVsbGlwc2VzIHRvIHRoZSBmcm9udCwgJ2JhY2snIChvciBhbnkgb3RoZXIgdmFsdWUpIHdpbGwgYWRkIHRoZSBlbGxpcHNlcyB0byB0aGUgYmFjay5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2VsbGlwc2VzPScuLi4nXSBUaGUgc3RyaW5nIHZhbHVlIG9mIHRoZSBlbGxpcHNlcy4gVXNlIHRoaXMgdG8gYWRkIGFueXRoaW5nIG90aGVyIHRoYW4gJy4uLidcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEEgdHJ1bmNhdGVkIHN0cmluZyB3aXRoIGVsbGlwc2VzIChpZiBpdHMgbGVuZ3RoIGlzIGdyZWF0ZXIgdGhhbiAnbGVuZ3RoJylcbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbGxpcHNlczogZnVuY3Rpb24gZWxsaXBzZXNfIChzLCBsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcykge1xuICAgICAgICAgICAgICAgIGlmKGlzTmFOKHBhcnNlSW50KGxlbmd0aCwgMTApKSkgbGVuZ3RoID0gcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYobGVuZ3RoIDwgMCB8fCAhaXNGaW5pdGUobGVuZ3RoKSkgbGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgICAgIGVsbGlwc2VzID0gdHlwZW9mIGVsbGlwc2VzID09PSAnc3RyaW5nJyA/IGVsbGlwc2VzIDogJy4uLic7XG4gICAgICAgICAgICAgICAgaWYocy5sZW5ndGggPD0gbGVuZ3RoKSByZXR1cm4gcztcblxuICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8PSBlbGxpcHNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VzLnN1YnN0cmluZygwLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKCFwbGFjZSB8fCBwbGFjZSAhPT0gJ2Zyb250Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoMCwgbGVuZ3RoIC0gZWxsaXBzZXMubGVuZ3RoKSArIGVsbGlwc2VzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VzICsgcy5zdWJzdHIoMCwgbGVuZ3RoIC0gZWxsaXBzZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNodWZmbGVzIGEgc3RyaW5nXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3BsaXR0ZXIgQSBzdHJpbmcgdXNlZCB0byBzcGxpdCB0aGUgc3RyaW5nLCB0byB0b2tlbml6ZSBpdCBiZWZvcmUgc2h1ZmZsaW5nLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgbWl4ZWQgdXAgc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChzLCBzcGxpdHRlcikge1xuICAgICAgICAgICAgICAgIHZhciBhID0gcy5zcGxpdCh0eXBlb2Ygc3BsaXR0ZXIgPT09ICdzdHJpbmcnID8gc3BsaXR0ZXIgOiAnJyksIG4gPSBhLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXBsYWNlU3BsaXRzID0gbiAtIDE7XG5cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBuIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gYVtpXTtcblxuICAgICAgICAgICAgICAgICAgICBhW2ldID0gYVtqXTtcbiAgICAgICAgICAgICAgICAgICAgYVtqXSA9IHRtcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgcmVwbGFjZVNwbGl0czsgaysrKSBhLnNwbGljZShsaWJzLm51bWJlci5yYW5kb21JbnRJblJhbmdlKDAsIGEubGVuZ3RoKSwgMCwgc3BsaXR0ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmpvaW4oJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXZlcnNlcyBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJldmVyc2VkIHN0cmluZy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gcmV2ZXJzZSAocykge1xuICAgICAgICAgICAgICAgIGlmKHMubGVuZ3RoIDwgNjQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBzLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHN0ciArPSBzLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTdHJpcHMgdGhlIHRyYWlsaW5nIHNsYXNoZXMgZnJvbSBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIElmIHVzaW5nIE5vZGUuanMsIGl0IHdpbGwgcmVwbGFjZSB0aGUgdHJhaWxpbmcgc2xhc2ggYmFzZWQgb24gdGhlIHZhbHVlIG9mIG9zLnBsYXRmb3JtXG4gICAgICAgICAgICAgKiAoaS5lLiBpZiB3aW5kb3dzLCAnXFxcXCcgd2lsbCBiZSByZXBsYWNlZCwgJy8nIG90aGVyd2lzZSkuXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3aXRob3V0VHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aG91dFRyYWlsaW5nU2xhc2ggKHMpIHtcbiAgICAgICAgICAgICAgICBpZighSVNfQlJPV1NFUiAmJiBIQVNfT1MgJiYgcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykgcmV0dXJuIHMucmVwbGFjZSgvXFxcXCskLywgJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGQgYSB0cmFpbGluZyBzbGFzaCB0byBhIHN0cmluZywgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGhhdmUgb25lLlxuICAgICAgICAgICAgICogSWYgdXNpbmcgTm9kZS5qcywgaXQgd2lsbCByZXBsYWNlIHRoZSB0cmFpbGluZyBzbGFzaCBiYXNlZCBvbiB0aGUgdmFsdWUgb2Ygb3MucGxhdGZvcm1cbiAgICAgICAgICAgICAqIChpLmUuIGlmIHdpbmRvd3MsICdcXFxcJyB3aWxsIGJlIHJlcGxhY2VkLCAnLycgb3RoZXJ3aXNlKS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdpdGhUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRoVHJhaWxpbmdTbGFzaCAocykge1xuICAgICAgICAgICAgICAgIGlmKCFJU19CUk9XU0VSICYmIEhBU19PUyAmJiByZXF1aXJlKCdvcycpLnBsYXRmb3JtID09PSAnd2luMzInKSByZXR1cm4gbGlicy5zdHJpbmcud2l0aG91dFRyYWlsaW5nU2xhc2gocykgKyAnXFxcXCc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpICsgJy8nO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFc2NhcGVzIHJlZ3VsYXIgZXhwcmVzc2lvbiBzcGVjaWFsIGNoYXJhY3RlcnMuIFRoaXMgaXMgdXNlZnVsIGlzIHlvdSB3aXNoIHRvIGNyZWF0ZSBhIG5ldyByZWd1bGFyIGV4cHJlc3Npb25cbiAgICAgICAgICAgICAqIGZyb20gYSBzdG9yZWQgc3RyaW5nIHZhbHVlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiBzYWZlIHN0cmluZ1xuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlZ2V4cFNhZmU6IGZ1bmN0aW9uIHJlZ2V4cFNhZmUgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUGFkcyBhIHN0cmluZyB3aXRoICdkZWxpbScgY2hhcmFjdGVycyB0byB0aGUgc3BlY2lmaWVkIGxlbmd0aC4gSWYgdGhlIGxlbmd0aCBpcyBsZXNzIHRoYW4gdGhlIHN0cmluZyBsZW5ndGgsXG4gICAgICAgICAgICAgKiB0aGUgc3RyaW5nIHdpbGwgYmUgdHJ1bmNhdGVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCBUaGUgbGVuZ3RoIHRvIHBhZCB0aGUgc3RyaW5nIHRvLiBJZiBsZXNzIHRoYXQgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nLCB0aGUgc3RyaW5nIHdpbGxcbiAgICAgICAgICAgICAqIGJlIHJldHVybmVkLiBJZiBsZXNzIHRoYW4gdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nLCB0aGUgc3RyaW5nIHdpbGwgYmUgc2xpY2VkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZGVsaW09JyAnXSBUaGUgY2hhcmFjdGVyIHRvIHBhZCB0aGUgc3RyaW5nIHdpdGguXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbcHJlPWZhbHNlXSBJZiB0cnVlLCB0aGUgcGFkZGluZyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZywgb3RoZXJ3aXNlIHRoZSBwYWRkaW5nXG4gICAgICAgICAgICAgKiB3aWxsIGJlIGFkZGVkIHRvIHRoZSBlbmQuXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcGFkZGVkIHN0cmluZ1xuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChzLCBsZW5ndGgsIGRlbGltLCBwcmUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaSwgdGhpc0xlbmd0aCA9IHMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgaWYoIWRlbGltKSBkZWxpbSA9ICcgJztcbiAgICAgICAgICAgICAgICBpZihsZW5ndGggPT09IDApIHJldHVybiAnJzsgZWxzZSBpZihpc05hTihwYXJzZUludChsZW5ndGgsIDEwKSkpIHJldHVybiBzO1xuXG4gICAgICAgICAgICAgICAgbGVuZ3RoID0gcGFyc2VJbnQobGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICAgICAgaWYobGVuZ3RoIDwgdGhpc0xlbmd0aCkgcmV0dXJuICFwcmUgPyBzLnNsaWNlKDAsIGxlbmd0aCkgOiBzLnNsaWNlKC1sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYocHJlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGxlbmd0aCAtIHRoaXNMZW5ndGg7IGkrKykgcyA9IGRlbGltICsgcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGxlbmd0aCAtIHRoaXNMZW5ndGg7IGkrKykgcyArPSBkZWxpbTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlcGxhY2VzIG5ld2xpbmVzIHdpdGggYnIgdGFncy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIG5ld2xpbmVzIGNvbnZlcnRlZCB0byBiciB0YWdzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBuZXdsaW5lVG9CcmVhazogZnVuY3Rpb24gbmV3bGluZVRvQnJlYWsgKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oXFxyXFxufFxcbikvZywgJzxicj4nKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwbGFjZXMgdGFicyB3aXRoIGEgc3BhbiBlbGVtZW50IHdpdGggdGhlIGNsYXNzICd0YWInXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0YWJzIGNvbnZlcnRlZCB0byBzcGFucyB3aXRoIHRoZSBjbGFzcyAndGFiJ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0YWJzVG9TcGFuOiBmdW5jdGlvbiB0YWJzVG9TcGFuIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFx0L2csICc8c3BhbiBjbGFzcz1cInRhYlwiPjwvc3Bhbj4nKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRqdXN0cyBhIHN0cmluZyB0byBmaXQgd2l0aGluIHRoZSBjb25maW5lcyBvZiAnd2lkdGgnLCB3aXRob3V0IGJyZWFraW5nIHdvcmRzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbGVuZ3RoPTEyMF0gVGhlIGxlbmd0aCB0byB3b3JkIHdyYXAgdGhlIHN0cmluZyB0by5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3BhZGxlZnQ9MF0gVGhlIG51bWJlciBvZiBjb2x1bW5zIHRvIHBhZCB0aGUgc3RyaW5nIG9uIHRoZSBsZWZ0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtwYWRyaWdodD0wXSBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgdG8gcGFkIHRoZSBzdHJpbmcgb24gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBvbWl0Rmlyc3QgSWYgdHJ1ZSwgdGhlIGZpcnN0IGxpbmUgd2lsbCBub3QgYmUgcGFkZGVkIGxlZnRcbiAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyBhZGp1c3RlZCBhbmQgcGFkZGVkIGZvciB0aGUgc3Rkb3V0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdvcmRXcmFwVG9MZW5ndGg6IGZ1bmN0aW9uIHdvcmRXcmFwVG9MZW5ndGggKHMsIHdpZHRoLCBwYWRsZWZ0LCBwYWRyaWdodCwgb21pdEZpcnN0KSB7XG4gICAgICAgICAgICAgICAgaWYocGFkcmlnaHQgPT09IHVuZGVmaW5lZCAmJiBwYWRsZWZ0KSBwYWRyaWdodCA9IHBhZGxlZnQ7XG5cbiAgICAgICAgICAgICAgICBwYWRsZWZ0ICA9ICFpc05hTihwYXJzZUludChwYWRsZWZ0LCAgMTApKSA/IHBhcnNlSW50KHBhZGxlZnQsIDEwKSAgOiAwO1xuICAgICAgICAgICAgICAgIHBhZHJpZ2h0ID0gIWlzTmFOKHBhcnNlSW50KHBhZHJpZ2h0LCAxMCkpID8gcGFyc2VJbnQocGFkcmlnaHQsIDEwKSA6IDA7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFkZGluZ0xlZnQgPSAnJztcbiAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgcGFkbGVmdDsgIG4rKykgcGFkZGluZ0xlZnQgICs9ICcgJztcblxuICAgICAgICAgICAgICAgIHZhciBjb2xzICAgPSAhaXNOYU4ocGFyc2VJbnQod2lkdGgsIDEwKSkgPyBsZW5ndGggOiAxMjAsXG4gICAgICAgICAgICAgICAgICAgIGFyciAgICA9IHMuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgICAgICAgICAgaXRlbSAgID0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbGVuICAgID0gIW9taXRGaXJzdCA/IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQgOiBjb2xzIC0gcGFkcmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIHN0ciAgICA9ICFvbWl0Rmlyc3QgPyBwYWRkaW5nTGVmdCA6ICcnLFxuICAgICAgICAgICAgICAgICAgICBvbGVuICAgPSBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0O1xuXG4gICAgICAgICAgICAgICAgd2hpbGUoKGl0ZW0gPSBhcnIuc2hpZnQoKSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZihpdGVtLmxlbmd0aCA8IGxlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGl0ZW0gKyAnICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4gLT0gaXRlbS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoaXRlbS5sZW5ndGggPiBvbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gaXRlbS5zdWJzdHJpbmcoMCwgbGVuIC0gMSkgKyAnLVxcbicgKyBwYWRkaW5nTGVmdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyci51bnNoaWZ0KGl0ZW0uc3Vic3RyaW5nKGxlbiwgaXRlbS5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBjb2xzIC0gcGFkcmlnaHQgLSBwYWRsZWZ0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nICsgcGFkZGluZ0xlZnQgKyBpdGVtICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gY29scyAtIHBhZHJpZ2h0IC0gMSAtIHBhZGxlZnQgLSBpdGVtLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEYXRlIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICdkYXlzSW5UaGVGdXR1cmUnIGRheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGRheXNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIGRheXMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCBkYXlzLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFkdmFuY2VEYXlzOiBmdW5jdGlvbiBhZHZhbmNlRGF5cyAoZCwgZGF5c0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgZGF5c0luVGhlRnV0dXJlID0gZGF5c0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMoZGF5c0luVGhlRnV0dXJlKSA/IGRheXNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKGRheXNJblRoZUZ1dHVyZSAqIDg2NDAwMDAwKSk7XG5cbiAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ21vbnRoc0luVGhlRnV0dXJlJyBtb250aHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1vbnRoc0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgbW9udGhzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgbW9udGhzLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFkdmFuY2VNb250aHM6IGZ1bmN0aW9uIGFkdmFuY2VNb250aHMgKGQsIG1vbnRoc0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgbW9udGhzSW5UaGVGdXR1cmUgPSBtb250aHNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKG1vbnRoc0luVGhlRnV0dXJlKSA/IG1vbnRoc0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAobW9udGhzSW5UaGVGdXR1cmUgKiAyNjI5NzQ2MDAwKSk7XG5cbiAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ3llYXJzSW5UaGVGdXR1cmUnIHllYXJzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5ZWFyc0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgeWVhcnMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCB5ZWFycy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZHZhbmNlWWVhcnM6IGZ1bmN0aW9uIGFkdmFuY2VZZWFycyAoZCwgeWVhcnNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgIHllYXJzSW5UaGVGdXR1cmUgPSB5ZWFyc0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMoeWVhcnNJblRoZUZ1dHVyZSkgPyB5ZWFyc0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAoeWVhcnNJblRoZUZ1dHVyZSAqIDMxNTM2MDAwMDAwKSk7XG5cbiAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgZGF0ZSBpbiB0aGUgeXl5eS1tbS1kZCBmb3JtYXQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFtkZWxpbT0nLSddIFRoZSBkZWxpbWl0ZXIgdG8gdXNlZCB0aGUgc2VwYXJhdGUgdGhlIGRhdGUgY29tcG9uZW50cyAoZS5nLiAnLScgb3IgJy4nKVxuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGRhdGUgaW4gdGhlIHl5eXktbW0tZGQgZm9ybWF0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHl5eXltbWRkOiBmdW5jdGlvbiB5eXl5bW1kZCAoZCwgZGVsaW0pIHtcbiAgICAgICAgICAgICAgICBkZWxpbSA9IHR5cGVvZiBkZWxpbSAhPT0gJ3N0cmluZycgPyAnLScgOiBkZWxpbSA7XG5cbiAgICAgICAgICAgICAgICB2YXIgZGQgICA9IGQuZ2V0RGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICBtbSAgID0gZC5nZXRNb250aCgpICsgMSxcbiAgICAgICAgICAgICAgICAgICAgeXl5eSA9IGQuZ2V0RnVsbFllYXIoKTtcblxuICAgICAgICAgICAgICAgIGlmKGRkIDwgMTApIGRkID0gJzAnICsgZGQ7XG4gICAgICAgICAgICAgICAgaWYobW0gPCAxMCkgbW0gPSAnMCcgKyBtbTtcbiAgICAgICAgICAgICAgICByZXR1cm4geXl5eSArIGRlbGltICsgbW0gKyBkZWxpbSArIGRkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb252ZXJ0cyBhIGRhdGUgdG8gdGhlIEhIOk1NOlNTLk1TRUMgdGltZSBmb3JtYXRcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbb21pdE1TPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0byBpbmNsdWRlIHRoZSBNUyBwb3J0aW9uIG9mIHRoZSByZXR1cm5lZCBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBmb3JtYXR0ZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKGQsIG9taXRNUykge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jbG9ja1RpbWUoZC5nZXRUaW1lKCksICEhb21pdE1TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTnVtYmVyIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBudW1iZXI6IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBUaGUgbWluaW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1heCBUaGUgbWF4aW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByYW5kb21JbnRJblJhbmdlOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUludChtaW4sIDEwKTtcbiAgICAgICAgICAgICAgICBtYXggPSBwYXJzZUludChtYXgsIDEwKTtcblxuICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1pbikgJiYgIWlzRmluaXRlKG1pbikpIG1pbiA9IDA7XG4gICAgICAgICAgICAgICAgaWYoaXNOYU4obWF4KSAmJiAhaXNGaW5pdGUobWF4KSkgbWF4ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBmbG9hdCBpbiByYW5nZSBbbWluLCBtYXhdIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWluIFRoZSBtaW5pbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IEEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJhbmRvbU51bWJlckluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgIG1pbiA9IHBhcnNlSW50KG1pbiwgMTApO1xuICAgICAgICAgICAgICAgIG1heCA9IHBhcnNlSW50KG1heCwgMTApO1xuXG4gICAgICAgICAgICAgICAgaWYoaXNOYU4obWluKSAmJiAhaXNGaW5pdGUobWluKSkgbWluID0gMDtcbiAgICAgICAgICAgICAgICBpZihpc05hTihtYXgpICYmICFpc0Zpbml0ZShtYXgpKSBtYXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpICsgbWluO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZWN1cnNpdmVseSBjb21wdXRlcyB0aGUgZmFjdG9yaWFsIG9mIHRoZSBudW1iZXIgbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIEEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfEluZmluaXR5fSBuIVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmYWN0b3JpYWw6IGZ1bmN0aW9uIGZhY3RvcmlhbCAobikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuIDwgMCkgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgICAgICBpZihuID4gMTcwKSByZXR1cm4gSW5maW5pdHk7XG4gICAgICAgICAgICAgICAgaWYobiA9PT0gMCB8fCBuID09PSAxKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbiAqIGZhY3RvcmlhbChuIC0gMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERldGVybWluZXMgaXMgdGhlIGdpdmVuIG51bWJlcnMgYXJlIGludGVnZXJzXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk51bWJlcn0gbiBOdW1iZXJzLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiBhbGwgYXJndW1lbnRzIGFyZSBpbnRlZ2VycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgbiA9PT0gJ251bWJlcicgJiYgbiAlIDEgPT09IDAgJiYgbi50b1N0cmluZygpLmluZGV4T2YoJy4nKSA9PT0gLTE7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlY3Vyc2l2ZWx5IGNvbXB1dGVzIG4gY2hvb3NlIGsuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBBIG51bWJlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBrIEEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfEluZmluaXR5fSBuIGNob29zZSBrLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjaG9vc2U6IGZ1bmN0aW9uIGNob29zZSAobiwgaykge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCB0eXBlb2YgayAhPT0gJ251bWJlcicpIHJldHVybiBOYU47XG4gICAgICAgICAgICAgICAgaWYoayA9PT0gMCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChuICogY2hvb3NlKG4gLSAxLCBrIC0gMSkpIC8gaztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUGFkcyBhIG51bWJlciB3aXRoIHByZWNlZWRpbmcgemVyb3MuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCBUaGUgZmluYWwgbGVuZ3RoIG9mIHRoZSBzdHJpbmdcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwYWRkZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKG4sIGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5wYWQobi50b1N0cmluZygpLCBsZW5ndGgsICcwJywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRheXNGcm9tOiBmdW5jdGlvbiBkYXlzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXlzRnJvbU5vdzogZnVuY3Rpb24gZGF5c0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlY29uZHNGcm9tOiBmdW5jdGlvbiBzZWNvbmRzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldFNlY29uZHMoZGF0ZS5nZXRTZWNvbmRzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWNvbmRzRnJvbU5vdzogZnVuY3Rpb24gc2Vjb25kc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgeWVhcnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB5ZWFyc0Zyb206IGZ1bmN0aW9uIHllYXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgeWVhcnMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHllYXJzRnJvbU5vdzogZnVuY3Rpb24geWVhcnNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtb250aHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtb250aHNGcm9tOiBmdW5jdGlvbiBtb250aHNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtb250aHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtb250aHNGcm9tTm93OiBmdW5jdGlvbiBtb250aHNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1vbnRoc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgaG91cnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBob3Vyc0Zyb206IGZ1bmN0aW9uIGhvdXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICBkYXRlLnNldEhvdXJzKGRhdGUuZ2V0SG91cnMoKSArIG4pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgaG91cnMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBob3Vyc0Zyb21Ob3c6IGZ1bmN0aW9uIGhvdXJzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbWludXRlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW51dGVzRnJvbTogZnVuY3Rpb24gbWludXRlc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgZGF0ZS5zZXRNaW51dGVzKGRhdGUuZ2V0TWludXRlcygpICsgbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtaW51dGVzLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW51dGVzRnJvbU5vdzogZnVuY3Rpb24gbWludXRlc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0aW1lLCBtb250aHMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbW9udGhzQWdvOiBmdW5jdGlvbiBtb250aHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGltZSwgZGF5cyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXlzQWdvOiBmdW5jdGlvbiBkYXlzQWdvIChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRpbWUsIHNlY29uZHMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2Vjb25kc0FnbzogZnVuY3Rpb24gc2Vjb25kc0FnbyAobikge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSB0aW1lLCBtaW51dGVzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbnV0ZXNBZ286IGZ1bmN0aW9uIG1pbnV0ZXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGltZSwgeWVhcnMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgeWVhcnNBZ286IGZ1bmN0aW9uIHllYXJzQWdvIChuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnRzIGEgbnVtYmVyIHRvIHRoZSBISDpNTTpTUy5NU0VDIHRpbWUgZm9ybWF0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gdCBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQG1lbWJlcm9mIE51bWJlci5wcm90b3R5cGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtvbWl0TVM9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgdGhlIE1TIHBvcnRpb24gb2YgdGhlIHJldHVybmVkIHN0cmluZ1xuICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGZvcm1hdHRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAodCwgb21pdE1TKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1zLCBzZWNzLCBtaW5zLCBocnM7XG5cbiAgICAgICAgICAgICAgICBtcyA9IHQgJSAxMDAwO1xuICAgICAgICAgICAgICAgIHQgPSAodCAtIG1zKSAvIDEwMDA7XG5cbiAgICAgICAgICAgICAgICBzZWNzID0gdCAlIDYwO1xuICAgICAgICAgICAgICAgIHQgPSAodCAtIHNlY3MpIC8gNjA7XG5cbiAgICAgICAgICAgICAgICBtaW5zID0gdCAlIDYwO1xuICAgICAgICAgICAgICAgIGhycyA9ICh0IC0gbWlucykgLyA2MDtcblxuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5wYWQoaHJzLnRvU3RyaW5nKCksIDIpICArICc6JyArIGxpYnMubnVtYmVyLnBhZChtaW5zLnRvU3RyaW5nKCksIDIpICsgJzonICtcbiAgICAgICAgICAgICAgICAgICAgICAgbGlicy5udW1iZXIucGFkKHNlY3MudG9TdHJpbmcoKSwgMikgKyAoKG9taXRNUyA9PT0gdHJ1ZSkgPyAnJyA6ICcuJyArIGxpYnMubnVtYmVyLnBhZChtcy50b1N0cmluZygpLCAzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZ1bmN0aW9uIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbjoge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yIFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBzdXBlckNvbnN0cnVjdG9yIFRoZSBwYXJlbnQgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgaW5oZXJpdGluZyBjb25zdHJ1Y3RvclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbmhlcml0czogZnVuY3Rpb24gaW5oZXJpdHMgKGNvbnN0cnVjdG9yLCBzdXBlckNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQgfHwgY29uc3RydWN0b3IgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0IG5vdCBiZSAnICsgJ251bGwgb3IgdW5kZWZpbmVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc3VwZXJDb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkIHx8IHN1cGVyQ29uc3RydWN0b3IgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHN1cGVyIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0IG5vdCAnICsgJ2JlIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgc3VwZXIgY29uc3RydWN0b3IgdG8gXCJpbmhlcml0c1wiIG11c3QgJyArICdoYXZlIGEgcHJvdG90eXBlJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvci5zdXBlcl8gPSBzdXBlckNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihjb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBcnJheSBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgYXJyYXk6IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTaHVmZmxlcyBhbiBhcnJheVxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIG1peGVkIHVwIGFycmF5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKGEpIHtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBhLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKSwgdG1wID0gYVtpXTtcbiAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGFbal07XG4gICAgICAgICAgICAgICAgICAgIGFbal0gPSB0bXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb21wdXRlcyB0aGUgdW5pb24gYmV0d2VlbiB0aGUgY3VycmVudCBhcnJheSwgYW5kIGFsbCB0aGUgYXJyYXkgb2JqZWN0cyBwYXNzZWQgaW4uIFRoYXQgaXMsXG4gICAgICAgICAgICAgKiB0aGUgc2V0IG9mIHVuaXF1ZSBvYmplY3RzIHByZXNlbnQgaW4gYWxsIG9mIHRoZSBhcnJheXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGFyciBBIGxpc3Qgb2YgYXJyYXkgb2JqZWN0c1xuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSB1bmlvbiBzZXQgb2YgdGhlIHByb3ZpZGVkIGFycmF5cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdW5pb246IGZ1bmN0aW9uIHVuaW9uIChhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC5vbmx5KGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSwgJ2FycmF5Jyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdW5pb24gPSBbXTtcbiAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhcmdzLCBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhcnJheSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHVuaW9uLmluZGV4T2YoaXRlbSkgPT09IC0xKSB1bmlvbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5pb247XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYWxsIHRoZSBpdGVtcyB1bmlxdWUgdG8gYWxsIGFycmF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGFycmF5cyBUaGUgQXJyYXkgb2JqZWN0cyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gb3RoZXIgVGhlIGFycmF5IHRvIGNvbXB1dGUgdGhlIGRpZmZlcmVuY2UgZnJvbS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIGl0ZW1zIHVuaXF1ZSB0byBlYWNoIGFycmF5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaWZmZXJlbmNlOiBmdW5jdGlvbiBkaWZmZXJlbmNlICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXlzID0gbGlicy5vYmplY3Qub25seShsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksICdhcnJheScpO1xuXG4gICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDEpIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1swXSk7XG4gICAgICAgICAgICAgICAgdmFyIGksIHNpbXBsZURpZmYgPSBbXTtcblxuICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgYXJyYXlzWzBdLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzWzFdLmluZGV4T2YoYXJyYXlzWzBdW2ldKSA9PT0gLTEpIHNpbXBsZURpZmYucHVzaChhcnJheXNbMF1baV0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGFycmF5c1sxXS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFycmF5c1swXS5pbmRleE9mKGFycmF5c1sxXVtpXSkgPT09IC0xKSBzaW1wbGVEaWZmLnB1c2goYXJyYXlzWzFdW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2ltcGxlRGlmZjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IGFycmF5c1swXSwgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgZm9yKGkgPSAxOyBpIDwgYXJyYXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBkaWZmZXJlbmNlLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcnJheXNbaV0uaW5kZXhPZihkaWZmZXJlbmNlW25dKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUucHVzaChkaWZmZXJlbmNlW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgYXJyYXlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2lmKGFycmF5c1tpXSAhPT0gYXJyYXlzKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRpZmZlcmVuY2UgPSBpbnRlcm1lZGlhdGU7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBkaWZmZXJlbmNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBpdGVtcyBjb21tb24gdG8gYWxsIGFycmF5cy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGl0ZW1zIFRoZSBhcnJheXMgZnJvbSB3aGljaCB0byBjb21wdXRlIHRoZSBpbnRlcnNlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheX0gQSBuZXcgYXJyYXkgd2l0aCBpdGVtcyBjb21tb24gdG8gYm90aCBhcnJheXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGludGVyc2VjdDogZnVuY3Rpb24gaW50ZXJzZWN0ICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXlzID0gbGlicy5vYmplY3Qub25seShsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksICdhcnJheScpO1xuXG4gICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDEpIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1swXSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgaW50ZXJzZWN0aW9uID0gYXJyYXlzWzBdLCBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgYXJyYXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBpbnRlcnNlY3Rpb24ubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFycmF5c1tpXS5pbmRleE9mKGludGVyc2VjdGlvbltuXSkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZS5wdXNoKGludGVyc2VjdGlvbltuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IGFycmF5c1tpXS5pbmRleE9mKGludGVyc2VjdGlvbltuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXlzW2ldLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGludGVyc2VjdGlvbiA9IGludGVybWVkaWF0ZTtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBhcnJheSBmcm9tIHRoZSBjdXJyZW50IG9uZSwgd2l0aCBhbGwgb2NjdXJlbmNlcyBvZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIG9tbWl0ZWQuPGJyPlxuICAgICAgICAgICAgICogRm9yIGV4YW1wbGU6IDxlbT5bMSwyLDMsNCw1XS53aXRob3V0KDEpPC9lbT4gd2lsbCByZXR1cm4gPGVtPlsyLDMsNCw1XTwvZW0+XG4gICAgICAgICAgICAgKiBhbmQgPGVtPlsxLCBudWxsLCAyLCBudWxsLCB1bmRlZmluZWRdLndpdGhvdXQobnVsbCwgdW5kZWZpbmVkKTwvZW0+IHdpbGwgcmV0dXJuIDxlbT5bMSwgMl08L2VtPlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8Kj59IEEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHMgb21taXRlZC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3aXRob3V0OiBmdW5jdGlvbiB3aXRob3V0ICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgYSAgICA9IGFyZ3Muc2hpZnQoKSxcbiAgICAgICAgICAgICAgICAgICAgcmVzICA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhLCBmdW5jdGlvbiAodikgeyBpZihhcmdzLmluZGV4T2YodikgPT09IC0xKSByZXMucHVzaCh2KTsgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRlcyB0aGUgYXJyYXkgbGVmdCBvciByaWdodCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB0aW1lcy4gSWYgdGhlIGRpcmVjdGlvbiBpcyBsZWZ0LCBpdCB3aWxsIHNoaWZ0IG9mZiB0aGVcbiAgICAgICAgICAgICAqIGZpcnN0IDxlbT5uPC9lbT4gZWxlbWVudHMgYW5kIHB1c2ggdGhlbSB0byB0aGUgZW5kIG9mIHRoZSBhcnJheS4gSWYgcmlnaHQsIGl0IHdpbGwgcG9wIG9mZiB0aGUgbGFzdCA8ZW0+bjwvZW0+XG4gICAgICAgICAgICAgKiBpdGVtcyBhbmQgdW5zaGlmdCB0aGVtIG9udG8gdGhlIGZyb250IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZGlyZWN0aW9uPSdsZWZ0J10gVGhlIGRpcmVjdGlvbiB0byByb3RhdGUgYXJyYXkgbWVtYmVycy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHNoaWZ0XG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHNoaWZ0ZWQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcm90YXRlOiBmdW5jdGlvbiByb3RhdGUgKGEsIGRpcmVjdGlvbiwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICYmIGxpYnMub2JqZWN0LmlzTnVtZXJpYyhkaXJlY3Rpb24pICYmICFhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgYW1vdW50ICAgID0gZGlyZWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoIWFtb3VudCB8fCAoYW1vdW50ICYmICFsaWJzLm9iamVjdC5pc051bWVyaWMoYW1vdW50KSkpIGFtb3VudCA9IDE7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGFtb3VudDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGRpcmVjdGlvbiAhPT0gJ3JpZ2h0JykgYS5wdXNoKGEuc2hpZnQoKSk7IGVsc2UgYS51bnNoaWZ0KGEucG9wKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRlcyB0aGUgYXJyYXkgbGVmdCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB0aW1lcy5cbiAgICAgICAgICAgICAqIFRoaXMgaXMgdXNlZnVsIGlmIHRyeWluZyB0byBjcmVhdGUgYSBjaXJjdWxhciBxdWV1ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbYW1vdW50PTFdIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcm90YXRlIHRoZSBhcnJheSBsZWZ0LlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCByb3RhdGVkIGxlZnQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcm90YXRlTGVmdDogZnVuY3Rpb24gcm90YXRlTGVmdCAoYSwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsICdsZWZ0JywgYW1vdW50KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUm90YXRlcyB0aGUgYXJyYXkgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIHVzZWZ1bCBpZiB0cnlpbmcgdG8gY3JlYXRlIGEgY2lyY3VsYXIgcXVldWUuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgcm90YXRlZCByaWdodC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByb3RhdGVSaWdodDogZnVuY3Rpb24gcm90YXRlTGVmdCAoYSwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsICdyaWdodCcsIGFtb3VudCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbW92ZXMgZHVwbGljYXRlcyBmcm9tIHRoZSBjdXJyZW50IGFycmF5LlxuICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgd2l0aCBkdXBsaWNhdGVzIHJlbW92ZWQuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWFrZVVuaXF1ZTogZnVuY3Rpb24gbWFrZVVuaXF1ZSAoYSkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpdGVkID0gW107XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodmlzaXRlZC5pbmRleE9mKGFbaV0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRlZC5wdXNoKGFbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07IC8vIFNwbGljZSB3aWxsIGFmZmVjdCB0aGUgaW50ZXJuYWwgYXJyYXkgcG9pbnRlciwgc28gZml4IGl0Li4uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldHMgYW4gYXJyYXkgb2YgdW5pcXVlIGl0ZW1zIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgd2l0aCBubyBkdXBsaWNhdGUgdmFsdWVzLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVuaXF1ZTogZnVuY3Rpb24gdW5pcXVlIChhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpc2l0ZWQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgdW5pcXVlICA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBpZih2aXNpdGVkLmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2l0ZWQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmlxdWU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNvcnRzIHRoZSBhcnJheSBpbiBhc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgZGVzdHJ1Y3RpdmUgYWN0aW9uLCBhbmQgd2lsbCBtb2RpZnkgdGhlIGFycmF5IGluIHBsYWNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBzb3J0ZWQgaW4gYXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFzY2VuZGluZzogZnVuY3Rpb24gYXNjZW5kaW5nIChhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBpZihhICE9PSB1bmRlZmluZWQgJiYgYSAhPT0gbnVsbCkgYSA9IGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYiAhPT0gdW5kZWZpbmVkICYmIGIgIT09IG51bGwpIGIgPSBiLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU29ydHMgdGhlIGFycmF5IGluIGRlc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGEgZGVzdHJ1Y3RpdmUgYWN0aW9uLCBhbmQgd2lsbCBtb2RpZnkgdGhlIGFycmF5IGluIHBsYWNlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBzb3J0ZWQgaW4gZGVzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkZXNjZW5kaW5nOiBmdW5jdGlvbiBkZXNjZW5kaW5nIChhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBpZihhICE9PSB1bmRlZmluZWQgJiYgYSAhPT0gbnVsbCkgYSA9IGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYiAhPT0gdW5kZWZpbmVkICYmIGIgIT09IG51bGwpIGIgPSBiLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhID4gYiA/IC0xIDogYSA8IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIG9iamVjdDoge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbXB1dGVzIHRoZSBmcmVxdWVuY2llcyBmb3IgZWFjaCBpdGVtIGluIGFsbCBvZiBhcmd1bWVudHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLip9IG9ianMgVGhlIG9iamVjdHMgdG8gY29tcHV0ZSB0aGUgaGlzdG9ncmFtIGZyb20uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3Q8TnVtYmVyPn0gQW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBpdGVtcyBmcm9tIGFsbCBvZiB0aGUgYXJndW1lbnRzIGFzIGl0cyBrZXlzIGFuZCB0aGVpciBmcmVxdWVuY2llcyBhcyBpdCdzIHZhbHVlcy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaGlzdG9ncmFtOiBmdW5jdGlvbiBoaXN0b2dyYW0gKCkge1xuICAgICAgICAgICAgICAgIHZhciBoaXN0b2dyYW0gPSB7fTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFoaXN0b2dyYW1bb10pIGhpc3RvZ3JhbVtvXSA9IDE7IGVsc2UgaGlzdG9ncmFtW29dKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWhpc3RvZ3JhbVsnZnVuY3Rpb24nXSkgaGlzdG9ncmFtWydmdW5jdGlvbiddID0gMTsgZWxzZSBoaXN0b2dyYW1bb10rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KG8sIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgdmFsID09PSBudWxsOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gJ251bGwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgdmFsIGluc3RhbmNlb2YgQXJyYXk6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnYXJyYXknO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gdmFsLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGhpc3RvZ3JhbVt2YWxdICE9PSAnbnVtYmVyJykgaGlzdG9ncmFtW3ZhbF0gPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpc3RvZ3JhbVt2YWxdKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBoaXN0b2dyYW07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENyZWF0ZXMgYSBzaGFsbG93IGNvcHkgb2YgJ2l0ZW0nLlxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSBpdGVtIFRoZSBpdGVtIHRvIHNoYWxsb3cgXCJjb3B5XCIuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBBIHNoYWxsb3cgY29weSBvZiB0aGUgaXRlbS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29weTogZnVuY3Rpb24gY29weSAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHZhciBjb3B5O1xuICAgICAgICAgICAgICAgIGlmKCFpdGVtKSByZXR1cm4gaXRlbTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZW9mIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3B5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoaXRlbSwgZnVuY3Rpb24gKG8sIGspIHsgY29weVtrXSA9IG87IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBudW1iZXIgb2Ygb2NjdXJlbmNlcyBvZiBcIndoYXRcIlxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSBvYmogVGhlIGl0ZW0gdG8gY291bnQgdGhlIG9jY3VyZW5jZXMgb2YgXCJ3aGF0XCIgaW4uXG4gICAgICAgICAgICAgKiBAcGFyYW0geyp9IHdoYXQgVGhlIGl0ZW0gdG8gY291bnQgdGhlIG9jY3VyZW5jZXMgb2YgdGhlIGl0ZW0gaW4gdGhlIGFycmF5LlxuICAgICAgICAgICAgICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9jY3VycmVuY2VzT2Y6IGZ1bmN0aW9uIG9jY3VycmVuY2VzT2YgKG9iaiwgd2hhdCkge1xuICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gMDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9iaiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9jY3VycmVuY2VzT2Yob2JqLnRvU3RyaW5nKCksIHdoYXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9jY3VycmVuY2VzT2YoZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKG9iai50b1N0cmluZygpKSwgd2hhdCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHdoYXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVnZXhwID0gbmV3IFJlZ0V4cCh3aGF0LnRvU3RyaW5nKCksICdnJyksIG07XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShtID0gcmVnZXhwLmV4ZWMob2JqKSkgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KG9iaiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPT09IHdoYXQpIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG9iamVjdCdzIGtleXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nfE51bWJlcj59IFRoZSBvYmplY3QncyBrZXkgc2V0XG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAga2V5cyA6IGZ1bmN0aW9uIGtleXMgKG8pIHtcbiAgICAgICAgICAgICAgICBpZihvID09PSB1bmRlZmluZWQgfHwgbyA9PSBudWxsKSByZXR1cm4gW107XG5cbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9IGdldEtleXMobyksIGlkeDtcbiAgICAgICAgICAgICAgICBpZihsaWJzLm9iamVjdC5pc0FyZ3VtZW50cyhvKSkge1xuICAgICAgICAgICAgICAgICAgICBpZHggPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuICAgICAgICAgICAgICAgICAgICBpZihpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlICdzaXplJyBvciAnbGVuZ3RoJyBvZiBhbiBvYmplY3QuXG4gICAgICAgICAgICAgKiA8dWw+XG4gICAgICAgICAgICAgKiAgICAgIDxsaT4gU3RyaW5nICAgLT4gVGhlIHN0cmluZydzIGxlbmd0aCAgPC9saT5cbiAgICAgICAgICAgICAqICAgICAgPGxpPiBOdW1iZXIgICAtPiBUaGUgbnVtYmVyIG9mIGRpZ2l0cyA8L2xpPlxuICAgICAgICAgICAgICogICAgICA8bGk+IE9iamVjdCAgIC0+IFRoZSBudW1iZXIgb2Yga2V5cyAgIDwvbGk+XG4gICAgICAgICAgICAgKiAgICAgIDxsaT4gQXJyYXkgICAgLT4gVGhlIG51bWJlciBvZiBpdGVtcyAgPC9saT5cbiAgICAgICAgICAgICAqICAgICAgPGxpPiBGdW5jdGlvbiAtPiAxICAgICAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICogPC91bD5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1iZXIgb2YgaXRlbXMgd2l0aGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2l6ZTogZnVuY3Rpb24gc2l6ZSAobykge1xuICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgdHlwZW9mIG8gPT09ICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvLnRvU3RyaW5nKCkubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgbyBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pICYmIHR5cGVvZiBvLmxlbmd0aCAhPT0gJ3VuZGVmaW5lZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgbyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMobykubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERldGVybWluZXMgaWYgYW4gb2JqZWN0IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIG51bWVyaWMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc051bWVyaWM6IGZ1bmN0aW9uIGlzTnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KGl0ZW0pKSAmJiBpc0Zpbml0ZShpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgYW4gb2JqZWN0IHRvIGEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG9iamVjdCBhcyBhIG51bWJlci5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXROdW1lcmljOiBmdW5jdGlvbiBnZXROdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gW10sIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCghaXNOYU4ocGFyc2VGbG9hdChpdGVtKSkgJiYgaXNGaW5pdGUoaXRlbSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBsZW4gPT09IDEgPyByZXNbMF0gOiByZXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERldGVybWluZXMgaWYgYW4gb2JqZWN0IGhhcyBubyBrZXlzLCBpZiBhbiBhcnJheSBoYXMgbm8gaXRlbXMsIG9yIGlmIGEgc3RyaW5nID09PSAnJy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgJ2VtcHR5JywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzRW1wdHk6IGZ1bmN0aW9uIGlzRW1wdHkgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5zaXplKGl0ZW0pID09PSAwICYmIGl0ZW0gIT09IGZhbHNlICYmIGl0ZW0gIT09ICcnICYmIGl0ZW0gIT09IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYXJyYXlzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNBcnJheTogZnVuY3Rpb24gaXNBcnJheSAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBBcnJheTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBvYmplY3RzIGFuZCBub3QgYXJyYXlzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gb2JqZWN0IGFuZCBub3QgYW4gYXJyYXksIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNQdXJlT2JqZWN0OiBmdW5jdGlvbiBpc1B1cmVPYmplY3QgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkgJiYgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIHN0cmluZ3MsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIHN0cmluZywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYm9vbGVhbnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGJvb2xlYW4sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNCb29sZWFuOiBmdW5jdGlvbiBpc0Jvb2xlYW4gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uIGlzRnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbGxsLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gPT09IG51bGw7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgdW5kZWZpbmVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gaXNVbmRlZmluZWQgKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYXJndW1lbnRzIG9iamVjdHMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcmd1bWVudHMgb2JqZWN0LCBmYWxzZSBvdGhlcndpc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNBcmd1bWVudHM6IGZ1bmN0aW9uIGlzQXJndW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGl0ZW0pID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVycyBhbiBvYmplY3QgdG8gYSBudW1iZXIsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG9iamVjdCBhcyBhIGZsb2F0IG9yIE5hTi5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0b051bWJlcjogZnVuY3Rpb24gdG9OdW1iZXIgKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICB2YWxzLnB1c2gobGlicy5vYmplY3QuaXNOdW1lcmljKG8pID8gcGFyc2VGbG9hdChvKSA6IE5hTik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHMubGVuZ3RoID09PSAxID8gdmFsc1swXSA6IHZhbHM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnZlcnMgYW4gb2JqZWN0IHRvIGFuIGludGVnZXIsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG9iamVjdCBhcyBhbiBpbnRlZ2VyIG9yIE5hTi5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0b0ludDogZnVuY3Rpb24gdG9JbnQgKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmFkaXggPSAvXjB4Ly50ZXN0KG8pID8gMTYgOiAxMDsgLy8gQ2hlY2sgZm9yIGhleCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlSW50KG8sIHJhZGl4KSA6IE5hTik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHMubGVuZ3RoID09PSAxID8gdmFsc1swXSA6IHZhbHM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gYXJyYXkgaXRlbSwgcmFuZG9tIG9iamVjdCBwcm9wZXJ0eSwgcmFuZG9tIGNoYXJhY3RlciBpbiBhIHN0cmluZywgb3IgcmFuZG9tIGRpZ2l0IGluIGEgbnVtYmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmFuZG9tOiBmdW5jdGlvbiByYW5kb20gKG8pIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8gaW5zdGFuY2VvZiBBcnJheSA/XG4gICAgICAgICAgICAgICAgICAgICAgICBvW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG8ubGVuZ3RoKV0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgb1tPYmplY3Qua2V5cyhvKVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBPYmplY3Qua2V5cyhvKS5sZW5ndGgpXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gbywgbmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICBpZihvLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgbyA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lZ2F0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguYWJzKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB2YWwudG9TdHJpbmcoKS5sZW5ndGgpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSB2YWwgPSBwYXJzZUludCh2YWwsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5lZ2F0aXZlID8gLXZhbCA6IHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZWFjaCBwcm9wZXJ0eSB0aGUgb2JqZWN0IGNvbnRhaW5zLiBJZiB0aGlzIGlzIGNhbGxlZFxuICAgICAgICAgICAgICogb24gYSBudW1iZXIgb3IgZnVuY3Rpb24sIHRoZSBvYmplY3Qgd2lsbCBiZSBjYXN0IHRvIGEgc3RyaW5nLjxicj48YnI+XG4gICAgICAgICAgICAgKiBUaGUgY2FsbGJhY2sgYGZgIHdpbGwgYmUgaW52b2tlZCB3aXRoIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICogXHQ8bGk+dmFsdWUgICAgIC0gVGhlIHZhbHVlIG9mIHRoZSBjdXJyZW50IG9iamVjdCBiZWluZyBpdGVyYXRlZCBvdmVyPC9saT5cbiAgICAgICAgICAgICAqIFx0PGxpPmtleSAgICAgICAtIFRoZSBrZXkgb2YgdGhlIGN1cnJlbnQgb2JqZWN0IChpZiBhbiBvYmplY3QsIHRoZSBpbmRleCBpZiBhbiBhcnJheSk8L2xpPlxuICAgICAgICAgICAgICogXHQ8bGk+aXRlcmF0aW9uIC0gVGhlIGN1cnJlbnQgaXRlcmF0aW9uIChzYW1lIGFzIGtleSBpZiBhIHN0cmluZyBvciBhcnJheSk8L2xpPlxuICAgICAgICAgICAgICogXHQ8bGk+ZXhpdCAgICAgIC0gQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJyZWFrIHRoZSBsb29wIGFuZCByZXR1cm4gdGhlIHZhbHVlcyBwYXNzZWQgdG8gaXQsXG4gICAgICAgICAgICAgKiBcdFx0XHRcdFx0b3IgYSBzaW5nbGUgdmFsdWUgaWYgb25seSBhIHNpbmdsZSB2YWx1ZSBpcyBwYXNzZWQuPC9saT5cbiAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3JhbmdlQT0wXSBUaGUgaXRlcmF0aW9uIHN0YXJ0IGluZGV4XG4gICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtyYW5nZUI9J2xlbmd0aCBvZiB0aGUgaXRlbSddIFRoZSBpdGVyYXRpb24gZW5kIGluZGV4XG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSBwYXNzZWQgdG8gdGhlIGV4aXQgcGFyYW1ldGVyIG9mIHRoZSBjYWxsYmFjay4uLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlYWNoOiBmdW5jdGlvbiBlYWNoIChvLCByYW5nZUEsIHJhbmdlQiwgZikge1xuXG4gICAgICAgICAgICAgICAgLy8gQ2FuJ3QgdXNlIGxhc3QgaGVyZS4uIHdvdWxkIGNhdXNlIGNpcmN1bGFyIHJlZi4uLlxuICAgICAgICAgICAgICAgIGYgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBrID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGsgPj0gMDsgay0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50c1trXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmID0gYXJndW1lbnRzW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgcmV0ICAgID0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgYnJva2VuID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYgICA9IG8sXG4gICAgICAgICAgICAgICAgICAgIGtleXMsIHByb3BlcnR5LCB2YWx1ZSxcblxuICAgICAgICAgICAgICAgICAgICBleGl0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJva2VuICAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0ICAgICAgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSA6IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmKGYgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSBzZWxmID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHNlbGYpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmlcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQSA9IHBhcnNlSW50KHJhbmdlQSk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlQSA9IChpc05hTihyYW5nZUEpIHx8ICFpc0Zpbml0ZShyYW5nZUEpKSA/IDAgOiByYW5nZUE7XG5cbiAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcGFyc2VJbnQocmFuZ2VCKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gKGlzTmFOKHJhbmdlQikgfHwgIWlzRmluaXRlKHJhbmdlQikpID8ga2V5cy5sZW5ndGggOiByYW5nZUI7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwLCBuO1xuICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhyYW5nZUEpID4gTWF0aC5hYnMocmFuZ2VCKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VCIDwgMCkgcmFuZ2VCID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQSA8IDApIHJhbmdlQSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPiBrZXlzLmxlbmd0aCAtIDEpIHJhbmdlQSA9IGtleXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPj0gcmFuZ2VCOyBuLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBleGl0LCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZUIgPSByYW5nZUIgKyAxID4ga2V5cy5sZW5ndGggPyBrZXlzLmxlbmd0aCA6IHJhbmdlQiArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUIgPCAwKSByYW5nZUIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBIDwgMCkgcmFuZ2VBID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPCByYW5nZUI7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGV4aXQsIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnJva2VuKSBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIGZhbHNlLCB0aGVcbiAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgZiA9IGYgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGYgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZG9lcyBzb21lIGZ1bmt5IHN0dWZmIGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaS4uLlxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBcmdzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcmd1bWVudHNdJywgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpc0FyZ3MgJiYgaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwga2V5cy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBrZXlzW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGkrKywgbykgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZXZlcnkgcHJvcGVydHkgdGhlIG9iamVjdCBjb250YWlucy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgdHJ1ZSwgdGhlXG4gICAgICAgICAgICAgKiBsb29wIGlzIGJyb2tlbiBhbmQgZmFsc2UgaXMgcmV0dXJuZWQ7IG90aGVyd2lzZSB0cnVlIGlzIHJldHVybmVkLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW0gd2l0aGluIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIG5vbmUgb2YgdGhlIGNhbGxiYWNrIGludm9jYXRpb25zIHJldHVybmVkIGZhbHNlLlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFueTogZnVuY3Rpb24gYW55IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgZiA9IGYgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGYgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZG9lcyBzb21lIGZ1bmt5IHN0dWZmIGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaS4uLlxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBcmdzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcmd1bWVudHNdJywgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpc0FyZ3MgJiYgaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwga2V5cy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBrZXlzW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocmV0ICE9PSB1bmRlZmluZWQpIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udmVydHMgYW4gb2JqZWN0IHRvIGFuIGFycmF5LiBGb3Igc3RyaW5ncywgbnVtYmVycywgYW5kIGZ1bmN0aW9ucyB0aGlzIHdpbGxcbiAgICAgICAgICAgICAqIHJldHVybiBhIGNoYXIgYXJyYXkgdG8gdGhlaXIgcmVzcGVjdGl2ZSAudG9TdHJpbmcoKSB2YWx1ZXNcbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBvYmplY3QsIGNvbnZlcnRlZCB0byBhbiBhcnJheS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9BcnJheTogZnVuY3Rpb24gdG9BcnJheSAobykge1xuICAgICAgICAgICAgICAgIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkobyk7XG4gICAgICAgICAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKHZhbCkgeyBhcnIucHVzaCh2YWwpOyB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBmaXJzdCBuIGVsZW1lbnRzIG9mIGFuIG9iamVjdC4gSWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgYW5kIG9ubHkgb25lIGl0ZW1zIGlzIHJldHJpZXZlZCxcbiAgICAgICAgICAgICAqIHRoYXQgaXRlbSB3aWxsIGJlIHJldHVybmVkLCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW249MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgZmlyc3QgbiBlbGVtZW50cyBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiBmaXJzdCAobywgbikge1xuICAgICAgICAgICAgICAgIG4gPSBwYXJzZUludChuLCAxMCk7XG4gICAgICAgICAgICAgICAgbiA9IGlzTmFOKG4pIHx8ICFpc0Zpbml0ZShuKSA/IDEgOiBuO1xuICAgICAgICAgICAgICAgIHZhciB2ID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gIT09IDApIHYgPSBvLnRvU3RyaW5nKCkuc2xpY2UoMCwgbik7IGVsc2UgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYobyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDEpIHJldHVybiBvWzBdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbiAhPT0gMCA/IG8uc2xpY2UoMCwgbikgOiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAwLCBuIC0gMSwgZnVuY3Rpb24gKGl0ZW0sIGtleSkgeyB2W2tleV0gPSBpdGVtOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSBnZXRLZXlzKHYpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IDEgPyB2W2tleXNbMF1dIDogdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHYubGVuZ3RoID09PSAxID8gdlswXSA6IHY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGxhc3QgbiBlbGVtZW50cyBvZiBhbiBvYmplY3QuIElmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIGFuZCBvbmx5IG9uZSBpdGVtcyBpcyByZXRyaWV2ZWQsXG4gICAgICAgICAgICAgKiB0aGF0IGl0ZW0gd2lsbCBiZSByZXR1cm5lZCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW249MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbGFzdCBuIGVsZW1lbnRzIG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgcmV0dXJuIG87XG5cbiAgICAgICAgICAgICAgICBuID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgICAgICAgICAgIG4gPSBpc05hTihuKSB8fCAhaXNGaW5pdGUobikgPyAxIDogbjtcbiAgICAgICAgICAgICAgICB2YXIgdiA9IG51bGwsIGtleXMsIGxlbiA9IGxpYnMub2JqZWN0LnNpemUobyksIGlkeDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYobGlicy5vYmplY3QuaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMobyk7XG4gICAgICAgICAgICAgICAgICAgIGlkeCAgPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2ID0gW107IGxlbiA9IGtleXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAvLyBBcmd1bWVudHMgb2JqZWN0IHNob3VsZCBpZ25vcmUgdW5kZWZpbmVkIG1lbWJlcnMuLi5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChrZXlzLCAwLCBsZW4sIGZ1bmN0aW9uIChrKSB7IGlmKG9ba10gIT09IHVuZGVmaW5lZCkgdi51bnNoaWZ0KG9ba10pOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdiA9IHYuc2xpY2UoMCwgbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gIT09IDApIHYgPSBvLnRvU3RyaW5nKCkuc2xpY2UoLW4pOyBlbHNlIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBpZihuID09PSAxKSByZXR1cm4gb1tvLmxlbmd0aCAtMV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuICE9PSAwID8gby5zbGljZSgtbikgOiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHYgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA8IDApIG4gPSAwO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGxlbiAtIG4sIGxlbiwgZnVuY3Rpb24gKGl0ZW0sIGtleSkgeyB2W2tleV0gPSBpdGVtOyB9KTtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXModik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXlzLmxlbmd0aCA9PT0gMSA/IHZba2V5c1swXV0gOiB2O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdi5sZW5ndGggPT09IDEgPyB2WzBdIDogdi5sZW5ndGggPiAwID8gdiA6IG51bGw7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGFuIFwiZW1wdHlcIiBmdW5jdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuICAgICAgICAgICAgICogVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGEgY2FsbGJhY2sgY2FuIGFsd2F5cyBiZSBpbnZva2VkLCB3aXRob3V0IGNoZWNraW5nIGlmIHRoZSBhcmd1bWVudCBpcyBhIGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBvdmVyIGFuZCBvdmVyLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBnZXQgdGhlIGNhbGxiYWNrIGZvci5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBJZiB0aGUgbGFzdCBpdGVtIGluIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhbiBcImVtcHR5XCIgZnVuY3Rpb24gd2lsbCBiZSByZXR1cm5lZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0Q2FsbGJhY2s6IGZ1bmN0aW9uIGdldENhbGxiYWNrIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhc3QgPSBsaWJzLm9iamVjdC5sYXN0KG8pO1xuICAgICAgICAgICAgICAgIHJldHVybiBsYXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBsYXN0IDogTlVMTF9GVU5DVElPTjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmluZCBhIGNoaWxkIG9mIGFuIG9iamVjdCB1c2luZyB0aGUgZ2l2ZW4gcGF0aCwgc3BsaXQgYnkgdGhlIGdpdmVuIGRlbGltaXRlciAob3IgJy4nIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCB0byB0aGUgY2hpbGQgb2JqZWN0XG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkZWxpbWl0ZXI9Jy4nXSBUaGUgcGF0aCBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBkb25lIEEgY2FsbGJhY2sgZm9yIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp8TnVsbH0gVGhlIGNoaWxkIG9iamVjdCBhdCB0aGUgZ2l2ZW4gc3RyaW5nIHBhdGgsIG9yIG51bGwgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBmaW5kQ2hpbGRBdFBhdGg6IGZ1bmN0aW9uIGZpbmRDaGlsZEF0UGF0aCAobywgcGF0aCwgZGVsaW1pdGVyLCBvcmlnaW5hbCwgaW52b2tlZCwgZG9uZSkge1xuICAgICAgICAgICAgICAgIGRvbmUgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbztcblxuICAgICAgICAgICAgICAgIG9yaWdpbmFsID0gKCEob3JpZ2luYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikgJiYgb3JpZ2luYWwpID8gb3JpZ2luYWwgOiBzZWxmO1xuICAgICAgICAgICAgICAgIGludm9rZWQgID0gaW52b2tlZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gdHlwZW9mIGRlbGltaXRlciA9PT0gJ3N0cmluZycgPyBkZWxpbWl0ZXIgOiAnLic7XG4gICAgICAgICAgICAgICAgICAgIHBhdGggICAgICA9IHBhdGguc3BsaXQoZGVsaW1pdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcCA9IHBhdGguc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYocCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKG8sIGssIGksIGV4aXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMCAmJiBrID09PSBwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUuY2FsbChvcmlnaW5hbCwgbywgc2VsZiwgayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGl0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IGxpYnMub2JqZWN0LmZpbmRDaGlsZEF0UGF0aChvLCBwYXRoLmpvaW4oZGVsaW1pdGVyKSwgZGVsaW1pdGVyLCBvcmlnaW5hbCwgaW52b2tlZCwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG9iaiAhPT0gbnVsbCkgZXhpdChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKCFpbnZva2VkICYmIG9yaWdpbmFsID09PSBzZWxmICYmIGRvbmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgZG9uZS5jYWxsKG9yaWdpbmFsLCBudWxsLCBzZWxmLCBudWxsKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUHJvZHVjZXMgYSBzaGFsbG93IGNsb25lIG9mIHRoZSBvYmplY3QsIHRoYXQgaXMsIGlmIEpTT04uc3RyaW5naWZ5IGNhbiBoYW5kbGUgaXQuPGJyPlxuICAgICAgICAgICAgICogVGhlIG9iamVjdCBtdXN0IGJlIG5vbi1jaXJjdWxhci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IEEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsb25lOiBmdW5jdGlvbiBjbG9uZSAobykge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbyA9PT0gJ251bWJlcicpIHJldHVybiBvO1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBjbG9uZSBvYmplY3Q6ICcgKyBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmlsdGVycyBhbiBhcnJheSBvciBvYmplY3QgdXNpbmcgb25seSB0aGUgdHlwZXMgYWxsb3dlZC4gVGhhdCBpcywgaWYgdGhlIGl0ZW0gaW4gdGhlIGFycmF5IGlzIG9mIGEgdHlwZSBsaXN0ZWRcbiAgICAgICAgICAgICAqIGluIHRoZSBhcmd1bWVudHMsIHRoZW4gaXQgd2lsbCBiZSBhZGRlZCB0byB0aGUgZmlsdGVyZWQgYXJyYXkuIEluIHRoaXMgY2FzZSAnYXJyYXknIGlzIGEgdmFsaWQgdHlwZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSB0eXBlcyBBIGxpc3Qgb2YgdHlwZW9mIHR5cGVzIHRoYXQgYXJlIGFsbG93ZWQgaW4gdGhlIGFycmF5LlxuICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IEFuIGFycmF5IGZpbHRlcmVkIGJ5IG9ubHkgdGhlIGFsbG93ZWQgdHlwZXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9ubHk6IGZ1bmN0aW9uIG9ubHkgKG8sIHR5cGVzKSB7XG4gICAgICAgICAgICAgICAgdHlwZXMgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgdHlwZXMuc2hpZnQoKTtcblxuICAgICAgICAgICAgICAgIC8vIEFsbG93cyB0aGUgJ3BsdXJhbCcgZm9ybSBvZiB0aGUgdHlwZS4uLlxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2godHlwZXMsIGZ1bmN0aW9uICh0eXBlLCBrZXkpIHsgdGhpc1trZXldID0gdHlwZS5yZXBsYWNlKC9zJC8sICcnKTsgfSk7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcgfHwgIW8pIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIHZhciBpc0FycmF5ICA9IG8gaW5zdGFuY2VvZiBBcnJheSA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBpc0FycmF5ID8gW10gOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUFyciAgPSB0eXBlcy5pbmRleE9mKCdhcnJheScpLFxuICAgICAgICAgICAgICAgICAgICB0eXBlT2JqICA9IHR5cGVzLmluZGV4T2YoJ29iamVjdCBvYmplY3QnKTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZUl0ZW0gPSB0eXBlcy5pbmRleE9mKHR5cGVvZiBpdGVtKTtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlT2JqICE9PSAtMSAmJiB0eXBlQXJyID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAhKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkpIHx8ICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgJiYgdHlwZUl0ZW0gIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlT2JqICE9PSAtMSAmJiB0eXBlQXJyICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXMucHVzaCgnb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlSXRlbSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZUl0ZW0gIT09IC0xIHx8IChpdGVtIGluc3RhbmNlb2YgQXJyYXkgJiYgdHlwZUFyciAhPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCB1c2luZyB0aGUgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3Igb2JqZWN0cywgYSBuZXcgb2JqZWN0IHdpbGwgYmUgcmV0dXJuZWQsIHdpdGhcbiAgICAgICAgICAgICAqIHRoZSB2YWx1ZXMgdGhhdCBwYXNzZWQgdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIHN0cmluZ3MsIGEgbmV3IHN0cmluZyB3aWxsIGJlIHJldHVybmVkIHdpdGggdGhlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAqIHRoYXQgcGFzc2VkIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBudW1iZXJzLCBhIG5ldyBudW1iZXIgd2lsbCBiZSByZXR1cm5lZCB3aXRoIHRoZSBkaWdpdHMgdGhhdCBwYXNzZWRcbiAgICAgICAgICAgICAqIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uIEZ1bmN0aW9ucyB3aWxsIGJlIG9wZXJhdGVkIG9uIGFzIHN0cmluZ3MuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIHVzZWQgdG8gZmlsdGVyIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbiB3aGVyZSAobywgcHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYoIShwcmVkaWNhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgIHByZWRpY2F0ZSA9IGZ1bmN0aW9uIChpKSB7IHJldHVybiBpID09IHRlbXA7IH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYobyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiAwID09PSAnYm9vbGVhbicpIHJldHVybiBwcmVkaWNhdGUuY2FsbChvLCBvLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gIWlzT2JqZWN0ID8gW10gOiB7fTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChpdGVtLCBpdGVtLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpc09iamVjdCkgZmlsdGVyZWRba2V5XSA9IGl0ZW07IGVsc2UgZmlsdGVyZWQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSBmaWx0ZXJlZCA9IGZpbHRlcmVkLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmlsdGVycyBhbiBvYmplY3QgYnkga2V5cyB1c2luZyB0aGUgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbHRlciB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIGZpbHRlcmVkIG9iamVjdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB3aGVyZUtleXM6IGZ1bmN0aW9uIHdoZXJlS2V5cyAobywgcHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYoIShwcmVkaWNhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgIHByZWRpY2F0ZSA9IGZ1bmN0aW9uIChrKSB7IHJldHVybiBrID09IHRlbXA7IH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYobyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiAwID09PSAnYm9vbGVhbicpIHJldHVybiBwcmVkaWNhdGUuY2FsbChvLCBvLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gIWlzT2JqZWN0ID8gW10gOiB7fTtcblxuICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChrZXksIGtleSwgaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzT2JqZWN0KSBmaWx0ZXJlZFtrZXldID0gaXRlbTsgZWxzZSBmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIGZpbHRlcmVkID0gZmlsdGVyZWQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGb3Igb2JqZWN0cywgaW52ZXJ0cyB0aGUgb2JqZWN0cyBrZXlzL3ZhbHVlcy4gSWYgdGhlIHZhbHVlIGlzbid0IGEgbnVtYmVyIG9yIGFycmF5LCBpdCB3aWxsIGJlIG9taXR0ZWQuXG4gICAgICAgICAgICAgKiBGb3Igc3RyaW5ncywgaXQgd2lsbCByZXZlcnNlIHRoZSBzdHJpbmcuXG4gICAgICAgICAgICAgKiBGb3IgbnVtYmVyLCBpdCB3aWxsIGNvbXB1dGUgdGhlIG51bWJlcidzIGludmVyc2UgKGkuZS4gMSAvIHgpLlxuICAgICAgICAgICAgICogRm9yIGZ1bmN0aW9ucywgaW52ZXJ0IHJldHVybnMgYSBuZXcgZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgZ2l2ZW4gZnVuY3Rpb24gYW5kIGludmVydHMgaXQncyByZXN1bHQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgaW52ZXJzZSwgYXMgZGVzY3JpYmVkIGFib3ZlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnZlcnQ6IGZ1bmN0aW9uIGludmVydCAobykge1xuICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycpICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJldmVyc2Uobyk7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSAgIHJldHVybiAxIC8gbztcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSAgcmV0dXJuICFvO1xuXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvLmFwcGx5KG8sIGFyZ3VtZW50cykpOyB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIW9ialtpdGVtXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXAgPSBvYmpbaXRlbV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dLnB1c2godG1wLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmdW5jIElmIHBhc3NlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXg6IGZ1bmN0aW9uIG1heCAobywgZnVuYykge1xuICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHZhciBtYXgsIG1heFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgaWYoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPj0gbWF4KSBtYXggPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICBtYXhWYWx1ZSA9IGZ1bmMuY2FsbChtYXgsIG1heCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnVuYy5jYWxsKGl0ZW0sIGl0ZW0pID49IG1heFZhbHVlKSBtYXggPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgbWluaW11bSBpdGVtIGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZnVuYyBJZiBwYXNzZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgbWluaW11bSBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluOiBmdW5jdGlvbiBtaW4gKG8sIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBpZighbyB8fCB0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIGlmKCEoZnVuYyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgZnVuYyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgdmFyIG1pbiwgbWluVmFsdWU7XG5cbiAgICAgICAgICAgICAgICBpZighZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA8PSBtaW4pIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWluID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIG1pblZhbHVlID0gZnVuYy5jYWxsKG1pbiwgbWluKTtcblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmdW5jLmNhbGwoaXRlbSwgaXRlbSkgPD0gbWluVmFsdWUpIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbWluO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUZXN0cyB3aGV0aGVyIG9yIG5vdCB0aGUgb2JqZWN0IGhhcyBhIG1ldGhvZCBjYWxsZWQgJ21ldGhvZCcuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gdGVzdCBleGlzdGVuY2UgZm9yLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGhhcyBhIGZ1bmN0aW9uIGNhbGxlZCAnbWV0aG9kJywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbXBsZW1lbnRzOiBmdW5jdGlvbiBfaW1wbGVtZW50cyAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICBpZighYSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmdzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGFbbV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2FtZSBhcyBPYmplY3Quai5pbXBsZW1lbnRzLCBleGNlcGN0IHdpdGggYSBoYXNPd25Qcm9wZXJ0eSBjaGVjay5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byB0ZXN0IGV4aXN0ZW5jZSBmb3IuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaGFzIGl0cyBvd24gZnVuY3Rpb24gY2FsbGVkICdtZXRob2QnLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGltcGxlbWVudHNPd246IGZ1bmN0aW9uIGltcGxlbWVudHNPd24gKG8sIG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgaWYoIWEpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJncywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhW21dIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICFvLmhhc093blByb3BlcnR5KG1ldGhvZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbGlicztcbn1cblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsaWJzO1xufSgpKTtcbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iXX0=
