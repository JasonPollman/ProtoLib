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
    IS_BROWSER = typeof window !== 'undefined',

    /**
     * Stores ProtoLib instances for Protolib.get
     * @type {Object}
     */
    Protolibs = {};

    // This provides a way to determine the "id" of a function constructor in an environment agnostic way...
    // It also allows us to give objects a unique id...
    Object.defineProperty(Object.prototype, '__get_protolib_id__', {
        configurable : true,
        enumerable   : false,
        get          : function () {
            if(!(typeof this === 'object' || typeof this === 'function'))
                throw new Error('Cannot get unique id of literal type');

            if(!this.__protolib_id__) {
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
        _dateUid     = Date.__get_protolib_id__,
        _errorUid    = Error.__get_protolib_id__,
        _booleanUid  = Boolean.__get_protolib_id__,
        _mathUid     = Math.__get_protolib_id__,
        _regexpUid   = RegExp.__get_protolib_id__;

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
        libs = require('./lib/libs')(ProtoLib),

        /**
         * The protolibrary
         */
        libp = require('./lib/libp')(libs, getThisValueAndInvoke);

        // Map the object ids to the library names...
        libp[_objectUid]   = libp.object   || {};
        libp[_stringUid]   = libp.string   || {};
        libp[_numberUid]   = libp.number   || {};
        libp[_arrayUid]    = libp.array    || {};
        libp[_functionUid] = libp.function || {};
        libp[_dateUid]     = libp.date     || {};
        libp[_booleanUid]  = libp.boolean  || {};
        libp[_errorUid]    = libp.error    || {};
        libp[_mathUid]     = libp.math     || {};
        libp[_regexpUid]   = libp.regexp   || {};

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
                        cached[i] = undefined;
                        delete cached[i];

                        inheritanceChain[i] = undefined;
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
                            last  = null,
                            m;

                        currentThis = this;

                        do {
                            ccId = proto.constructor.__get_protolib_id__;
                            if(cached[ccId] && i === 0) {
                                return cached[ccId];
                            }
                            else if(cached[ccId]) {
                                for(m in cached[ccId])
                                    if(cached[ccId].hasOwnProperty(m)) lib[m] = cached[ccId][m];

                                if(!inheritanceChain[cId]) inheritanceChain[cId] = [];
                                inheritanceChain[cId] = inheritanceChain[ccId].concat(inheritanceChain[cId]);
                                cached[cId] = lib;
                                return lib;
                            }
                            else {
                                if(!libp[ccId]) libp[ccId] = {};
                                for(m in libp[ccId])
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
                attached = true;
            }
            return self;
        }

        /**
         * Removes the library methods from the primitive object prototypes.
         * @return {ProtoLib} The current ProtoLib instance
         */
        function removeLibraryFromPrototypes () {
            Object.defineProperty(Object.prototype, handle, { value: undefined });
            delete Object.prototype[handle];
            attached = false;
            return self;
        }

        /**
         * Retrieves the last item from the 'thisPointerStack' and invokes the provided callback with it.
         * @param {Function} callback The callback to be invoked with the current 'this' value.
         * @return The result of the invocation of the callback.
         */
        function getThisValueAndInvoke (callback) {
            return callback(currentThis !== undefined && currentThis !== null ?
                typeof currentThis === 'object' ? currentThis : currentThis.valueOf() : currentThis
            );
        }

        /**
         * Sets the handle
         * @param {String} h The new handle
         * @return {ProtoLib} The current ProtoLib instance
         */
        this.setHandle = function (h) {
            self.unload();
            if(typeof h === 'string') handle = h;
            self.load();
            return self;
        };

        /**
         * Adds a library method to a prototype.
         * @param {Function=} [constr=Object] The constructor of the object to extend.
         * @param {String} name The name of the library method to add.
         * @param {Function} callback The method to add.
         * @return {Boolean} True if the method was added, false otherwise.
         */
        this.extend = function (constr, name, staticNamespace, callback) {
            callback = libs.object.getCallback(arguments);

            if(typeof constr === 'string') {
                name = constr;
                constr = undefined;
            }

            if(typeof name !== 'string'     || !(callback instanceof Function)) return false;
            if(typeof constr !== 'function' || constr === callback) constr = Object;

            var constructorId   = constr.__get_protolib_id__,
                constructorName = typeof staticNamespace === 'string' ?
                    staticNamespace : typeof constr.name === 'string' ? constr.name : null;

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

            if(!libp[constructorId])   libp[constructorId]   = {};
            if(!libs[constructorName]) libs[constructorName] = {};

            // Add static version..
            var staticVersion = function (o) { return callback.apply(o, arguments); };
            if(constructorName) {

                // Set this property so we can remove it later if ProtoLib.remove is called on it...
                Object.defineProperty(constr, '__protolib_static_namespace__', {
                    configurable : true,
                    writable     : true,
                    enumerable   : false,
                    value        : constructorName
                });

                libs[constructorName][name] = staticVersion;
            }

            // We always add extended functions to libs.my
            libs.my[name] = staticVersion;

            // Add instance version...
            libp[constructorId][name]   = function () {
                var args = libs.object.toArray(arguments);
                return getThisValueAndInvoke(function (c) {
                    args.unshift(c);
                    return callback.apply(c, args);
                });
            };

            deleteCacheForConstructor(constr);
            return true;
        };

        /**
         * Removes a library method from a constructor's prototype.
         * @param {Function} constr The constructor to remove the method from.
         * @param {String} name The name of the library method to remove.
         * @return {Boolean} True if the method was removed, false otherwise.
         */
        this.remove = function (constr, name) {
            if(typeof name !== 'string' || typeof constr !== 'function') return false;

            var uid = constr.__get_protolib_id__;
            if(libp[uid] && libp[uid][name]) {
                libp[uid][name] = undefined;
                delete libp[uid][name];

                // Remove from static namespace, if added there...
                if(libs[constr.__protolib_static_namespace__] && libs[constr.__protolib_static_namespace__][name]) {
                    libs[constr.__protolib_static_namespace__][name] = undefined;
                    delete libs[constr.__protolib_static_namespace__][name];
                }

                // Remove from libs.my
                if(libs.my[name]) {
                    libs.my[name] = undefined;
                    delete libs.my[name];
                }

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
            ProtoLib[handle] = undefined;
            delete ProtoLib[handle];
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

        /**
         * Delets the library cache
         * @param {Function=} constr The constructor function to kill the cache for.
         * @return {ProtoLib} The current ProtoLib instance.
         */
        this.killCache = function (constr) {
            if(constr) {
                if(typeof constr === 'function') {
                    cached[constr.__get_protolib_id__] = undefined;
                    delete cached[constr.__get_protolib_id__];

                    inheritanceChain[constr.__get_protolib_id__] = undefined;
                    delete inheritanceChain[constr.__get_protolib_id__];
                }
            }
            else {
                cached = {};
                inheritanceChain = {};
            }
            return self;
        };

        // Apply the library to the object prototype, and attach all the static functions
        // to the current ProtoLib instance...
        self.load();

        // Add this instance to the Protolib "container"
        Protolibs[handle] = self;
    };

    /**
     * Gets a ProtoLib library by handle, or, an instance with the given handle doesn't exist, creates one.
     * @param {String=} [handle='_'] The handle for the instance to get or create.
     * @return {ProtoLib} The new (or retrieved) ProtoLib instance.
     */
    ProtoLib.get = function get (handle) {
        handle = typeof handle === 'string' ? handle : '_';
        return Protolibs[handle] || new ProtoLib(handle);
    };

    /**
     * Deletes the cache for the Protolib instance with the given handle. If no handle is specified,
     * the cache for all instances will be deleted.
     * @param {String=} handle The handle of the instance to delete
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.killCache = function killCache (handle) {
        if(Protolibs[handle] instanceof ProtoLib) {
            Protolibs[handle].killCache();
        }
        else if(!handle) {
            for(var n in Protolibs) {
                if(Protolibs.hasOwnProperty(n)) Protolibs[n].killCache();
            }
        }
        return ProtoLib;
    };

    /**
     * Deletes the cache for the given constructor for all ProtoLib instances.
     * @param {String=} constr The constructor cache to delete
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.killCacheForConstructor = function killCacheForConstructor (constr) {
        for(var n in Protolibs) {
            if(Protolibs.hasOwnProperty(n)) Protolibs[n].killCache(constr);
        }
        return ProtoLib;
    };

    /**
     * Removes the library methods from Object[handle] and releases the ProtoLib instance for garbage collection (if
     * it's not references elsewhere).
     * @param {String=} [handle='_'] The handle of the ProtoLib instance to
     * @return {Function} The ProtoLib constructor
     */
    ProtoLib.destroy = function destroy (handle) {
        handle = typeof handle === 'string' ? handle : '_';
        if(typeof Protolibs[handle] === 'object') {
            Protolibs[handle].unload();
            Protolibs[handle] = undefined;
            delete Protolibs[handle];
        }
        return ProtoLib;
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

                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (n) {
                        return libs.number.clockTime(n, omitMS);
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
                uniqueId: function uniqueId () {
                    return getThisValueAndInvoke(function (o) {
                        return libs.object.uniqueId(o);
                    });
                },

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
                        return libs.date.advanceDays(d, n, adjustForWeeked);
                    });
                },

                advanceMonths: function advanceMonths (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.advanceMonths(d, n, adjustForWeeked);
                    });
                },

                advanceYears: function advanceYears (n, adjustForWeeked) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.advanceYears(d, n, adjustForWeeked);
                    });
                },

                yyyymmdd: function yyyymmdd (delim) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.yyyymmdd(d, delim);
                    });
                },

                clockTime: function clockTime (omitMS) {
                    return getThisValueAndInvoke(function (d) {
                        return libs.date.clockTime(d, !!omitMS);
                    });
                },
            },

            error: {
                /** @todo: Add some Error utility functions... */
            },

            boolean: {
                /** @todo: Add some Boolean utility functions... */
            },

            math: {
                /** @todo: Add some Math utility functions... */
            },

            regexp: {
                /** @todo: Add some RegExp utility functions... */
            }
        };

        return libp;
    }
    module.exports = libp;
}());

},{}],3:[function(require,module,exports){
(function () {
    'use strict';

    function libs (ProtoLib) {
        var IS_BROWSER = typeof window !== 'undefined',
            HAS_OS     = IS_BROWSER ? false : typeof require('os') === 'object';

        // Used in Object.setPrototypeOf polyfill only
        var exclude = ['length', 'name', 'arguments', 'caller', 'prototype'];

        // Used in Object.setPrototypeOf polyfill only
        function bindFunction(o, fn) {
            return function() { return fn.apply(o, arguments); };
        }

        // Used in Object.setPrototypeOf polyfill only
        function bindProperty(o, parent, prop) {
            Object.defineProperty(o, prop, {
                get: function () {
                    try { return parent[prop]; } catch (e) {}
                },
                set: function (val) {
                    try { parent[prop] = val; } catch(e) {}
                },
                configurable: true
            });
        }

        /**
         * Sets the properties on an obj from the given prototype.
         * Used in the case that Object.setPrototypeOf and Object.__proto__ is unavailable, e.g. only IE < 11
         */
        function iterateProperties (_sub, _super) {
            var props = Object.getOwnPropertyNames(_super),
                proto;

            _sub.__proto__ = _super; // jshint ignore:line
            for(var i = 0, len = props.length; i < len; i++) {
                var prop = props[i];

                if(prop === '__proto__') {
                    proto = _super.__proto__;
                }
                else if(exclude.indexOf(i) === -1) {
                    var descriptor = Object.getOwnPropertyDescriptor(_sub, prop);
                    if(!descriptor) {
                        var superDescriptor = Object.getOwnPropertyDescriptor(_super, prop);
                        if(typeof superDescriptor.get !== 'function' && typeof _super[prop] === 'function') {
                            _sub[prop] = bindFunction(_sub, _super[prop]);
                        }
                        else {
                            bindProperty(_sub, _super, prop);
                        }
                    }
                }
            }
            return _sub;
        }

        // Polyfill Object.setPrototypeOf
        Object.setPrototypeOf = Object.setPrototypeOf || function setPrototypeOfPolyfill (obj, proto) {
            if(obj.__proto__) {         // jshint ignore:line
                obj.__proto__ = proto;  // jshint ignore:line
            }
            else {
                iterateProperties(obj, proto);
            }
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
                    if(!(d instanceof Date)) return d;
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
                    if(!(d instanceof Date)) return d;
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
                    if(!(d instanceof Date)) return d;
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
                    if(!(d instanceof Date)) return d;
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
                    if(!(d instanceof Date)) return d;
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
                    min = parseFloat(min);
                    max = parseFloat(max);

                    if(isNaN(min) && !isFinite(min)) min = 0;
                    if(isNaN(max) && !isFinite(max)) max = Number.MAX_VALUE;
                    return Math.random() * (max - min) + min;
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
                 * Mostly borrowed directly from Node.js
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

                    // Kill al the ProtoLib cache, for all instances...
                    ProtoLib.killCacheForConstructor(constructor);
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

                    if(!(a instanceof Array)) return a;
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
                    if(!(a instanceof Array)) return a;
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
                    if(!(a instanceof Array)) return a;
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
                    if(!(a instanceof Array)) return a;
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
                    if(!(a instanceof Array)) return a;

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
                    if(!(a instanceof Array)) return a;

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
                    if(!(a instanceof Array)) return a;
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
                    if(!(a instanceof Array)) return a;
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
                 * Gets the unique id of an object.
                 * Only works for non-literals, otherise Object.__get_protolib_id__ will throw.
                 * @param {Object|Function} o The object to get the unique id for.
                 * @return {String} A unique object id
                 */
                uniqueId: function uniqueId (o) {
                    return o.__get_protolib_id__;
                },

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
            },

            error: {
                /** @todo: Add some Error utility functions... */
            },

            boolean: {
                /** @todo: Add some Boolean utility functions... */
            },

            math: {
                /** @todo: Add some Math utility functions... */
            },

            regexp: {
                /** @todo: Add some RegExp utility functions... */
            }
        };
        return libs;
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4aUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gSWRlbnRpZmllci5cbiAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAqL1xuICAgIHZhciBvaWQgPSAtMSxcblxuICAgICAvKipcbiAgICAgICogVHJ1ZSBpZiB0aGUgTm9kZS5qcyBlbnZpcm9ubWVudCBpcyBsb2FkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAqL1xuICAgIElTX0JST1dTRVIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyxcblxuICAgIC8qKlxuICAgICAqIFN0b3JlcyBQcm90b0xpYiBpbnN0YW5jZXMgZm9yIFByb3RvbGliLmdldFxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgUHJvdG9saWJzID0ge307XG5cbiAgICAvLyBUaGlzIHByb3ZpZGVzIGEgd2F5IHRvIGRldGVybWluZSB0aGUgXCJpZFwiIG9mIGEgZnVuY3Rpb24gY29uc3RydWN0b3IgaW4gYW4gZW52aXJvbm1lbnQgYWdub3N0aWMgd2F5Li4uXG4gICAgLy8gSXQgYWxzbyBhbGxvd3MgdXMgdG8gZ2l2ZSBvYmplY3RzIGEgdW5pcXVlIGlkLi4uXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsICdfX2dldF9wcm90b2xpYl9pZF9fJywge1xuICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlICAgOiBmYWxzZSxcbiAgICAgICAgZ2V0ICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYoISh0eXBlb2YgdGhpcyA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHRoaXMgPT09ICdmdW5jdGlvbicpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGdldCB1bmlxdWUgaWQgb2YgbGl0ZXJhbCB0eXBlJyk7XG5cbiAgICAgICAgICAgIGlmKCF0aGlzLl9fcHJvdG9saWJfaWRfXykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19wcm90b2xpYl9pZF9fJywge1xuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWJlcmFibGUgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiAnMHgnICsgKCsrb2lkKS50b1N0cmluZygxNilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9fcHJvdG9saWJfaWRfXztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIF9vYmplY3RVaWQgICA9IE9iamVjdC5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfbnVtYmVyVWlkICAgPSBOdW1iZXIuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX3N0cmluZ1VpZCAgID0gU3RyaW5nLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9hcnJheVVpZCAgICA9IEFycmF5Ll9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9mdW5jdGlvblVpZCA9IEZ1bmN0aW9uLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9kYXRlVWlkICAgICA9IERhdGUuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2Vycm9yVWlkICAgID0gRXJyb3IuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2Jvb2xlYW5VaWQgID0gQm9vbGVhbi5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfbWF0aFVpZCAgICAgPSBNYXRoLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9yZWdleHBVaWQgICA9IFJlZ0V4cC5fX2dldF9wcm90b2xpYl9pZF9fO1xuXG4gICAgdmFyIFByb3RvTGliID0gZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgICAgICAvLyBQcmV2ZW50IEZ1bmN0aW9uLmNhbGwgb3IgYmluZGluZy4uLlxuICAgICAgICBpZighKHRoaXMgaW5zdGFuY2VvZiBQcm90b0xpYikpIHJldHVybiBuZXcgUHJvdG9MaWIoaGFuZGxlKTtcblxuICAgICAgICAvLyBTZXQgZWl0aGVyIHRoZSB1c2VyIHRoZSBkZWZhdWx0IFwiaGFuZGxlXCIgKGxpYnJhcnkgYWNjZXNzb3IpXG4gICAgICAgIGhhbmRsZSA9IHR5cGVvZiBoYW5kbGUgPT09ICdzdHJpbmcnID8gaGFuZGxlIDogJ18nO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHNlbGYgcmVmZXJlbmNlLlxuICAgICAgICAgKiBAdHlwZSB7UHJvdG9MaWJ9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSBsaWJyYXJ5IGZ1bmN0aW9ucyBoYXZlIGJlZW4gYXR0YWNoZWQgdG8gdGhlIHByb3RvdHlwZXMuXG4gICAgICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYXR0YWNoZWQgPSBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUG9pbnRzIHRvIHRoZSBjdXJyZW50IHRoaXMgaXRlbS5cbiAgICAgICAgICogQHR5cGUgeyp9XG4gICAgICAgICAqL1xuICAgICAgICBjdXJyZW50VGhpcyA9IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyBjYWNoZWQgbGlicmFyeSBwcm90byByZWZlcmVuY2Ugb2JqZWN0c1xuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgY2FjaGVkID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3JlcyB0aGUgY29uc3RydWN0b3IgY2hhaW4gZm9yIGVhY2ggcHJvdG90eXBlIGFzIGFuIGFycmF5LlxuICAgICAgICAgKiBGb3IgZXhhbXBsZTogeyBzdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZyddIH0uXG4gICAgICAgICAqIEFub3RoZXIgZXhhbXBsZTogeyBteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmc6IFsnb2JqZWN0JywgJ3N0cmluZycsICdteUN1c3RvbUNsYXNzVGhhdEV4dGVuZHNTdHJpbmcnXSB9XG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBpbmhlcml0YW5jZUNoYWluID0ge30sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBzdGF0aWMgbGlicmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgbGlicyA9IHJlcXVpcmUoJy4vbGliL2xpYnMnKShQcm90b0xpYiksXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBwcm90b2xpYnJhcnlcbiAgICAgICAgICovXG4gICAgICAgIGxpYnAgPSByZXF1aXJlKCcuL2xpYi9saWJwJykobGlicywgZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKTtcblxuICAgICAgICAvLyBNYXAgdGhlIG9iamVjdCBpZHMgdG8gdGhlIGxpYnJhcnkgbmFtZXMuLi5cbiAgICAgICAgbGlicFtfb2JqZWN0VWlkXSAgID0gbGlicC5vYmplY3QgICB8fCB7fTtcbiAgICAgICAgbGlicFtfc3RyaW5nVWlkXSAgID0gbGlicC5zdHJpbmcgICB8fCB7fTtcbiAgICAgICAgbGlicFtfbnVtYmVyVWlkXSAgID0gbGlicC5udW1iZXIgICB8fCB7fTtcbiAgICAgICAgbGlicFtfYXJyYXlVaWRdICAgID0gbGlicC5hcnJheSAgICB8fCB7fTtcbiAgICAgICAgbGlicFtfZnVuY3Rpb25VaWRdID0gbGlicC5mdW5jdGlvbiB8fCB7fTtcbiAgICAgICAgbGlicFtfZGF0ZVVpZF0gICAgID0gbGlicC5kYXRlICAgICB8fCB7fTtcbiAgICAgICAgbGlicFtfYm9vbGVhblVpZF0gID0gbGlicC5ib29sZWFuICB8fCB7fTtcbiAgICAgICAgbGlicFtfZXJyb3JVaWRdICAgID0gbGlicC5lcnJvciAgICB8fCB7fTtcbiAgICAgICAgbGlicFtfbWF0aFVpZF0gICAgID0gbGlicC5tYXRoICAgICB8fCB7fTtcbiAgICAgICAgbGlicFtfcmVnZXhwVWlkXSAgID0gbGlicC5yZWdleHAgICB8fCB7fTtcblxuICAgICAgICAvLyBUdWNrIHVubmFtZWQgc3RhdGljIGV4dGVuc2lvbnMgaGVyZS4uLlxuICAgICAgICBsaWJzLm15ID0ge307XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGV0ZXMgdGhlIGNhY2hlIGZvciB0aGUgZ2l2ZW4gY29uc3RydWN0b3IsIGFuZCBhbGwgb3RoZXJzIHRoYXQgaW5oZXJpdHMgZnJvbSBpdHMgcHJvdG90eXBlLlxuICAgICAgICAgKiBXaGljaCBtZWFucyBpZiBjb25zdHIgPT09IE9iamVjdCwgYWxsIGNhY2hlIHdpbGwgYmUgZGVsZXRlZC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RyIFRoZSBjb25zdHJ1Y3RvciB0byBkZWxldGUgdGhlIGNhY2hlIGZvci5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yIChjb25zdHIpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBpbmhlcml0YW5jZUNoYWluKSB7XG4gICAgICAgICAgICAgICAgaWYoaW5oZXJpdGFuY2VDaGFpbi5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihpbmhlcml0YW5jZUNoYWluW2ldLmluZGV4T2YoY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX18pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlZFtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZWRbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGluaGVyaXRhbmNlQ2hhaW5baV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaW5oZXJpdGFuY2VDaGFpbltpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFwcGVuZHMgYWxsIHRoZSBsaWJyYXJ5IGZ1bmN0aW9ucyB0byB0aGlzIGluc3RhbmNlIGZvciBzdGF0aWMgdXNlLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGF0dGFjaExpYnJhcnlUb1NlbGYgKCkge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIGxpYnMpXG4gICAgICAgICAgICAgICAgaWYobGlicy5oYXNPd25Qcm9wZXJ0eShpKSAmJiAhc2VsZltpXSkgc2VsZltpXSA9IGxpYnNbaV07XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFByb3RvIChvKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIElFIHRocm93IHdoZW4gY2FsbGluZyBPYmplY3QuZ2V0UHJvdG90eXBlT2Ygb24gcHJpbWl0aXZlIHZhbHVlcy4uLlxuICAgICAgICAgICAgICAgIC8vIEJ1dCBub3Qgd2l0aCBkZXByZWNhdGVkIF9fcHJvdG9fXyA/Pz9cbiAgICAgICAgICAgICAgICByZXR1cm4gby5fX3Byb3RvX18gfHwgby5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZHMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIHRoZSBwcmltaXRpdmUgb2JqZWN0IHByb3RvdHlwZXMuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzICgpIHtcbiAgICAgICAgICAgIGlmKCFhdHRhY2hlZCkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCBoYW5kbGUsIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IHVzZXJzIHRvIG92ZXJ3cml0ZSB0aGUgaGFuZGxlIG9uIGEgcGVyIGluc3RhbmNlIGJhc2lzLi4uXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRoaXNbaGFuZGxlXSAhPT0gdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBoYW5kbGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZSAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgICAgIDogdlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIHRoZSBsaWJwIGxpYnJhcnkuLi5cbiAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2NJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm90byA9IGdldFByb3RvKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNJZCAgID0gcHJvdG8uY29uc3RydWN0b3IuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWIgICA9IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgICAgID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0ICA9IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFRoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2NJZCA9IHByb3RvLmNvbnN0cnVjdG9yLl9fZ2V0X3Byb3RvbGliX2lkX187XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2FjaGVkW2NjSWRdICYmIGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFtjY0lkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihjYWNoZWRbY2NJZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG0gaW4gY2FjaGVkW2NjSWRdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2FjaGVkW2NjSWRdLmhhc093blByb3BlcnR5KG0pKSBsaWJbbV0gPSBjYWNoZWRbY2NJZF1bbV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWluaGVyaXRhbmNlQ2hhaW5bY0lkXSkgaW5oZXJpdGFuY2VDaGFpbltjSWRdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaGVyaXRhbmNlQ2hhaW5bY0lkXSA9IGluaGVyaXRhbmNlQ2hhaW5bY2NJZF0uY29uY2F0KGluaGVyaXRhbmNlQ2hhaW5bY0lkXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlZFtjSWRdID0gbGliO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGliO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWxpYnBbY2NJZF0pIGxpYnBbY2NJZF0gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG0gaW4gbGlicFtjY0lkXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxpYnBbY2NJZF0uaGFzT3duUHJvcGVydHkobSkpIGxpYlttXSA9IGxpYnBbY2NJZF1bbV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFpbmhlcml0YW5jZUNoYWluW2NjSWRdKSBpbmhlcml0YW5jZUNoYWluW2NjSWRdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmhlcml0YW5jZUNoYWluW2NJZF0udW5zaGlmdChjY0lkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZWRbY0lkXSA9IGxpYjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdCA9IGNjSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHByb3RvID0gZ2V0UHJvdG8ocHJvdG8pKTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYi5fX3Byb3RvbGliX2NJZF9fID0gY0lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIHRoZSBwcmltaXRpdmUgb2JqZWN0IHByb3RvdHlwZXMuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzICgpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCBoYW5kbGUsIHsgdmFsdWU6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgIGRlbGV0ZSBPYmplY3QucHJvdG90eXBlW2hhbmRsZV07XG4gICAgICAgICAgICBhdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmVzIHRoZSBsYXN0IGl0ZW0gZnJvbSB0aGUgJ3RoaXNQb2ludGVyU3RhY2snIGFuZCBpbnZva2VzIHRoZSBwcm92aWRlZCBjYWxsYmFjayB3aXRoIGl0LlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBjdXJyZW50ICd0aGlzJyB2YWx1ZS5cbiAgICAgICAgICogQHJldHVybiBUaGUgcmVzdWx0IG9mIHRoZSBpbnZvY2F0aW9uIG9mIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldFRoaXNWYWx1ZUFuZEludm9rZSAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjdXJyZW50VGhpcyAhPT0gdW5kZWZpbmVkICYmIGN1cnJlbnRUaGlzICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICB0eXBlb2YgY3VycmVudFRoaXMgPT09ICdvYmplY3QnID8gY3VycmVudFRoaXMgOiBjdXJyZW50VGhpcy52YWx1ZU9mKCkgOiBjdXJyZW50VGhpc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBoYW5kbGVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGggVGhlIG5ldyBoYW5kbGVcbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldEhhbmRsZSA9IGZ1bmN0aW9uIChoKSB7XG4gICAgICAgICAgICBzZWxmLnVubG9hZCgpO1xuICAgICAgICAgICAgaWYodHlwZW9mIGggPT09ICdzdHJpbmcnKSBoYW5kbGUgPSBoO1xuICAgICAgICAgICAgc2VsZi5sb2FkKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkcyBhIGxpYnJhcnkgbWV0aG9kIHRvIGEgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gW2NvbnN0cj1PYmplY3RdIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgb2JqZWN0IHRvIGV4dGVuZC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGxpYnJhcnkgbWV0aG9kIHRvIGFkZC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1ldGhvZCB3YXMgYWRkZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXh0ZW5kID0gZnVuY3Rpb24gKGNvbnN0ciwgbmFtZSwgc3RhdGljTmFtZXNwYWNlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBjb25zdHI7XG4gICAgICAgICAgICAgICAgY29uc3RyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgICAgIHx8ICEoY2FsbGJhY2sgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBjb25zdHIgIT09ICdmdW5jdGlvbicgfHwgY29uc3RyID09PSBjYWxsYmFjaykgY29uc3RyID0gT2JqZWN0O1xuXG4gICAgICAgICAgICB2YXIgY29uc3RydWN0b3JJZCAgID0gY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gdHlwZW9mIHN0YXRpY05hbWVzcGFjZSA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgICAgICAgICBzdGF0aWNOYW1lc3BhY2UgOiB0eXBlb2YgY29uc3RyLm5hbWUgPT09ICdzdHJpbmcnID8gY29uc3RyLm5hbWUgOiBudWxsO1xuXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBPYmplY3Q6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ2FycmF5JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gU3RyaW5nOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gTnVtYmVyOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnbnVtYmVyJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gRnVuY3Rpb246XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IERhdGU6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdkYXRlJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKCFsaWJwW2NvbnN0cnVjdG9ySWRdKSAgIGxpYnBbY29uc3RydWN0b3JJZF0gICA9IHt9O1xuICAgICAgICAgICAgaWYoIWxpYnNbY29uc3RydWN0b3JOYW1lXSkgbGlic1tjb25zdHJ1Y3Rvck5hbWVdID0ge307XG5cbiAgICAgICAgICAgIC8vIEFkZCBzdGF0aWMgdmVyc2lvbi4uXG4gICAgICAgICAgICB2YXIgc3RhdGljVmVyc2lvbiA9IGZ1bmN0aW9uIChvKSB7IHJldHVybiBjYWxsYmFjay5hcHBseShvLCBhcmd1bWVudHMpOyB9O1xuICAgICAgICAgICAgaWYoY29uc3RydWN0b3JOYW1lKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhpcyBwcm9wZXJ0eSBzbyB3ZSBjYW4gcmVtb3ZlIGl0IGxhdGVyIGlmIFByb3RvTGliLnJlbW92ZSBpcyBjYWxsZWQgb24gaXQuLi5cbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29uc3RyLCAnX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX18nLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBjb25zdHJ1Y3Rvck5hbWVcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGxpYnNbY29uc3RydWN0b3JOYW1lXVtuYW1lXSA9IHN0YXRpY1ZlcnNpb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlIGFsd2F5cyBhZGQgZXh0ZW5kZWQgZnVuY3Rpb25zIHRvIGxpYnMubXlcbiAgICAgICAgICAgIGxpYnMubXlbbmFtZV0gPSBzdGF0aWNWZXJzaW9uO1xuXG4gICAgICAgICAgICAvLyBBZGQgaW5zdGFuY2UgdmVyc2lvbi4uLlxuICAgICAgICAgICAgbGlicFtjb25zdHJ1Y3RvcklkXVtuYW1lXSAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoYywgYXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yKGNvbnN0cik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyBhIGxpYnJhcnkgbWV0aG9kIGZyb20gYSBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RyIFRoZSBjb25zdHJ1Y3RvciB0byByZW1vdmUgdGhlIG1ldGhvZCBmcm9tLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgbGlicmFyeSBtZXRob2QgdG8gcmVtb3ZlLlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBtZXRob2Qgd2FzIHJlbW92ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVtb3ZlID0gZnVuY3Rpb24gKGNvbnN0ciwgbmFtZSkge1xuICAgICAgICAgICAgaWYodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBjb25zdHIgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgdmFyIHVpZCA9IGNvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fO1xuICAgICAgICAgICAgaWYobGlicFt1aWRdICYmIGxpYnBbdWlkXVtuYW1lXSkge1xuICAgICAgICAgICAgICAgIGxpYnBbdWlkXVtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbGlicFt1aWRdW25hbWVdO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gc3RhdGljIG5hbWVzcGFjZSwgaWYgYWRkZWQgdGhlcmUuLi5cbiAgICAgICAgICAgICAgICBpZihsaWJzW2NvbnN0ci5fX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfX10gJiYgbGlic1tjb25zdHIuX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX19dW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBsaWJzLm15XG4gICAgICAgICAgICAgICAgaWYobGlicy5teVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm15W25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlicy5teVtuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yKGNvbnN0cik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIHByb3RvdHlwZSBsaWJyYXJ5IHJlZmVyZW5jZSBmcm9tIHRoZSBvYmplY3QgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudW5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBQcm90b0xpYltoYW5kbGVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGVsZXRlIFByb3RvTGliW2hhbmRsZV07XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwbGllcyB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSBhbmQgYWxsIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgICogdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBhdHRhY2hMaWJyYXJ5VG9TZWxmKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRzIHRoZSBsaWJyYXJ5IGNhY2hlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGtpbGwgdGhlIGNhY2hlIGZvci5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5raWxsQ2FjaGUgPSBmdW5jdGlvbiAoY29uc3RyKSB7XG4gICAgICAgICAgICBpZihjb25zdHIpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFtjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZWRbY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX19dO1xuXG4gICAgICAgICAgICAgICAgICAgIGluaGVyaXRhbmNlQ2hhaW5bY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX19dID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaW5oZXJpdGFuY2VDaGFpbltjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkID0ge307XG4gICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbiA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgdGhlIGxpYnJhcnkgdG8gdGhlIG9iamVjdCBwcm90b3R5cGUsIGFuZCBhdHRhY2ggYWxsIHRoZSBzdGF0aWMgZnVuY3Rpb25zXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlLi4uXG4gICAgICAgIHNlbGYubG9hZCgpO1xuXG4gICAgICAgIC8vIEFkZCB0aGlzIGluc3RhbmNlIHRvIHRoZSBQcm90b2xpYiBcImNvbnRhaW5lclwiXG4gICAgICAgIFByb3RvbGlic1toYW5kbGVdID0gc2VsZjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIFByb3RvTGliIGxpYnJhcnkgYnkgaGFuZGxlLCBvciwgYW4gaW5zdGFuY2Ugd2l0aCB0aGUgZ2l2ZW4gaGFuZGxlIGRvZXNuJ3QgZXhpc3QsIGNyZWF0ZXMgb25lLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2hhbmRsZT0nXyddIFRoZSBoYW5kbGUgZm9yIHRoZSBpbnN0YW5jZSB0byBnZXQgb3IgY3JlYXRlLlxuICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgbmV3IChvciByZXRyaWV2ZWQpIFByb3RvTGliIGluc3RhbmNlLlxuICAgICAqL1xuICAgIFByb3RvTGliLmdldCA9IGZ1bmN0aW9uIGdldCAoaGFuZGxlKSB7XG4gICAgICAgIGhhbmRsZSA9IHR5cGVvZiBoYW5kbGUgPT09ICdzdHJpbmcnID8gaGFuZGxlIDogJ18nO1xuICAgICAgICByZXR1cm4gUHJvdG9saWJzW2hhbmRsZV0gfHwgbmV3IFByb3RvTGliKGhhbmRsZSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZXMgdGhlIGNhY2hlIGZvciB0aGUgUHJvdG9saWIgaW5zdGFuY2Ugd2l0aCB0aGUgZ2l2ZW4gaGFuZGxlLiBJZiBubyBoYW5kbGUgaXMgc3BlY2lmaWVkLFxuICAgICAqIHRoZSBjYWNoZSBmb3IgYWxsIGluc3RhbmNlcyB3aWxsIGJlIGRlbGV0ZWQuXG4gICAgICogQHBhcmFtIHtTdHJpbmc9fSBoYW5kbGUgVGhlIGhhbmRsZSBvZiB0aGUgaW5zdGFuY2UgdG8gZGVsZXRlXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBQcm90b0xpYiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIFByb3RvTGliLmtpbGxDYWNoZSA9IGZ1bmN0aW9uIGtpbGxDYWNoZSAoaGFuZGxlKSB7XG4gICAgICAgIGlmKFByb3RvbGlic1toYW5kbGVdIGluc3RhbmNlb2YgUHJvdG9MaWIpIHtcbiAgICAgICAgICAgIFByb3RvbGlic1toYW5kbGVdLmtpbGxDYWNoZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoIWhhbmRsZSkge1xuICAgICAgICAgICAgZm9yKHZhciBuIGluIFByb3RvbGlicykge1xuICAgICAgICAgICAgICAgIGlmKFByb3RvbGlicy5oYXNPd25Qcm9wZXJ0eShuKSkgUHJvdG9saWJzW25dLmtpbGxDYWNoZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm90b0xpYjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBjb25zdHJ1Y3RvciBmb3IgYWxsIFByb3RvTGliIGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0ge1N0cmluZz19IGNvbnN0ciBUaGUgY29uc3RydWN0b3IgY2FjaGUgdG8gZGVsZXRlXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBQcm90b0xpYiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIFByb3RvTGliLmtpbGxDYWNoZUZvckNvbnN0cnVjdG9yID0gZnVuY3Rpb24ga2lsbENhY2hlRm9yQ29uc3RydWN0b3IgKGNvbnN0cikge1xuICAgICAgICBmb3IodmFyIG4gaW4gUHJvdG9saWJzKSB7XG4gICAgICAgICAgICBpZihQcm90b2xpYnMuaGFzT3duUHJvcGVydHkobikpIFByb3RvbGlic1tuXS5raWxsQ2FjaGUoY29uc3RyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvdG9MaWI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIE9iamVjdFtoYW5kbGVdIGFuZCByZWxlYXNlcyB0aGUgUHJvdG9MaWIgaW5zdGFuY2UgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbiAoaWZcbiAgICAgKiBpdCdzIG5vdCByZWZlcmVuY2VzIGVsc2V3aGVyZSkuXG4gICAgICogQHBhcmFtIHtTdHJpbmc9fSBbaGFuZGxlPSdfJ10gVGhlIGhhbmRsZSBvZiB0aGUgUHJvdG9MaWIgaW5zdGFuY2UgdG9cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIFByb3RvTGliIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgUHJvdG9MaWIuZGVzdHJveSA9IGZ1bmN0aW9uIGRlc3Ryb3kgKGhhbmRsZSkge1xuICAgICAgICBoYW5kbGUgPSB0eXBlb2YgaGFuZGxlID09PSAnc3RyaW5nJyA/IGhhbmRsZSA6ICdfJztcbiAgICAgICAgaWYodHlwZW9mIFByb3RvbGlic1toYW5kbGVdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgUHJvdG9saWJzW2hhbmRsZV0udW5sb2FkKCk7XG4gICAgICAgICAgICBQcm90b2xpYnNbaGFuZGxlXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSBQcm90b2xpYnNbaGFuZGxlXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvdG9MaWI7XG4gICAgfTtcblxuICAgIHJldHVybiAhSVNfQlJPV1NFUiA/XG4gICAgICAgIG1vZHVsZS5leHBvcnRzICA9IFByb3RvTGliIDpcbiAgICAgICAgd2luZG93LlByb3RvTGliID0gUHJvdG9MaWIgO1xufSgpKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIGxpYnAgKGxpYnMsIGdldFRoaXNWYWx1ZUFuZEludm9rZSkge1xuICAgICAgICB2YXIgbGlicCA9IHtcbiAgICAgICAgICAgIHN0cmluZzoge1xuXG4gICAgICAgICAgICAgICAgY2FtZWxpemU6IGZ1bmN0aW9uIGNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGVjYW1lbGl6ZTogZnVuY3Rpb24gZGVjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5kZWNhbWVsaXplKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZUZyb21TdHJpbmc6IGZ1bmN0aW9uIGRpZmZlcmVuY2VGcm9tU3RyaW5nIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZGlmZmVyZW5jZUZyb21TdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwbGFjZVRva2VuczogZnVuY3Rpb24gcmVwbGFjZVRva2VucyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBsYWNlU3RyaW5nVG9rZW5zKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0U3RyaW5nOiBmdW5jdGlvbiBpbnRlcnNlY3RTdHJpbmcgKG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5pbnRlcnNlY3RTdHJpbmcocywgb3RoZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQgKHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXBlYXQocywgdGltZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcnRyaW06IGZ1bmN0aW9uIHJ0cmltICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5ydHJpbShzLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGx0cmltOiBmdW5jdGlvbiBsdHJpbSAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubHRyaW0ocywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRW5jb2RlOiBmdW5jdGlvbiBodG1sRW5jb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxFbmNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodG1sRGVjb2RlOiBmdW5jdGlvbiBodG1sRGVjb2RlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmh0bWxEZWNvZGUocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZGRTbGFzaGVzOiBmdW5jdGlvbiBhZGRTbGFzaGVzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmFkZFNsYXNoZXMocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB1Y0ZpcnN0OiBmdW5jdGlvbiB1Y0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnVjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsY0ZpcnN0OiBmdW5jdGlvbiBsY0ZpcnN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmxjRmlyc3Qocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uIHRpdGxlQ2FzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy50aXRsZUNhc2Uocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzcGxpY2U6IGZ1bmN0aW9uIHNwbGljZSAoaW5kZXgsIGNvdW50LCBhZGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNwbGljZShzLCBpbmRleCwgY291bnQsIGFkZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBlbGxpcHNlczogZnVuY3Rpb24gZWxsaXBzZXNfIChsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZWxsaXBzZXMocywgbGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAoc3BsaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnNodWZmbGUocywgc3BsaXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gcmV2ZXJzZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZXZlcnNlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhvdXRUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhUcmFpbGluZ1NsYXNoICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhUcmFpbGluZ1NsYXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmVnZXhwU2FmZTogZnVuY3Rpb24gcmVnZXhwU2FmZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5yZWdleHBTYWZlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCwgZGVsaW0sIHByZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucGFkKHMsIGxlbmd0aCwgZGVsaW0sIHByZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBuZXdsaW5lVG9CcmVhazogZnVuY3Rpb24gbmV3bGluZVRvQnJlYWsgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcubmV3bGluZVRvQnJlYWsocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0YWJzVG9TcGFuOiBmdW5jdGlvbiB0YWJzVG9TcGFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnRhYnNUb1NwYW4ocyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB3b3JkV3JhcFRvTGVuZ3RoOiBmdW5jdGlvbiB3b3JkV3JhcFRvTGVuZ3RoICh3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud29yZFdyYXBUb0xlbmd0aChzLCB3aWR0aCwgcGFkbGVmdCwgcGFkcmlnaHQsIG9taXRGaXJzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhcnJheToge1xuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5zaHVmZmxlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pb246IGZ1bmN0aW9uIHVuaW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnVuaW9uLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kaWZmZXJlbmNlLmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW50ZXJzZWN0OiBmdW5jdGlvbiBpbnRlcnNlY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuaW50ZXJzZWN0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2l0aG91dDogZnVuY3Rpb24gd2l0aG91dCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS53aXRob3V0LmFwcGx5KGEsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlOiBmdW5jdGlvbiByb3RhdGUgKGRpcmVjdGlvbiwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCBkaXJlY3Rpb24sIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlTGVmdChhLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZVJpZ2h0IChhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlUmlnaHQoYSwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1ha2VVbmlxdWU6IGZ1bmN0aW9uIG1ha2VVbmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5tYWtlVW5pcXVlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS51bmlxdWUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmFzY2VuZGluZyhhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRlc2NlbmRpbmc6IGZ1bmN0aW9uIGRlc2NlbmRpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kZXNjZW5kaW5nKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBudW1iZXI6IHtcblxuICAgICAgICAgICAgICAgIHRvOiBmdW5jdGlvbiB0b18gKGspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzSW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMSkgaXNJbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlzSW50ID8gbGlicy5udW1iZXIucmFuZG9tSW50SW5SYW5nZShuLCBrKSA6IGxpYnMubnVtYmVyLnJhbmRvbU51bWJlckluUmFuZ2Uobiwgayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuaXNJbnQobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmYWN0b3JpYWw6IGZ1bmN0aW9uIGZhY3RvcmlhbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5mYWN0b3JpYWwobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjaG9vc2U6IGZ1bmN0aW9uIGNob29zZSAoaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2hvb3NlKG4sIGspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIucGFkKG4sIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzRnJvbTogZnVuY3Rpb24gZGF5c0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0Zyb206IGZ1bmN0aW9uIHNlY29uZHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tTm93OiBmdW5jdGlvbiBzZWNvbmRzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHllYXJzRnJvbTogZnVuY3Rpb24geWVhcnNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tOiBmdW5jdGlvbiBtb250aHNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbU5vdzogZnVuY3Rpb24gbW9udGhzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaG91cnNGcm9tOiBmdW5jdGlvbiBob3Vyc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbU5vdzogZnVuY3Rpb24gbWludXRlc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtb250aHNBZ286IGZ1bmN0aW9uIG1vbnRoc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkYXlzQWdvOiBmdW5jdGlvbiBkYXlzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzQWdvOiBmdW5jdGlvbiBzZWNvbmRzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzQWdvOiBmdW5jdGlvbiBtaW51dGVzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNBZ28obik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAob21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jbG9ja1RpbWUobiwgb21pdE1TKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZnVuY3Rpb246IHtcbiAgICAgICAgICAgICAgICBpbmhlcml0czogZnVuY3Rpb24gaW5oZXJpdHMgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZnVuY3Rpb24uaW5oZXJpdHMobywgcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgICAgIHVuaXF1ZUlkOiBmdW5jdGlvbiB1bmlxdWVJZCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC51bmlxdWVJZChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhpc3RvZ3JhbTogZnVuY3Rpb24gaGlzdG9ncmFtICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lmhpc3RvZ3JhbShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKHN0YXJ0LCBlbmQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5lYWNoKG8sIHN0YXJ0LCBlbmQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG9jY3VycmVuY2VzT2Y6IGZ1bmN0aW9uIG9jY3VycmVuY2VzT2YgKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm9jY3VycmVuY2VzT2Yobywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBrZXlzOiBmdW5jdGlvbiBrZXlzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmtleXMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzaXplOiBmdW5jdGlvbiBzaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bWVyaWM6IGZ1bmN0aW9uIGlzTnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXROdW1lcmljOiBmdW5jdGlvbiBnZXROdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldE51bWVyaWMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRW1wdHkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiBpc0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc1B1cmVPYmplY3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNTdHJpbmcobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gaXNVbmRlZmluZWQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNVbmRlZmluZWQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc051bGwobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Jvb2xlYW46IGZ1bmN0aW9uIGlzQm9vbGVhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0Jvb2xlYW4obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbiBpc0Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzRnVuY3Rpb24obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNBcmd1bWVudHMobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b051bWJlcjogZnVuY3Rpb24gdG9OdW1iZXIgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9OdW1iZXIobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0ludDogZnVuY3Rpb24gdG9JbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudG9JbnQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiB0b0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvQXJyYXkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBnZXRDYWxsYmFjazogZnVuY3Rpb24gZ2V0Q2FsbGJhY2sgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2sobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5yYW5kb20obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBldmVyeTogZnVuY3Rpb24gZXZlcnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYW55OiBmdW5jdGlvbiBhbnkgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmFueShvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiBmaXJzdCAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmlyc3Qobywgbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5sYXN0KG8sIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmluZENoaWxkQXRQYXRoOiBmdW5jdGlvbiBmaW5kQ2hpbGRBdFBhdGggKHBhdGgsIGRlbGltaXRlciwgZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZmluZENoaWxkQXRQYXRoKG8sIHBhdGgsIGRlbGltaXRlciwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gY2xvbmUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuY2xvbmUobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBvbmx5OiBmdW5jdGlvbiBvbmx5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5vbmx5LmFwcGx5KG8sIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uIHdoZXJlIChwcmVkaWNhdGVGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qud2hlcmUobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd2hlcmVLZXlzOiBmdW5jdGlvbiB3aGVyZUtleXMgKHByZWRpY2F0ZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC53aGVyZUtleXMobywgcHJlZGljYXRlRnVuY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW52ZXJ0OiBmdW5jdGlvbiBpbnZlcnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW52ZXJ0KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWF4OiBmdW5jdGlvbiBtYXggKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0Lm1heChvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1pbjogZnVuY3Rpb24gbWluIChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5taW4obywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzOiBmdW5jdGlvbiBfaW1wbGVtZW50cyAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pbXBsZW1lbnRzKG8sIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzT3duOiBmdW5jdGlvbiBpbXBsZW1lbnRzT3duIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmltcGxlbWVudHNPd24obywgbWV0aG9kKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRhdGU6IHtcbiAgICAgICAgICAgICAgICBhZHZhbmNlRGF5czogZnVuY3Rpb24gYWR2YW5jZURheXMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5kYXRlLmFkdmFuY2VEYXlzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZHZhbmNlTW9udGhzOiBmdW5jdGlvbiBhZHZhbmNlTW9udGhzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZGF0ZS5hZHZhbmNlTW9udGhzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBhZHZhbmNlWWVhcnM6IGZ1bmN0aW9uIGFkdmFuY2VZZWFycyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmRhdGUuYWR2YW5jZVllYXJzKGQsIG4sIGFkanVzdEZvcldlZWtlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5eXl5bW1kZDogZnVuY3Rpb24geXl5eW1tZGQgKGRlbGltKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmRhdGUueXl5eW1tZGQoZCwgZGVsaW0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5kYXRlLmNsb2NrVGltZShkLCAhIW9taXRNUyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgRXJyb3IgdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGJvb2xlYW46IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIEJvb2xlYW4gdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG1hdGg6IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIE1hdGggdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgUmVnRXhwIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGxpYnA7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzID0gbGlicDtcbn0oKSk7XG4iLCIoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGZ1bmN0aW9uIGxpYnMgKFByb3RvTGliKSB7XG4gICAgICAgIHZhciBJU19CUk9XU0VSID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcsXG4gICAgICAgICAgICBIQVNfT1MgICAgID0gSVNfQlJPV1NFUiA/IGZhbHNlIDogdHlwZW9mIHJlcXVpcmUoJ29zJykgPT09ICdvYmplY3QnO1xuXG4gICAgICAgIC8vIFVzZWQgaW4gT2JqZWN0LnNldFByb3RvdHlwZU9mIHBvbHlmaWxsIG9ubHlcbiAgICAgICAgdmFyIGV4Y2x1ZGUgPSBbJ2xlbmd0aCcsICduYW1lJywgJ2FyZ3VtZW50cycsICdjYWxsZXInLCAncHJvdG90eXBlJ107XG5cbiAgICAgICAgLy8gVXNlZCBpbiBPYmplY3Quc2V0UHJvdG90eXBlT2YgcG9seWZpbGwgb25seVxuICAgICAgICBmdW5jdGlvbiBiaW5kRnVuY3Rpb24obywgZm4pIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIGZuLmFwcGx5KG8sIGFyZ3VtZW50cyk7IH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VkIGluIE9iamVjdC5zZXRQcm90b3R5cGVPZiBwb2x5ZmlsbCBvbmx5XG4gICAgICAgIGZ1bmN0aW9uIGJpbmRQcm9wZXJ0eShvLCBwYXJlbnQsIHByb3ApIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBwcm9wLCB7XG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IHJldHVybiBwYXJlbnRbcHJvcF07IH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgcGFyZW50W3Byb3BdID0gdmFsOyB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIHByb3BlcnRpZXMgb24gYW4gb2JqIGZyb20gdGhlIGdpdmVuIHByb3RvdHlwZS5cbiAgICAgICAgICogVXNlZCBpbiB0aGUgY2FzZSB0aGF0IE9iamVjdC5zZXRQcm90b3R5cGVPZiBhbmQgT2JqZWN0Ll9fcHJvdG9fXyBpcyB1bmF2YWlsYWJsZSwgZS5nLiBvbmx5IElFIDwgMTFcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGVQcm9wZXJ0aWVzIChfc3ViLCBfc3VwZXIpIHtcbiAgICAgICAgICAgIHZhciBwcm9wcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKF9zdXBlciksXG4gICAgICAgICAgICAgICAgcHJvdG87XG5cbiAgICAgICAgICAgIF9zdWIuX19wcm90b19fID0gX3N1cGVyOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IHByb3BzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3AgPSBwcm9wc1tpXTtcblxuICAgICAgICAgICAgICAgIGlmKHByb3AgPT09ICdfX3Byb3RvX18nKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3RvID0gX3N1cGVyLl9fcHJvdG9fXztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihleGNsdWRlLmluZGV4T2YoaSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfc3ViLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdXBlckRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKF9zdXBlciwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc3VwZXJEZXNjcmlwdG9yLmdldCAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgX3N1cGVyW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3N1Yltwcm9wXSA9IGJpbmRGdW5jdGlvbihfc3ViLCBfc3VwZXJbcHJvcF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZFByb3BlcnR5KF9zdWIsIF9zdXBlciwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX3N1YjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBvbHlmaWxsIE9iamVjdC5zZXRQcm90b3R5cGVPZlxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gc2V0UHJvdG90eXBlT2ZQb2x5ZmlsbCAob2JqLCBwcm90bykge1xuICAgICAgICAgICAgaWYob2JqLl9fcHJvdG9fXykgeyAgICAgICAgIC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgICAgIG9iai5fX3Byb3RvX18gPSBwcm90bzsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0ZVByb3BlcnRpZXMob2JqLCBwcm90byk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbHRlcnMgRmlyZWZveCdzIEZ1bmN0aW9uLnRvU3RyaW5nKCkgcmVzdWx0cyB0byBtYXRjaCBDaHJvbWUvU2FmYXJpLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmdW5jdGlvbi5cbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgYWx0ZXJlZCBzdHJpbmcsIHdpdGggbmV3bGluZXMgcmVwbGFjZWQgYW5kICd1c2Ugc3RyaWN0JyByZW1vdmVkLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oPzpcXHIpP1xcbisvZywgJycpLnJlcGxhY2UoL1widXNlIHN0cmljdFwiO3wndXNlIHN0cmljdCc7L2csICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJRSBkb2Vzbid0IGFsbG93IE9iamVjdC5rZXlzIG9uIHByaW1pdGl2ZSB0eXBlcy4uLlxuICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmd8TnVtYmVyPn1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldEtleXMgKG8pIHtcbiAgICAgICAgICAgIHN3aXRjaCh0eXBlb2Ygbykge1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvID8gT2JqZWN0LmtleXMobykgOiBbXTtcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBvLmxlbmd0aDsgaSsrKSBrZXlzLnB1c2goaS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgTlVMTF9GVU5DVElPTiA9IGZ1bmN0aW9uIEVNUFRZX0NBTExCQUNLX1JFUExBQ0VNRU5UICgpIHt9O1xuXG4gICAgICAgIHZhciBsaWJzID0ge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0cmluZyBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RyaW5nOiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDYW1lbGl6ZXMgYWxsIG9mIHRoZSBwcm92aWRlZCBzdHJpbmcgYXJndW1lbnRzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSBzdHJpbmcgQSBsaXN0IG9mIHN0cmluZ3MgdG8gY2FtZWxpemUuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn0gQW4gYXJyYXkgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cywgd2l0aCBhbGwgc3RyaW5ncyBjYW1lbGl6ZWQuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2FtZWxpemU6IGZ1bmN0aW9uIGNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHMgPT09ICdmdW5jdGlvbicpIHMgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcocy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzID0gcy50b1N0cmluZygpLnJlcGxhY2UoL1teYS16MC05JF0vZ2ksICdfJykucmVwbGFjZSgvXFwkKFxcdykvZywgJyRfJDEnKS5zcGxpdCgvW1xcc19dKy9nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHMsIDEsIHMubGVuZ3RoLCBmdW5jdGlvbiAoaSwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tdID0gbGlicy5zdHJpbmcudWNGaXJzdChpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzID0gbGlicy5zdHJpbmcubGNGaXJzdChzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldC5sZW5ndGggPT09IDEgPyByZXRbMF0gOiByZXQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIERlY2FtZWxpemVzIGFsbCBvZiB0aGUgcHJvdmlkZWQgc3RyaW5nIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLlN0cmluZ30gc3RyaW5nIEEgbGlzdCBvZiBzdHJpbmdzIHRvIGRlY2FtZWxpemUuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn0gQW4gYXJyYXkgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cywgd2l0aCBhbGwgc3RyaW5ncyBkZWNhbWVsaXplZC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkZWNhbWVsaXplOiBmdW5jdGlvbiBkZWNhbWVsaXplICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHMgPT09ICdmdW5jdGlvbicpIHMgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcocy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzID0gcy50b1N0cmluZygpLnJlcGxhY2UoLyhbQS1aJF0pL2csIGZ1bmN0aW9uICgkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnICcgKyAodHlwZW9mICQgPT09ICdzdHJpbmcnID8gJC50b0xvd2VyQ2FzZSgpIDogJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2godHlwZW9mIHMgPT09ICdzdHJpbmcnID8gcy50cmltKCkgOiBzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQubGVuZ3RoID09PSAxID8gcmV0WzBdIDogcmV0O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGFsbCB0aGUgY2hhcmFjdGVycyBmb3VuZCBpbiBvbmUgc3RyaW5nIGJ1dCBub3QgdGhlIG90aGVyLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3RoZXIgVGhlIHN0cmluZyB0byBjb21wdXRlIHRoZSBkaWZmZXJlbmNlIGFnYWluc3QuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIGRpZmZlcmVuY2Ugc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2VGcm9tU3RyaW5nOiBmdW5jdGlvbiBkaWZmZXJlbmNlRnJvbVN0cmluZyAocywgb3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG90aGVyICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcyAhPT0gJ3N0cmluZycpIHJldHVybiBzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FyciA9IHMuc3BsaXQoJycpLCBvYXJyID0gb3RoZXIuc3BsaXQoJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5kaWZmZXJlbmNlRnJvbUFycmF5KHNhcnIsIG9hcnIpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXBsYWNlcyB0b2tlbnMgKHNuaXBwZXRzIG9mIHRleHQgd3JhcHBlZCBpbiBicmFja2V0cykgd2l0aCB0aGVpciB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHRva2VuIHJlcGxhY2VkIHZhbHVlcy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZXBsYWNlVG9rZW5zOiBmdW5jdGlvbiByZXBsYWNlVG9rZW5zIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmdlbmVyaWMucmVwbGFjZVN0cmluZ1Rva2VucyhzKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBvbmx5IHRoZSBjaGFyYWN0ZXJzIGNvbW1vbiB0byBib3RoIHN0cmluZ3NcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG90aGVyIFRoZSBzdHJpbmcgdG8gY29tcHV0ZSB0aGUgaW50ZXJzZWN0aW9uIGFnYWluc3QuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgaW50ZXJzZWN0aW9uIGJldHdlZW4gdGhlIHR3byBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGludGVyc2VjdFN0cmluZzogZnVuY3Rpb24gaW50ZXJzZWN0U3RyaW5nIChzLCBvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3RoZXIgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzICE9PSAnc3RyaW5nJykgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYXJyID0gcy5zcGxpdCgnJyksIG9hcnIgPSBvdGhlci5zcGxpdCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmludGVyc2VjdEFycmF5KHNhcnIsIG9hcnIpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXBlYXQgYSBzdHJpbmcgJ3RpbWVzJyB0aW1lcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVzIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByZXBlYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQgKHMsIHRpbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVzID0gcGFyc2VJbnQodGltZXMsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgdGltZXMgPSBpc05hTih0aW1lcykgfHwgIWlzRmluaXRlKHRpbWVzKSB8fCB0aW1lcyA8PSAwID8gMSA6IHRpbWVzO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBvcyA9IHM7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCB0aW1lczsgaSsrKSBzICs9IG9zO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmlnaHQgdHJpbXMgYSBzdHJpbmcuIFNhbWUgYXMgU3RyaW5nLnRyaW0sIGJ1dCBvbmx5IGZvciB0aGUgZW5kIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3doYXQ9J1xcXFxzKyddIFdoYXQgdG8gdHJpbS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByaWdodCB0cmltbWVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJ0cmltOiBmdW5jdGlvbiBydHJpbSAocywgd2hhdCkge1xuICAgICAgICAgICAgICAgICAgICB3aGF0ID0gdHlwZW9mIHdoYXQgPT09ICdzdHJpbmcnID8gd2hhdCA6ICdcXFxccysnO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKG5ldyBSZWdFeHAod2hhdCArICckJyksICcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogTGVmdCB0cmltcyBhIHN0cmluZy4gU2FtZSBhcyBTdHJpbmcudHJpbSwgYnV0IG9ubHkgZm9yIHRoZSBiZWdpbm5pbmcgb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbd2hhdD0nXFxcXHMrJ10gV2hhdCB0byB0cmltLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGxlZnQgdHJpbW1lZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBsdHJpbTogZnVuY3Rpb24gbHRyaW0gKHMsIHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hhdCA9IHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyA/IHdoYXQgOiAnXFxcXHMrJztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZShuZXcgUmVnRXhwKCdeJyArIHdoYXQpLCAnJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEVzY2FwZXMgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgSFRNTCBlc2NhcGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGh0bWxFbmNvZGU6IGZ1bmN0aW9uIGh0bWxFbmNvZGUgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICcmJyAgOiAnJmFtcDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzwnICA6ICcmbHQ7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICc+JyAgOiAnJmd0OycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnXCInICA6ICcmcXVvdDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1xcJycgOiAnJiMwMzk7J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bJjw+XCInXS9nLCBmdW5jdGlvbiAobSkgeyByZXR1cm4gbWFwW21dOyB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVW4tZXNjYXBlcyBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBIVE1MIGVzY2FwZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaHRtbERlY29kZTogZnVuY3Rpb24gaHRtbERlY29kZSAocykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFwID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJyZhbXA7JyAgOiAnJicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJmx0OycgICA6ICc8JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcmZ3Q7JyAgIDogJz4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyZxdW90OycgOiAnXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyYjMDM5OycgOiAnXFwnJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oJmFtcDt8Jmx0O3wmZ3Q7fCZxdW90O3wmIzAzOTspL2csIGZ1bmN0aW9uIChtKSB7IHJldHVybiBtYXBbbV07IH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDcmVhdGVzIGFuICdldmFsJyBzYWZlIHN0cmluZywgYnkgYWRkaW5nIHNsYXNoZXMgdG8gXCIsICcsIFxcdCwgXFxuLCBcXGYsIFxcciwgYW5kIHRoZSBOVUxMIGJ5dGUuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQSBzdHJpbmcgd2l0aCBzbGFzaGVzXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYWRkU2xhc2hlczogZnVuY3Rpb24gYWRkU2xhc2hlcyAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bXFxcXFwiJ1xcdFxcblxcZlxccl0vZywgJ1xcXFwkJicpLnJlcGxhY2UoL1xcdTAwMDAvZywgJ1xcXFwwJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGNhcGl0YWxpemVkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIHVwcGVyIGNhc2VkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHVjRmlyc3Q6IGZ1bmN0aW9uIHVjRmlyc3QgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBsb3dlcmNhc2VkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgbGV0dGVyIGxvd2VyIGNhc2VkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGxjRmlyc3Q6IGZ1bmN0aW9uIGxjRmlyc3QgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIGluIFRpdGxlIENhc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHRpdGxlIGNhc2VkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uIHRpdGxlQ2FzZSAocykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gocy5zcGxpdCgnICcpLCBmdW5jdGlvbiAodCkgeyBhcnIucHVzaChsaWJzLnN0cmluZy51Y0ZpcnN0KHQpKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnIuam9pbignICcpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTcGxpY2VzIGEgc3RyaW5nLCBtdWNoIGxpa2UgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCBUaGUgaW5kZXggdG8gYmVnaW4gc3BsaWNpbmcgdGhlIHN0cmluZyBhdFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8gZGVsZXRlXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFkZCBUaGUgc3RyaW5nIHRvIGFwcGVuZCBhdCB0aGUgc3BsaWNlZCBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3BsaWNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKHMsIGluZGV4LCBjb3VudCwgYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnNsaWNlKDAsIGluZGV4KSArIChhZGQgfHwgJycpICsgcy5zbGljZShpbmRleCArIGNvdW50KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJuIGEgdHJ1bmNhdGVkIHN0cmluZyB3aXRoIGVsbGlwc2VzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IGxlbmd0aCBUaGUgbGVuZ3RoIG9mIHRoZSBkZXNpcmVkIHN0cmluZy4gSWYgb21taXRlZCwgdGhlIHN0cmluZ3Mgb3JpZ2luYWwgbGVuZ3RoIHdpbGwgYmUgdXNlZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtwbGFjZT0nYmFjayddIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2Zyb250JyBhbmQgJ2JhY2snLiBTcGVjaWZ5aW5nICdmcm9udCcgd2lsbCB0cnVuY2F0ZSB0aGVcbiAgICAgICAgICAgICAgICAgKiBzdHJpbmcgYW5kIGFkZCBlbGxpcHNlcyB0byB0aGUgZnJvbnQsICdiYWNrJyAob3IgYW55IG90aGVyIHZhbHVlKSB3aWxsIGFkZCB0aGUgZWxsaXBzZXMgdG8gdGhlIGJhY2suXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZWxsaXBzZXM9Jy4uLiddIFRoZSBzdHJpbmcgdmFsdWUgb2YgdGhlIGVsbGlwc2VzLiBVc2UgdGhpcyB0byBhZGQgYW55dGhpbmcgb3RoZXIgdGhhbiAnLi4uJ1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEEgdHJ1bmNhdGVkIHN0cmluZyB3aXRoIGVsbGlwc2VzIChpZiBpdHMgbGVuZ3RoIGlzIGdyZWF0ZXIgdGhhbiAnbGVuZ3RoJylcbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBlbGxpcHNlczogZnVuY3Rpb24gZWxsaXBzZXNfIChzLCBsZW5ndGgsIHBsYWNlLCBlbGxpcHNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihwYXJzZUludChsZW5ndGgsIDEwKSkpIGxlbmd0aCA9IHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZihsZW5ndGggPCAwIHx8ICFpc0Zpbml0ZShsZW5ndGgpKSBsZW5ndGggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIGVsbGlwc2VzID0gdHlwZW9mIGVsbGlwc2VzID09PSAnc3RyaW5nJyA/IGVsbGlwc2VzIDogJy4uLic7XG4gICAgICAgICAgICAgICAgICAgIGlmKHMubGVuZ3RoIDw9IGxlbmd0aCkgcmV0dXJuIHM7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYobGVuZ3RoIDw9IGVsbGlwc2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VzLnN1YnN0cmluZygwLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoIXBsYWNlIHx8IHBsYWNlICE9PSAnZnJvbnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoMCwgbGVuZ3RoIC0gZWxsaXBzZXMubGVuZ3RoKSArIGVsbGlwc2VzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VzICsgcy5zdWJzdHIoMCwgbGVuZ3RoIC0gZWxsaXBzZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTaHVmZmxlcyBhIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3BsaXR0ZXIgQSBzdHJpbmcgdXNlZCB0byBzcGxpdCB0aGUgc3RyaW5nLCB0byB0b2tlbml6ZSBpdCBiZWZvcmUgc2h1ZmZsaW5nLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIG1peGVkIHVwIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChzLCBzcGxpdHRlcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IHMuc3BsaXQodHlwZW9mIHNwbGl0dGVyID09PSAnc3RyaW5nJyA/IHNwbGl0dGVyIDogJycpLCBuID0gYS5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VTcGxpdHMgPSBuIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBuIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0bXAgPSBhW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhW2ldID0gYVtqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFbal0gPSB0bXA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgcmVwbGFjZVNwbGl0czsgaysrKSBhLnNwbGljZShsaWJzLm51bWJlci5yYW5kb21JbnRJblJhbmdlKDAsIGEubGVuZ3RoKSwgMCwgc3BsaXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV2ZXJzZXMgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHJldmVyc2VkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZXZlcnNlOiBmdW5jdGlvbiByZXZlcnNlIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHMubGVuZ3RoIDwgNjQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IHMubGVuZ3RoOyBpID49IDA7IGktLSkgc3RyICs9IHMuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU3RyaXBzIHRoZSB0cmFpbGluZyBzbGFzaGVzIGZyb20gYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIElmIHVzaW5nIE5vZGUuanMsIGl0IHdpbGwgcmVwbGFjZSB0aGUgdHJhaWxpbmcgc2xhc2ggYmFzZWQgb24gdGhlIHZhbHVlIG9mIG9zLnBsYXRmb3JtXG4gICAgICAgICAgICAgICAgICogKGkuZS4gaWYgd2luZG93cywgJ1xcXFwnIHdpbGwgYmUgcmVwbGFjZWQsICcvJyBvdGhlcndpc2UpLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdpdGhvdXRUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRob3V0VHJhaWxpbmdTbGFzaCAocykge1xuICAgICAgICAgICAgICAgICAgICBpZighSVNfQlJPV1NFUiAmJiBIQVNfT1MgJiYgcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykgcmV0dXJuIHMucmVwbGFjZSgvXFxcXCskLywgJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWRkIGEgdHJhaWxpbmcgc2xhc2ggdG8gYSBzdHJpbmcsIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBoYXZlIG9uZS5cbiAgICAgICAgICAgICAgICAgKiBJZiB1c2luZyBOb2RlLmpzLCBpdCB3aWxsIHJlcGxhY2UgdGhlIHRyYWlsaW5nIHNsYXNoIGJhc2VkIG9uIHRoZSB2YWx1ZSBvZiBvcy5wbGF0Zm9ybVxuICAgICAgICAgICAgICAgICAqIChpLmUuIGlmIHdpbmRvd3MsICdcXFxcJyB3aWxsIGJlIHJlcGxhY2VkLCAnLycgb3RoZXJ3aXNlKS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHN0cmluZyB3aXRob3V0IGEgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd2l0aFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uIHdpdGhUcmFpbGluZ1NsYXNoIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFJU19CUk9XU0VSICYmIEhBU19PUyAmJiByZXF1aXJlKCdvcycpLnBsYXRmb3JtID09PSAnd2luMzInKSByZXR1cm4gbGlicy5zdHJpbmcud2l0aG91dFRyYWlsaW5nU2xhc2gocykgKyAnXFxcXCc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKSArICcvJztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRXNjYXBlcyByZWd1bGFyIGV4cHJlc3Npb24gc3BlY2lhbCBjaGFyYWN0ZXJzLiBUaGlzIGlzIHVzZWZ1bCBpcyB5b3Ugd2lzaCB0byBjcmVhdGUgYSBuZXcgcmVndWxhciBleHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICogZnJvbSBhIHN0b3JlZCBzdHJpbmcgdmFsdWUuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZWd1bGFyIGV4cHJlc3Npb24gc2FmZSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZWdleHBTYWZlOiBmdW5jdGlvbiByZWdleHBTYWZlIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBQYWRzIGEgc3RyaW5nIHdpdGggJ2RlbGltJyBjaGFyYWN0ZXJzIHRvIHRoZSBzcGVjaWZpZWQgbGVuZ3RoLiBJZiB0aGUgbGVuZ3RoIGlzIGxlc3MgdGhhbiB0aGUgc3RyaW5nIGxlbmd0aCxcbiAgICAgICAgICAgICAgICAgKiB0aGUgc3RyaW5nIHdpbGwgYmUgdHJ1bmNhdGVkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIFRoZSBsZW5ndGggdG8gcGFkIHRoZSBzdHJpbmcgdG8uIElmIGxlc3MgdGhhdCB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcsIHRoZSBzdHJpbmcgd2lsbFxuICAgICAgICAgICAgICAgICAqIGJlIHJldHVybmVkLiBJZiBsZXNzIHRoYW4gdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nLCB0aGUgc3RyaW5nIHdpbGwgYmUgc2xpY2VkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2RlbGltPScgJ10gVGhlIGNoYXJhY3RlciB0byBwYWQgdGhlIHN0cmluZyB3aXRoLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtwcmU9ZmFsc2VdIElmIHRydWUsIHRoZSBwYWRkaW5nIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nLCBvdGhlcndpc2UgdGhlIHBhZGRpbmdcbiAgICAgICAgICAgICAgICAgKiB3aWxsIGJlIGFkZGVkIHRvIHRoZSBlbmQuXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHBhZGRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAocywgbGVuZ3RoLCBkZWxpbSwgcHJlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpLCB0aGlzTGVuZ3RoID0gcy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWRlbGltKSBkZWxpbSA9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgaWYobGVuZ3RoID09PSAwKSByZXR1cm4gJyc7IGVsc2UgaWYoaXNOYU4ocGFyc2VJbnQobGVuZ3RoLCAxMCkpKSByZXR1cm4gcztcblxuICAgICAgICAgICAgICAgICAgICBsZW5ndGggPSBwYXJzZUludChsZW5ndGgsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYobGVuZ3RoIDwgdGhpc0xlbmd0aCkgcmV0dXJuICFwcmUgPyBzLnNsaWNlKDAsIGxlbmd0aCkgOiBzLnNsaWNlKC1sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHByZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgbGVuZ3RoIC0gdGhpc0xlbmd0aDsgaSsrKSBzID0gZGVsaW0gKyBzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgbGVuZ3RoIC0gdGhpc0xlbmd0aDsgaSsrKSBzICs9IGRlbGltO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXBsYWNlcyBuZXdsaW5lcyB3aXRoIGJyIHRhZ3MuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIG5ld2xpbmVzIGNvbnZlcnRlZCB0byBiciB0YWdzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG5ld2xpbmVUb0JyZWFrOiBmdW5jdGlvbiBuZXdsaW5lVG9CcmVhayAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oXFxyXFxufFxcbikvZywgJzxicj4nKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVwbGFjZXMgdGFicyB3aXRoIGEgc3BhbiBlbGVtZW50IHdpdGggdGhlIGNsYXNzICd0YWInXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyB3aXRoIHRhYnMgY29udmVydGVkIHRvIHNwYW5zIHdpdGggdGhlIGNsYXNzICd0YWInXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdGFic1RvU3BhbjogZnVuY3Rpb24gdGFic1RvU3BhbiAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXHQvZywgJzxzcGFuIGNsYXNzPVwidGFiXCI+PC9zcGFuPicpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZGp1c3RzIGEgc3RyaW5nIHRvIGZpdCB3aXRoaW4gdGhlIGNvbmZpbmVzIG9mICd3aWR0aCcsIHdpdGhvdXQgYnJlYWtpbmcgd29yZHMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2xlbmd0aD0xMjBdIFRoZSBsZW5ndGggdG8gd29yZCB3cmFwIHRoZSBzdHJpbmcgdG8uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcGFkbGVmdD0wXSBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgdG8gcGFkIHRoZSBzdHJpbmcgb24gdGhlIGxlZnRcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtwYWRyaWdodD0wXSBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgdG8gcGFkIHRoZSBzdHJpbmcgb24gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gb21pdEZpcnN0IElmIHRydWUsIHRoZSBmaXJzdCBsaW5lIHdpbGwgbm90IGJlIHBhZGRlZCBsZWZ0XG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIGFkanVzdGVkIGFuZCBwYWRkZWQgZm9yIHRoZSBzdGRvdXQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd29yZFdyYXBUb0xlbmd0aDogZnVuY3Rpb24gd29yZFdyYXBUb0xlbmd0aCAocywgd2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYocGFkcmlnaHQgPT09IHVuZGVmaW5lZCAmJiBwYWRsZWZ0KSBwYWRyaWdodCA9IHBhZGxlZnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcGFkbGVmdCAgPSAhaXNOYU4ocGFyc2VJbnQocGFkbGVmdCwgIDEwKSkgPyBwYXJzZUludChwYWRsZWZ0LCAxMCkgIDogMDtcbiAgICAgICAgICAgICAgICAgICAgcGFkcmlnaHQgPSAhaXNOYU4ocGFyc2VJbnQocGFkcmlnaHQsIDEwKSkgPyBwYXJzZUludChwYWRyaWdodCwgMTApIDogMDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFkZGluZ0xlZnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IHBhZGxlZnQ7ICBuKyspIHBhZGRpbmdMZWZ0ICArPSAnICc7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHMgICA9ICFpc05hTihwYXJzZUludCh3aWR0aCwgMTApKSA/IGxlbmd0aCA6IDEyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyciAgICA9IHMuc3BsaXQoJyAnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gICA9IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4gICAgPSAhb21pdEZpcnN0ID8gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdCA6IGNvbHMgLSBwYWRyaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciAgICA9ICFvbWl0Rmlyc3QgPyBwYWRkaW5nTGVmdCA6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2xlbiAgID0gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdDtcblxuICAgICAgICAgICAgICAgICAgICB3aGlsZSgoaXRlbSA9IGFyci5zaGlmdCgpKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtLmxlbmd0aCA8IGxlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBpdGVtICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbiAtPSBpdGVtLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGl0ZW0ubGVuZ3RoID4gb2xlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBpdGVtLnN1YnN0cmluZygwLCBsZW4gLSAxKSArICctXFxuJyArIHBhZGRpbmdMZWZ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyci51bnNoaWZ0KGl0ZW0uc3Vic3RyaW5nKGxlbiwgaXRlbS5sZW5ndGggLSAxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gY29scyAtIHBhZHJpZ2h0IC0gcGFkbGVmdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxuJyArIHBhZGRpbmdMZWZ0ICsgaXRlbSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBjb2xzIC0gcGFkcmlnaHQgLSAxIC0gcGFkbGVmdCAtIGl0ZW0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEYXRlIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ2RheXNJblRoZUZ1dHVyZScgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkYXlzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiBkYXlzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGFkdmFuY2VEYXlzOiBmdW5jdGlvbiBhZHZhbmNlRGF5cyAoZCwgZGF5c0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZCBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICAgICAgZGF5c0luVGhlRnV0dXJlID0gZGF5c0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMoZGF5c0luVGhlRnV0dXJlKSA/IGRheXNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArIChkYXlzSW5UaGVGdXR1cmUgKiA4NjQwMDAwMCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAnbW9udGhzSW5UaGVGdXR1cmUnIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtb250aHNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIG1vbnRocyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgbW9udGhzLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGFkdmFuY2VNb250aHM6IGZ1bmN0aW9uIGFkdmFuY2VNb250aHMgKGQsIG1vbnRoc0luVGhlRnV0dXJlLCBhZGp1c3RGb3JXZWVrZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZCBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICAgICAgbW9udGhzSW5UaGVGdXR1cmUgPSBtb250aHNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKG1vbnRoc0luVGhlRnV0dXJlKSA/IG1vbnRoc0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKG1vbnRoc0luVGhlRnV0dXJlICogMjYyOTc0NjAwMCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBNb3ZlcyBhIGRhdGUgZm9yd2FyZCAneWVhcnNJblRoZUZ1dHVyZScgeWVhcnMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0geWVhcnNJblRoZUZ1dHVyZSBUaGUgbnVtYmVyIG9mIHllYXJzIGluIHRoZSBmdXR1cmUgdG8gYWR2YW5jZSB0aGUgZGF0ZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFthZGp1c3RGb3JXZWVrZW5kPWZhbHNlXSBXaGV0aGVyIG9yIG5vdCB0aGUgZGF0ZSBzaG91bGQgZmFsbCBvbiBhIHdlZWtlbmQgZGF5XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0RhdGV9IFRoZSBkYXRlLCBhZGp1c3RlZCB0aGUgbnVtYmVyIG9mIHNwZWNpZmllZCB5ZWFycy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhZHZhbmNlWWVhcnM6IGZ1bmN0aW9uIGFkdmFuY2VZZWFycyAoZCwgeWVhcnNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGQgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgICAgIHllYXJzSW5UaGVGdXR1cmUgPSB5ZWFyc0luVGhlRnV0dXJlICYmIGxpYnMuZ2VuZXJpYy5pc051bWVyaWMoeWVhcnNJblRoZUZ1dHVyZSkgPyB5ZWFyc0luVGhlRnV0dXJlIDogMTtcbiAgICAgICAgICAgICAgICAgICAgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgKHllYXJzSW5UaGVGdXR1cmUgKiAzMTUzNjAwMDAwMCkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkanVzdEZvcldlZWtlbmQgJiYgKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKGQuZ2V0RGF5KCkgPT09IDAgfHwgZC5nZXREYXkoKSA9PT0gNikgZC5zZXRUaW1lKGQuZ2V0VGltZSgpICsgODY0MDAwMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBkYXRlIGluIHRoZSB5eXl5LW1tLWRkIGZvcm1hdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVsaW09Jy0nXSBUaGUgZGVsaW1pdGVyIHRvIHVzZWQgdGhlIHNlcGFyYXRlIHRoZSBkYXRlIGNvbXBvbmVudHMgKGUuZy4gJy0nIG9yICcuJylcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgZGF0ZSBpbiB0aGUgeXl5eS1tbS1kZCBmb3JtYXQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgeXl5eW1tZGQ6IGZ1bmN0aW9uIHl5eXltbWRkIChkLCBkZWxpbSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGQgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGltID0gdHlwZW9mIGRlbGltICE9PSAnc3RyaW5nJyA/ICctJyA6IGRlbGltIDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZGQgICA9IGQuZ2V0RGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbW0gICA9IGQuZ2V0TW9udGgoKSArIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICB5eXl5ID0gZC5nZXRGdWxsWWVhcigpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGRkIDwgMTApIGRkID0gJzAnICsgZGQ7XG4gICAgICAgICAgICAgICAgICAgIGlmKG1tIDwgMTApIG1tID0gJzAnICsgbW07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB5eXl5ICsgZGVsaW0gKyBtbSArIGRlbGltICsgZGQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGEgZGF0ZSB0byB0aGUgSEg6TU06U1MuTVNFQyB0aW1lIGZvcm1hdFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW29taXRNUz1mYWxzZV0gV2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgTVMgcG9ydGlvbiBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGZvcm1hdHRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAoZCwgb21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZCBpbnN0YW5jZW9mIERhdGUpKSByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmNsb2NrVGltZShkLmdldFRpbWUoKSwgISFvbWl0TVMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTnVtYmVyIGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBudW1iZXI6IHtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gaW50ZWdlciBpbiByYW5nZSBbbWluLCBtYXhdIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBUaGUgbWluaW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXggVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IEEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmFuZG9tSW50SW5SYW5nZTogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IHBhcnNlSW50KG1pbiwgMTApO1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBwYXJzZUludChtYXgsIDEwKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtaW4pICYmICFpc0Zpbml0ZShtaW4pKSBtaW4gPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtYXgpICYmICFpc0Zpbml0ZShtYXgpKSBtYXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBmbG9hdCBpbiByYW5nZSBbbWluLCBtYXhdIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBUaGUgbWluaW11bSBwb3NzaWJsZSB2YWx1ZSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXggVGhlIG1heGltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IEEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmFuZG9tTnVtYmVySW5SYW5nZTogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IHBhcnNlRmxvYXQobWluKTtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gcGFyc2VGbG9hdChtYXgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1pbikgJiYgIWlzRmluaXRlKG1pbikpIG1pbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmKGlzTmFOKG1heCkgJiYgIWlzRmluaXRlKG1heCkpIG1heCA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlY3Vyc2l2ZWx5IGNvbXB1dGVzIHRoZSBmYWN0b3JpYWwgb2YgdGhlIG51bWJlciBuLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIEEgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge051bWJlcnxJbmZpbml0eX0gbiFcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBmYWN0b3JpYWw6IGZ1bmN0aW9uIGZhY3RvcmlhbCAobikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDApIHJldHVybiBOYU47XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPiAxNzApIHJldHVybiBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMCB8fCBuID09PSAxKSByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG4gKiBmYWN0b3JpYWwobiAtIDEpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlzIHRoZSBnaXZlbiBudW1iZXJzIGFyZSBpbnRlZ2Vyc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uTnVtYmVyfSBuIE51bWJlcnMuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiBhbGwgYXJndW1lbnRzIGFyZSBpbnRlZ2VycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzSW50OiBmdW5jdGlvbiBpc0ludCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIG4gPT09ICdudW1iZXInICYmIG4gJSAxID09PSAwICYmIG4udG9TdHJpbmcoKS5pbmRleE9mKCcuJykgPT09IC0xO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVjdXJzaXZlbHkgY29tcHV0ZXMgbiBjaG9vc2Ugay5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBBIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gayBBIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8SW5maW5pdHl9IG4gY2hvb3NlIGsuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2hvb3NlOiBmdW5jdGlvbiBjaG9vc2UgKG4sIGspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IHR5cGVvZiBrICE9PSAnbnVtYmVyJykgcmV0dXJuIE5hTjtcbiAgICAgICAgICAgICAgICAgICAgaWYoayA9PT0gMCkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAobiAqIGNob29zZShuIC0gMSwgayAtIDEpKSAvIGs7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFBhZHMgYSBudW1iZXIgd2l0aCBwcmVjZWVkaW5nIHplcm9zLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCBUaGUgZmluYWwgbGVuZ3RoIG9mIHRoZSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcGFkZGVkIG51bWJlciwgbm93IGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChuLCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnBhZChuLnRvU3RyaW5nKCksIGxlbmd0aCwgJzAnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkYXlzRnJvbTogZnVuY3Rpb24gZGF5c0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkYXlzRnJvbU5vdzogZnVuY3Rpb24gZGF5c0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tOiBmdW5jdGlvbiBzZWNvbmRzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldFNlY29uZHMoZGF0ZS5nZXRTZWNvbmRzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tTm93OiBmdW5jdGlvbiBzZWNvbmRzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgeWVhcnMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHllYXJzRnJvbTogZnVuY3Rpb24geWVhcnNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgeWVhcnMuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHllYXJzRnJvbU5vdzogZnVuY3Rpb24geWVhcnNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci55ZWFyc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbW9udGhzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tOiBmdW5jdGlvbiBtb250aHNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0TW9udGgoZGF0ZS5nZXRNb250aCgpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbW9udGhzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1vbnRoc0Zyb21Ob3c6IGZ1bmN0aW9uIG1vbnRoc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1vbnRoc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgaG91cnMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgVGhlIGRhdGUgdG8gY2hhbmdlLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IFRoZSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGhvdXJzRnJvbTogZnVuY3Rpb24gaG91cnNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0SG91cnMoZGF0ZS5nZXRIb3VycygpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgaG91cnMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaG91cnNGcm9tTm93OiBmdW5jdGlvbiBob3Vyc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmhvdXJzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb206IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0TWludXRlcyhkYXRlLmdldE1pbnV0ZXMoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1pbnV0ZXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbU5vdzogZnVuY3Rpb24gbWludXRlc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGUgdGltZSwgbW9udGhzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtb250aHNBZ286IGZ1bmN0aW9uIG1vbnRoc0FnbyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGUgdGltZSwgZGF5cyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGF5c0FnbzogZnVuY3Rpb24gZGF5c0FnbyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZGF5c0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGUgdGltZSwgc2Vjb25kcyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgc2Vjb25kc0FnbzogZnVuY3Rpb24gc2Vjb25kc0FnbyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGUgdGltZSwgbWludXRlcyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWludXRlc0FnbzogZnVuY3Rpb24gbWludXRlc0FnbyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubWludXRlc0Zyb21Ob3coLW4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUaGUgdGltZSwgeWVhcnMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHllYXJzQWdvOiBmdW5jdGlvbiB5ZWFyc0FnbyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29udmVydHMgYSBudW1iZXIgdG8gdGhlIEhIOk1NOlNTLk1TRUMgdGltZSBmb3JtYXRcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gdCBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBtZW1iZXJvZiBOdW1iZXIucHJvdG90eXBlXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW29taXRNUz1mYWxzZV0gV2hldGhlciBvciBub3QgdG8gaW5jbHVkZSB0aGUgTVMgcG9ydGlvbiBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGZvcm1hdHRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjbG9ja1RpbWU6IGZ1bmN0aW9uIGNsb2NrVGltZSAodCwgb21pdE1TKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtcywgc2VjcywgbWlucywgaHJzO1xuXG4gICAgICAgICAgICAgICAgICAgIG1zID0gdCAlIDEwMDA7XG4gICAgICAgICAgICAgICAgICAgIHQgPSAodCAtIG1zKSAvIDEwMDA7XG5cbiAgICAgICAgICAgICAgICAgICAgc2VjcyA9IHQgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgdCA9ICh0IC0gc2VjcykgLyA2MDtcblxuICAgICAgICAgICAgICAgICAgICBtaW5zID0gdCAlIDYwO1xuICAgICAgICAgICAgICAgICAgICBocnMgPSAodCAtIG1pbnMpIC8gNjA7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnBhZChocnMudG9TdHJpbmcoKSwgMikgICsgJzonICsgbGlicy5udW1iZXIucGFkKG1pbnMudG9TdHJpbmcoKSwgMikgKyAnOicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5udW1iZXIucGFkKHNlY3MudG9TdHJpbmcoKSwgMikgKyAoKG9taXRNUyA9PT0gdHJ1ZSkgPyAnJyA6ICcuJyArIGxpYnMubnVtYmVyLnBhZChtcy50b1N0cmluZygpLCAzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBGdW5jdGlvbiBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZnVuY3Rpb246IHtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAgICAgICAgICAgICAgICAgKiBNb3N0bHkgYm9ycm93ZWQgZGlyZWN0bHkgZnJvbSBOb2RlLmpzXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RydWN0b3IgVGhlIGluaGVyaXRpbmcgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBzdXBlckNvbnN0cnVjdG9yIFRoZSBwYXJlbnQgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGluaGVyaXRpbmcgY29uc3RydWN0b3JcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbmhlcml0czogZnVuY3Rpb24gaW5oZXJpdHMgKGNvbnN0cnVjdG9yLCBzdXBlckNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkIHx8IGNvbnN0cnVjdG9yID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0IG5vdCBiZSAnICsgJ251bGwgb3IgdW5kZWZpbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cGVyQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCB8fCBzdXBlckNvbnN0cnVjdG9yID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHN1cGVyIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0IG5vdCAnICsgJ2JlIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgc3VwZXIgY29uc3RydWN0b3IgdG8gXCJpbmhlcml0c1wiIG11c3QgJyArICdoYXZlIGEgcHJvdG90eXBlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3Iuc3VwZXJfID0gc3VwZXJDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKGNvbnN0cnVjdG9yLnByb3RvdHlwZSwgc3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEtpbGwgYWwgdGhlIFByb3RvTGliIGNhY2hlLCBmb3IgYWxsIGluc3RhbmNlcy4uLlxuICAgICAgICAgICAgICAgICAgICBQcm90b0xpYi5raWxsQ2FjaGVGb3JDb25zdHJ1Y3Rvcihjb25zdHJ1Y3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBcnJheSBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYXJyYXk6IHtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFNodWZmbGVzIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBtaXhlZCB1cCBhcnJheVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gYS5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpLCB0bXAgPSBhW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGFbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBhW2pdID0gdG1wO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb21wdXRlcyB0aGUgdW5pb24gYmV0d2VlbiB0aGUgY3VycmVudCBhcnJheSwgYW5kIGFsbCB0aGUgYXJyYXkgb2JqZWN0cyBwYXNzZWQgaW4uIFRoYXQgaXMsXG4gICAgICAgICAgICAgICAgICogdGhlIHNldCBvZiB1bmlxdWUgb2JqZWN0cyBwcmVzZW50IGluIGFsbCBvZiB0aGUgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGFyciBBIGxpc3Qgb2YgYXJyYXkgb2JqZWN0c1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgdW5pb24gc2V0IG9mIHRoZSBwcm92aWRlZCBhcnJheXMuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdW5pb246IGZ1bmN0aW9uIHVuaW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3Qub25seShsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksICdhcnJheScpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB1bmlvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYXJncywgZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGFycmF5LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHVuaW9uLmluZGV4T2YoaXRlbSkgPT09IC0xKSB1bmlvbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5pb247XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYWxsIHRoZSBpdGVtcyB1bmlxdWUgdG8gYWxsIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBhcnJheXMgVGhlIEFycmF5IG9iamVjdHMgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBvdGhlciBUaGUgYXJyYXkgdG8gY29tcHV0ZSB0aGUgZGlmZmVyZW5jZSBmcm9tLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIGl0ZW1zIHVuaXF1ZSB0byBlYWNoIGFycmF5LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2U6IGZ1bmN0aW9uIGRpZmZlcmVuY2UgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyYXlzID0gbGlicy5vYmplY3Qub25seShsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksICdhcnJheScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkoYXJyYXlzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGksIHNpbXBsZURpZmYgPSBbXTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXNbMF0ubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzWzFdLmluZGV4T2YoYXJyYXlzWzBdW2ldKSA9PT0gLTEpIHNpbXBsZURpZmYucHVzaChhcnJheXNbMF1baV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXNbMV0ubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzWzBdLmluZGV4T2YoYXJyYXlzWzFdW2ldKSA9PT0gLTEpIHNpbXBsZURpZmYucHVzaChhcnJheXNbMV1baV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2ltcGxlRGlmZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gYXJyYXlzWzBdLCBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAxOyBpIDwgYXJyYXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgZGlmZmVyZW5jZS5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFycmF5c1tpXS5pbmRleE9mKGRpZmZlcmVuY2Vbbl0pID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUucHVzaChkaWZmZXJlbmNlW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgYXJyYXlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9pZihhcnJheXNbaV0gIT09IGFycmF5cylcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZlcmVuY2UgPSBpbnRlcm1lZGlhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkaWZmZXJlbmNlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBpdGVtcyBjb21tb24gdG8gYWxsIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBpdGVtcyBUaGUgYXJyYXlzIGZyb20gd2hpY2ggdG8gY29tcHV0ZSB0aGUgaW50ZXJzZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIGl0ZW1zIGNvbW1vbiB0byBib3RoIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbnRlcnNlY3Q6IGZ1bmN0aW9uIGludGVyc2VjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnJheXMgPSBsaWJzLm9iamVjdC5vbmx5KGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSwgJ2FycmF5Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAxKSByZXR1cm4gbGlicy5vYmplY3QuY29weShhcnJheXNbMF0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnRlcnNlY3Rpb24gPSBhcnJheXNbMF0sIGludGVybWVkaWF0ZSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgYXJyYXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgaW50ZXJzZWN0aW9uLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJyYXlzW2ldLmluZGV4T2YoaW50ZXJzZWN0aW9uW25dKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZS5wdXNoKGludGVyc2VjdGlvbltuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSBhcnJheXNbaV0uaW5kZXhPZihpbnRlcnNlY3Rpb25bbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJheXNbaV0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gaW50ZXJtZWRpYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IGFycmF5IGZyb20gdGhlIGN1cnJlbnQgb25lLCB3aXRoIGFsbCBvY2N1cmVuY2VzIG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMgb21taXRlZC48YnI+XG4gICAgICAgICAgICAgICAgICogRm9yIGV4YW1wbGU6IDxlbT5bMSwyLDMsNCw1XS53aXRob3V0KDEpPC9lbT4gd2lsbCByZXR1cm4gPGVtPlsyLDMsNCw1XTwvZW0+XG4gICAgICAgICAgICAgICAgICogYW5kIDxlbT5bMSwgbnVsbCwgMiwgbnVsbCwgdW5kZWZpbmVkXS53aXRob3V0KG51bGwsIHVuZGVmaW5lZCk8L2VtPiB3aWxsIHJldHVybiA8ZW0+WzEsIDJdPC9lbT5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8Kj59IEEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHMgb21taXRlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aXRob3V0OiBmdW5jdGlvbiB3aXRob3V0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzICA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYSwgZnVuY3Rpb24gKHYpIHsgaWYoYXJncy5pbmRleE9mKHYpID09PSAtMSkgcmVzLnB1c2godik7IH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSb3RhdGVzIHRoZSBhcnJheSBsZWZ0IG9yIHJpZ2h0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLiBJZiB0aGUgZGlyZWN0aW9uIGlzIGxlZnQsIGl0IHdpbGwgc2hpZnQgb2ZmIHRoZVxuICAgICAgICAgICAgICAgICAqIGZpcnN0IDxlbT5uPC9lbT4gZWxlbWVudHMgYW5kIHB1c2ggdGhlbSB0byB0aGUgZW5kIG9mIHRoZSBhcnJheS4gSWYgcmlnaHQsIGl0IHdpbGwgcG9wIG9mZiB0aGUgbGFzdCA8ZW0+bjwvZW0+XG4gICAgICAgICAgICAgICAgICogaXRlbXMgYW5kIHVuc2hpZnQgdGhlbSBvbnRvIHRoZSBmcm9udCBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbZGlyZWN0aW9uPSdsZWZ0J10gVGhlIGRpcmVjdGlvbiB0byByb3RhdGUgYXJyYXkgbWVtYmVycy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byBzaGlmdFxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgc2hpZnRlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb3RhdGU6IGZ1bmN0aW9uIHJvdGF0ZSAoYSwgZGlyZWN0aW9uLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICYmIGxpYnMub2JqZWN0LmlzTnVtZXJpYyhkaXJlY3Rpb24pICYmICFhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFtb3VudCAgICA9IGRpcmVjdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFhbW91bnQgfHwgKGFtb3VudCAmJiAhbGlicy5vYmplY3QuaXNOdW1lcmljKGFtb3VudCkpKSBhbW91bnQgPSAxO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYW1vdW50OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRpcmVjdGlvbiAhPT0gJ3JpZ2h0JykgYS5wdXNoKGEuc2hpZnQoKSk7IGVsc2UgYS51bnNoaWZ0KGEucG9wKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSb3RhdGVzIHRoZSBhcnJheSBsZWZ0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgdXNlZnVsIGlmIHRyeWluZyB0byBjcmVhdGUgYSBjaXJjdWxhciBxdWV1ZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiB0aW1lcyB0byByb3RhdGUgdGhlIGFycmF5IGxlZnQuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCByb3RhdGVkIGxlZnQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcm90YXRlTGVmdDogZnVuY3Rpb24gcm90YXRlTGVmdCAoYSwgYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZShhLCAnbGVmdCcsIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IHJpZ2h0IHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRpbWVzLlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgdXNlZnVsIGlmIHRyeWluZyB0byBjcmVhdGUgYSBjaXJjdWxhciBxdWV1ZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFthbW91bnQ9MV0gVGhlIG51bWJlciBvZiB0aW1lcyB0byByb3RhdGUgdGhlIGFycmF5IGxlZnQuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCByb3RhdGVkIHJpZ2h0LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJvdGF0ZVJpZ2h0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsICdyaWdodCcsIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlbW92ZXMgZHVwbGljYXRlcyBmcm9tIHRoZSBjdXJyZW50IGFycmF5LlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PCo+fSBUaGUgY3VycmVudCBhcnJheSwgd2l0aCBkdXBsaWNhdGVzIHJlbW92ZWQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWFrZVVuaXF1ZTogZnVuY3Rpb24gbWFrZVVuaXF1ZSAoYSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2aXNpdGVkID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2aXNpdGVkLmluZGV4T2YoYVtpXSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRlZC5wdXNoKGFbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaS0tOyAvLyBTcGxpY2Ugd2lsbCBhZmZlY3QgdGhlIGludGVybmFsIGFycmF5IHBvaW50ZXIsIHNvIGZpeCBpdC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBHZXRzIGFuIGFycmF5IG9mIHVuaXF1ZSBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgd2l0aCBubyBkdXBsaWNhdGUgdmFsdWVzLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHVuaXF1ZTogZnVuY3Rpb24gdW5pcXVlIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpc2l0ZWQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZSAgPSBbXTtcblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2aXNpdGVkLmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pcXVlLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuaXF1ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU29ydHMgdGhlIGFycmF5IGluIGFzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIGEgZGVzdHJ1Y3RpdmUgYWN0aW9uLCBhbmQgd2lsbCBtb2RpZnkgdGhlIGFycmF5IGluIHBsYWNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGFycmF5IHNvcnRlZCBpbiBhc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYXNjZW5kaW5nOiBmdW5jdGlvbiBhc2NlbmRpbmcgKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYSAhPT0gdW5kZWZpbmVkICYmIGEgIT09IG51bGwpIGEgPSBhLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihiICE9PSB1bmRlZmluZWQgJiYgYiAhPT0gbnVsbCkgYiA9IGIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFNvcnRzIHRoZSBhcnJheSBpbiBkZXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgc29ydGVkIGluIGRlc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGVzY2VuZGluZzogZnVuY3Rpb24gZGVzY2VuZGluZyAoYSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhICE9PSB1bmRlZmluZWQgJiYgYSAhPT0gbnVsbCkgYSA9IGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGIgIT09IHVuZGVmaW5lZCAmJiBiICE9PSBudWxsKSBiID0gYi50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPiBiID8gLTEgOiBhIDwgYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFycmF5IGxpYnJhcnkgZnVuY3Rpb25zXG4gICAgICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBvYmplY3Q6IHtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEdldHMgdGhlIHVuaXF1ZSBpZCBvZiBhbiBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogT25seSB3b3JrcyBmb3Igbm9uLWxpdGVyYWxzLCBvdGhlcmlzZSBPYmplY3QuX19nZXRfcHJvdG9saWJfaWRfXyB3aWxsIHRocm93LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBvIFRoZSBvYmplY3QgdG8gZ2V0IHRoZSB1bmlxdWUgaWQgZm9yLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQSB1bmlxdWUgb2JqZWN0IGlkXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdW5pcXVlSWQ6IGZ1bmN0aW9uIHVuaXF1ZUlkIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvLl9fZ2V0X3Byb3RvbGliX2lkX187XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbXB1dGVzIHRoZSBmcmVxdWVuY2llcyBmb3IgZWFjaCBpdGVtIGluIGFsbCBvZiBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi4qfSBvYmpzIFRoZSBvYmplY3RzIHRvIGNvbXB1dGUgdGhlIGhpc3RvZ3JhbSBmcm9tLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdDxOdW1iZXI+fSBBbiBvYmplY3QgdGhhdCBoYXMgdGhlIGl0ZW1zIGZyb20gYWxsIG9mIHRoZSBhcmd1bWVudHMgYXMgaXRzIGtleXMgYW5kIHRoZWlyIGZyZXF1ZW5jaWVzIGFzIGl0J3MgdmFsdWVzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGhpc3RvZ3JhbTogZnVuY3Rpb24gaGlzdG9ncmFtICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGhpc3RvZ3JhbSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWhpc3RvZ3JhbVtvXSkgaGlzdG9ncmFtW29dID0gMTsgZWxzZSBoaXN0b2dyYW1bb10rKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighaGlzdG9ncmFtWydmdW5jdGlvbiddKSBoaXN0b2dyYW1bJ2Z1bmN0aW9uJ10gPSAxOyBlbHNlIGhpc3RvZ3JhbVtvXSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkobywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB0eXBlb2YgdmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgPT09IG51bGw6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gJ251bGwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiB2YWwgaW5zdGFuY2VvZiBBcnJheTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnYXJyYXknO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgdmFsID09PSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gdmFsLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgaGlzdG9ncmFtW3ZhbF0gIT09ICdudW1iZXInKSBoaXN0b2dyYW1bdmFsXSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpc3RvZ3JhbVt2YWxdKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGlzdG9ncmFtO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDcmVhdGVzIGEgc2hhbGxvdyBjb3B5IG9mICdpdGVtJy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0geyp9IGl0ZW0gVGhlIGl0ZW0gdG8gc2hhbGxvdyBcImNvcHlcIi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBBIHNoYWxsb3cgY29weSBvZiB0aGUgaXRlbS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjb3B5OiBmdW5jdGlvbiBjb3B5IChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb3B5O1xuICAgICAgICAgICAgICAgICAgICBpZighaXRlbSkgcmV0dXJuIGl0ZW07XG5cbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlb2YgaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29weSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGl0ZW0sIGZ1bmN0aW9uIChvLCBrKSB7IGNvcHlba10gPSBvOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG51bWJlciBvZiBvY2N1cmVuY2VzIG9mIFwid2hhdFwiXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsqfSBvYmogVGhlIGl0ZW0gdG8gY291bnQgdGhlIG9jY3VyZW5jZXMgb2YgXCJ3aGF0XCIgaW4uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsqfSB3aGF0IFRoZSBpdGVtIHRvIGNvdW50IHRoZSBvY2N1cmVuY2VzIG9mIHRoZSBpdGVtIGluIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBvY2N1cnJlbmNlc09mOiBmdW5jdGlvbiBvY2N1cnJlbmNlc09mIChvYmosIHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHJldHVybiAwO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG9iaiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvY2N1cnJlbmNlc09mKG9iai50b1N0cmluZygpLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvY2N1cnJlbmNlc09mKGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhvYmoudG9TdHJpbmcoKSksIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygd2hhdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVnZXhwID0gbmV3IFJlZ0V4cCh3aGF0LnRvU3RyaW5nKCksICdnJyksIG07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUobSA9IHJlZ2V4cC5leGVjKG9iaikpIGNvdW50Kys7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG9iaiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KG9iaiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtID09PSB3aGF0KSBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBvYmplY3QncyBrZXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nfE51bWJlcj59IFRoZSBvYmplY3QncyBrZXkgc2V0XG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAga2V5cyA6IGZ1bmN0aW9uIGtleXMgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobyA9PT0gdW5kZWZpbmVkIHx8IG8gPT09IG51bGwpIHJldHVybiBbXTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IGdldEtleXMobyksIGlkeDtcbiAgICAgICAgICAgICAgICAgICAgaWYobGlicy5vYmplY3QuaXNBcmd1bWVudHMobykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeCA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgJ3NpemUnIG9yICdsZW5ndGgnIG9mIGFuIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiA8dWw+XG4gICAgICAgICAgICAgICAgICogICAgICA8bGk+IFN0cmluZyAgIC0+IFRoZSBzdHJpbmcncyBsZW5ndGggIDwvbGk+XG4gICAgICAgICAgICAgICAgICogICAgICA8bGk+IE51bWJlciAgIC0+IFRoZSBudW1iZXIgb2YgZGlnaXRzIDwvbGk+XG4gICAgICAgICAgICAgICAgICogICAgICA8bGk+IE9iamVjdCAgIC0+IFRoZSBudW1iZXIgb2Yga2V5cyAgIDwvbGk+XG4gICAgICAgICAgICAgICAgICogICAgICA8bGk+IEFycmF5ICAgIC0+IFRoZSBudW1iZXIgb2YgaXRlbXMgIDwvbGk+XG4gICAgICAgICAgICAgICAgICogICAgICA8bGk+IEZ1bmN0aW9uIC0+IDEgICAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgICAgICogPC91bD5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWJlciBvZiBpdGVtcyB3aXRoaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzaXplOiBmdW5jdGlvbiBzaXplIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby50b1N0cmluZygpLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBvIGluc3RhbmNlb2YgQXJyYXk6XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiBvID09PSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbGlicy5vYmplY3QuaXNBcmd1bWVudHMobykgJiYgdHlwZW9mIG8ubGVuZ3RoICE9PSAndW5kZWZpbmVkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gby5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3QgY2FuIGJlIGNvbnZlcnRlZCB0byBhIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBudW1lcmljLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNOdW1lcmljOiBmdW5jdGlvbiBpc051bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KGl0ZW0pKSAmJiBpc0Zpbml0ZShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG9iamVjdCBhcyBhIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBnZXROdW1lcmljOiBmdW5jdGlvbiBnZXROdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcyA9IFtdLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCghaXNOYU4ocGFyc2VGbG9hdChpdGVtKSkgJiYgaXNGaW5pdGUoaXRlbSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlbiA9PT0gMSA/IHJlc1swXSA6IHJlcztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpZiBhbiBvYmplY3QgaGFzIG5vIGtleXMsIGlmIGFuIGFycmF5IGhhcyBubyBpdGVtcywgb3IgaWYgYSBzdHJpbmcgPT09ICcnLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzICdlbXB0eScsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0VtcHR5OiBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5zaXplKGl0ZW0pID09PSAwICYmIGl0ZW0gIT09IGZhbHNlICYmIGl0ZW0gIT09ICcnICYmIGl0ZW0gIT09IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGFycmF5cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiBpc0FycmF5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtIGluc3RhbmNlb2YgQXJyYXk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIG9iamVjdHMgYW5kIG5vdCBhcnJheXMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGFuIG9iamVjdCBhbmQgbm90IGFuIGFycmF5LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNQdXJlT2JqZWN0OiBmdW5jdGlvbiBpc1B1cmVPYmplY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSAmJiB0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIHN0cmluZ3MsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgc3RyaW5nLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uIGlzU3RyaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGJvb2xlYW5zLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGJvb2xlYW4sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0Jvb2xlYW46IGZ1bmN0aW9uIGlzQm9vbGVhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGxmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uIGlzRnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnZnVuY3Rpb24nO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbGxsLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiBpc051bGwgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gPT09IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIHVuZGVmaW5lZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzVW5kZWZpbmVkOiBmdW5jdGlvbiBpc1VuZGVmaW5lZCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbCBhcmd1bWVudHMgb2JqZWN0cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJndW1lbnRzIG9iamVjdCwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNBcmd1bWVudHM6IGZ1bmN0aW9uIGlzQXJndW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaXRlbSkgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29udmVycyBhbiBvYmplY3QgdG8gYSBudW1iZXIsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGEgZmxvYXQgb3IgTmFOLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRvTnVtYmVyOiBmdW5jdGlvbiB0b051bWJlciAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUZsb2F0KG8pIDogTmFOKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxzLmxlbmd0aCA9PT0gMSA/IHZhbHNbMF0gOiB2YWxzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJzIGFuIG9iamVjdCB0byBhbiBpbnRlZ2VyLCBpZiBwb3NzaWJsZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge051bWJlcn0gVGhlIG9iamVjdCBhcyBhbiBpbnRlZ2VyIG9yIE5hTi5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB0b0ludDogZnVuY3Rpb24gdG9JbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmFkaXggPSAvXjB4Ly50ZXN0KG8pID8gMTYgOiAxMDsgLy8gQ2hlY2sgZm9yIGhleCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUludChvLCByYWRpeCkgOiBOYU4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHMubGVuZ3RoID09PSAxID8gdmFsc1swXSA6IHZhbHM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gYXJyYXkgaXRlbSwgcmFuZG9tIG9iamVjdCBwcm9wZXJ0eSwgcmFuZG9tIGNoYXJhY3RlciBpbiBhIHN0cmluZywgb3IgcmFuZG9tIGRpZ2l0IGluIGEgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSAobykge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvIGluc3RhbmNlb2YgQXJyYXkgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogby5sZW5ndGgpXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb1tPYmplY3Qua2V5cyhvKVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBPYmplY3Qua2V5cyhvKS5sZW5ndGgpXV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG8gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gbywgbmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoby5sZW5ndGggPT09IDApIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiBvIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lZ2F0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmFicyh2YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB2YWwudG9TdHJpbmcoKS5sZW5ndGgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnbnVtYmVyJykgdmFsID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmVnYXRpdmUgPyAtdmFsIDogdmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGVhY2ggcHJvcGVydHkgdGhlIG9iamVjdCBjb250YWlucy4gSWYgdGhpcyBpcyBjYWxsZWRcbiAgICAgICAgICAgICAgICAgKiBvbiBhIG51bWJlciBvciBmdW5jdGlvbiwgdGhlIG9iamVjdCB3aWxsIGJlIGNhc3QgdG8gYSBzdHJpbmcuPGJyPjxicj5cbiAgICAgICAgICAgICAgICAgKiBUaGUgY2FsbGJhY2sgYGZgIHdpbGwgYmUgaW52b2tlZCB3aXRoIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgICAgICAgICAgICAgICAqIDx1bD5cbiAgICAgICAgICAgICAgICAgKiBcdDxsaT52YWx1ZSAgICAgLSBUaGUgdmFsdWUgb2YgdGhlIGN1cnJlbnQgb2JqZWN0IGJlaW5nIGl0ZXJhdGVkIG92ZXI8L2xpPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPmtleSAgICAgICAtIFRoZSBrZXkgb2YgdGhlIGN1cnJlbnQgb2JqZWN0IChpZiBhbiBvYmplY3QsIHRoZSBpbmRleCBpZiBhbiBhcnJheSk8L2xpPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPml0ZXJhdGlvbiAtIFRoZSBjdXJyZW50IGl0ZXJhdGlvbiAoc2FtZSBhcyBrZXkgaWYgYSBzdHJpbmcgb3IgYXJyYXkpPC9saT5cbiAgICAgICAgICAgICAgICAgKiBcdDxsaT5leGl0ICAgICAgLSBBIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYnJlYWsgdGhlIGxvb3AgYW5kIHJldHVybiB0aGUgdmFsdWVzIHBhc3NlZCB0byBpdCxcbiAgICAgICAgICAgICAgICAgKiBcdFx0XHRcdFx0b3IgYSBzaW5nbGUgdmFsdWUgaWYgb25seSBhIHNpbmdsZSB2YWx1ZSBpcyBwYXNzZWQuPC9saT5cbiAgICAgICAgICAgICAgICAgKiA8L3VsPlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtyYW5nZUE9MF0gVGhlIGl0ZXJhdGlvbiBzdGFydCBpbmRleFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3JhbmdlQj0nbGVuZ3RoIG9mIHRoZSBpdGVtJ10gVGhlIGl0ZXJhdGlvbiBlbmQgaW5kZXhcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfSBUaGUgdmFsdWUgcGFzc2VkIHRvIHRoZSBleGl0IHBhcmFtZXRlciBvZiB0aGUgY2FsbGJhY2suLi5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBlYWNoOiBmdW5jdGlvbiBlYWNoIChvLCByYW5nZUEsIHJhbmdlQiwgZikge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENhbid0IHVzZSBsYXN0IGhlcmUuLiB3b3VsZCBjYXVzZSBjaXJjdWxhciByZWYuLi5cbiAgICAgICAgICAgICAgICAgICAgZiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBrID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGsgPj0gMDsgay0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcmd1bWVudHNba10gaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYgPSBhcmd1bWVudHNba107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ICAgID0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlbiA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZiAgID0gbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMsIHByb3BlcnR5LCB2YWx1ZSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgZXhpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm9rZW4gICA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ICAgICAgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSA6IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBkb2VzIHNvbWUgZnVua3kgc3R1ZmYgaGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmlcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0FyZ3MgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VBID0gcGFyc2VJbnQocmFuZ2VBKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlQSA9IChpc05hTihyYW5nZUEpIHx8ICFpc0Zpbml0ZShyYW5nZUEpKSA/IDAgOiByYW5nZUE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlQiA9IHBhcnNlSW50KHJhbmdlQik7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZUIgPSAoaXNOYU4ocmFuZ2VCKSB8fCAhaXNGaW5pdGUocmFuZ2VCKSkgPyBrZXlzLmxlbmd0aCA6IHJhbmdlQjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwLCBuO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMocmFuZ2VBKSA+IE1hdGguYWJzKHJhbmdlQikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUIgPCAwKSByYW5nZUIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQSA8IDApIHJhbmdlQSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBID4ga2V5cy5sZW5ndGggLSAxKSByYW5nZUEgPSBrZXlzLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IobiA9IHJhbmdlQTsgbiA+PSByYW5nZUI7IG4tLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGV4aXQsIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcmFuZ2VCICsgMSA+IGtleXMubGVuZ3RoID8ga2V5cy5sZW5ndGggOiByYW5nZUIgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQiA8IDApIHJhbmdlQiA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBIDwgMCkgcmFuZ2VBID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihuID0gcmFuZ2VBOyBuIDwgcmFuZ2VCOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBrZXlzW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBleGl0LCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihicm9rZW4pIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIGZhbHNlLCB0aGVcbiAgICAgICAgICAgICAgICAgKiBsb29wIGlzIGJyb2tlbiBhbmQgZmFsc2UgaXMgcmV0dXJuZWQ7IG90aGVyd2lzZSB0cnVlIGlzIHJldHVybmVkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIG5vbmUgb2YgdGhlIGNhbGxiYWNrIGludm9jYXRpb25zIHJldHVybmVkIGZhbHNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGV2ZXJ5OiBmdW5jdGlvbiBldmVyeSAobywgZikge1xuICAgICAgICAgICAgICAgICAgICBmID0gZiBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gZiA6IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbywga2V5cywgcHJvcGVydHksIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIHNlbGYgPT09ICdudW1iZXInIHx8IHR5cGVvZiBzZWxmID09PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBzZWxmID09PSAnYm9vbGVhbicpIHNlbGYgPSBvLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggZG9lcyBzb21lIGZ1bmt5IHN0dWZmIGhlcmUuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnZnVuY3Rpb24nKSBzZWxmID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHNlbGYpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgU2FmYXJpLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNBcmdzID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09PSAnW29iamVjdCBBcmd1bWVudHNdJywgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeCAgPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FyZ3MgJiYgaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBrZXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHkgPSBrZXlzW25dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgaSsrLCBvKSA9PT0gZmFsc2UpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogSW52b2tlcyB0aGUgY2FsbGJhY2sgJ2YnIGZvciBldmVyeSBwcm9wZXJ0eSB0aGUgb2JqZWN0IGNvbnRhaW5zLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJucyB0cnVlLCB0aGVcbiAgICAgICAgICAgICAgICAgKiBsb29wIGlzIGJyb2tlbiBhbmQgZmFsc2UgaXMgcmV0dXJuZWQ7IG90aGVyd2lzZSB0cnVlIGlzIHJldHVybmVkLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbSB3aXRoaW4gdGhlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIG5vbmUgb2YgdGhlIGNhbGxiYWNrIGludm9jYXRpb25zIHJldHVybmVkIGZhbHNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGFueTogZnVuY3Rpb24gYW55IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGYgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBkb2VzIHNvbWUgZnVua3kgc3R1ZmYgaGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0FyZ3MgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgaSsrLCBvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyZXQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJ0cyBhbiBvYmplY3QgdG8gYW4gYXJyYXkuIEZvciBzdHJpbmdzLCBudW1iZXJzLCBhbmQgZnVuY3Rpb25zIHRoaXMgd2lsbFxuICAgICAgICAgICAgICAgICAqIHJldHVybiBhIGNoYXIgYXJyYXkgdG8gdGhlaXIgcmVzcGVjdGl2ZSAudG9TdHJpbmcoKSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBvYmplY3QsIGNvbnZlcnRlZCB0byBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiB0b0FycmF5IChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkobyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAodmFsKSB7IGFyci5wdXNoKHZhbCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBmaXJzdCBuIGVsZW1lbnRzIG9mIGFuIG9iamVjdC4gSWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgYW5kIG9ubHkgb25lIGl0ZW1zIGlzIHJldHJpZXZlZCxcbiAgICAgICAgICAgICAgICAgKiB0aGF0IGl0ZW0gd2lsbCBiZSByZXR1cm5lZCwgcmF0aGVyIHRoYW4gYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW249MV0gVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZXR1cm5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGZpcnN0IG4gZWxlbWVudHMgb2YgdGhlIGFycmF5LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiBmaXJzdCAobywgbikge1xuICAgICAgICAgICAgICAgICAgICBuID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgICAgICAgICAgICAgICBuID0gaXNOYU4obikgfHwgIWlzRmluaXRlKG4pID8gMSA6IG47XG4gICAgICAgICAgICAgICAgICAgIHZhciB2ID0gbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiAhPT0gMCkgdiA9IG8udG9TdHJpbmcoKS5zbGljZSgwLCBuKTsgZWxzZSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKG8gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiA9PT0gMSkgcmV0dXJuIG9bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbiAhPT0gMCA/IG8uc2xpY2UoMCwgbikgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMCwgbiAtIDEsIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHsgdltrZXldID0gaXRlbTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IGdldEtleXModik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IDEgPyB2W2tleXNbMF1dIDogdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdi5sZW5ndGggPT09IDEgPyB2WzBdIDogdjtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgbGFzdCBuIGVsZW1lbnRzIG9mIGFuIG9iamVjdC4gSWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgYW5kIG9ubHkgb25lIGl0ZW1zIGlzIHJldHJpZXZlZCxcbiAgICAgICAgICAgICAgICAgKiB0aGF0IGl0ZW0gd2lsbCBiZSByZXR1cm5lZCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbj0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJldHVyblxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbGFzdCBuIGVsZW1lbnRzIG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiBsYXN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHJldHVybiBvO1xuXG4gICAgICAgICAgICAgICAgICAgIG4gPSBwYXJzZUludChuLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBpc05hTihuKSB8fCAhaXNGaW5pdGUobikgPyAxIDogbjtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHYgPSBudWxsLCBrZXlzLCBsZW4gPSBsaWJzLm9iamVjdC5zaXplKG8pLCBpZHg7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihsaWJzLm9iamVjdC5pc0FyZ3VtZW50cyhvKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ID0gW107IGxlbiA9IGtleXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXJndW1lbnRzIG9iamVjdCBzaG91bGQgaWdub3JlIHVuZGVmaW5lZCBtZW1iZXJzLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGtleXMsIDAsIGxlbiwgZnVuY3Rpb24gKGspIHsgaWYob1trXSAhPT0gdW5kZWZpbmVkKSB2LnVuc2hpZnQob1trXSk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHYuc2xpY2UoMCwgbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gIT09IDApIHYgPSBvLnRvU3RyaW5nKCkuc2xpY2UoLW4pOyBlbHNlIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYobyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuID09PSAxKSByZXR1cm4gb1tvLmxlbmd0aCAtMV07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbiAhPT0gMCA/IG8uc2xpY2UoLW4pIDogW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuIDwgMCkgbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGxlbiAtIG4sIGxlbiwgZnVuY3Rpb24gKGl0ZW0sIGtleSkgeyB2W2tleV0gPSBpdGVtOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXMubGVuZ3RoID09PSAxID8gdltrZXlzWzBdXSA6IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHYubGVuZ3RoID09PSAxID8gdlswXSA6IHYubGVuZ3RoID4gMCA/IHYgOiBudWxsO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJZiB0aGUgbGFzdCBpdGVtIGluIHRoZSBvYmplY3QgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSByZXR1cm5lZC4gT3RoZXJ3aXNlLCBhbiBcImVtcHR5XCIgZnVuY3Rpb24gd2lsbCBiZSByZXR1cm5lZC5cbiAgICAgICAgICAgICAgICAgKiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYSBjYWxsYmFjayBjYW4gYWx3YXlzIGJlIGludm9rZWQsIHdpdGhvdXQgY2hlY2tpbmcgaWYgdGhlIGFyZ3VtZW50IGlzIGEgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKiBvdmVyIGFuZCBvdmVyLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gZ2V0IHRoZSBjYWxsYmFjayBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IElmIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGFuIFwiZW1wdHlcIiBmdW5jdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGdldENhbGxiYWNrOiBmdW5jdGlvbiBnZXRDYWxsYmFjayAobykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdCA9IGxpYnMub2JqZWN0Lmxhc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYXN0IGluc3RhbmNlb2YgRnVuY3Rpb24gPyBsYXN0IDogTlVMTF9GVU5DVElPTjtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRmluZCBhIGNoaWxkIG9mIGFuIG9iamVjdCB1c2luZyB0aGUgZ2l2ZW4gcGF0aCwgc3BsaXQgYnkgdGhlIGdpdmVuIGRlbGltaXRlciAob3IgJy4nIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIHRoZSBjaGlsZCBvYmplY3RcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkZWxpbWl0ZXI9Jy4nXSBUaGUgcGF0aCBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZG9uZSBBIGNhbGxiYWNrIGZvciBjb21wbGV0aW9uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7KnxOdWxsfSBUaGUgY2hpbGQgb2JqZWN0IGF0IHRoZSBnaXZlbiBzdHJpbmcgcGF0aCwgb3IgbnVsbCBpZiBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGZpbmRDaGlsZEF0UGF0aDogZnVuY3Rpb24gZmluZENoaWxkQXRQYXRoIChvLCBwYXRoLCBkZWxpbWl0ZXIsIG9yaWdpbmFsLCBpbnZva2VkLCBkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSBsaWJzLm9iamVjdC5nZXRDYWxsYmFjayhhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IG87XG5cbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWwgPSAoIShvcmlnaW5hbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSAmJiBvcmlnaW5hbCkgPyBvcmlnaW5hbCA6IHNlbGY7XG4gICAgICAgICAgICAgICAgICAgIGludm9rZWQgID0gaW52b2tlZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSB0eXBlb2YgZGVsaW1pdGVyID09PSAnc3RyaW5nJyA/IGRlbGltaXRlciA6ICcuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggICAgICA9IHBhdGguc3BsaXQoZGVsaW1pdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHAgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKG8sIGssIGksIGV4aXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocGF0aC5sZW5ndGggPT09IDAgJiYgayA9PT0gcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9uZS5jYWxsKG9yaWdpbmFsLCBvLCBzZWxmLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBsaWJzLm9iamVjdC5maW5kQ2hpbGRBdFBhdGgobywgcGF0aC5qb2luKGRlbGltaXRlciksIGRlbGltaXRlciwgb3JpZ2luYWwsIGludm9rZWQsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYob2JqICE9PSBudWxsKSBleGl0KG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZighaW52b2tlZCAmJiBvcmlnaW5hbCA9PT0gc2VsZiAmJiBkb25lIGluc3RhbmNlb2YgRnVuY3Rpb24pIGRvbmUuY2FsbChvcmlnaW5hbCwgbnVsbCwgc2VsZiwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBQcm9kdWNlcyBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIG9iamVjdCwgdGhhdCBpcywgaWYgSlNPTi5zdHJpbmdpZnkgY2FuIGhhbmRsZSBpdC48YnI+XG4gICAgICAgICAgICAgICAgICogVGhlIG9iamVjdCBtdXN0IGJlIG5vbi1jaXJjdWxhci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gQSBzaGFsbG93IGNsb25lIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIGNsb25lIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbyA9PT0gJ251bWJlcicpIHJldHVybiBvO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGNsb25lIG9iamVjdDogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRmlsdGVycyBhbiBhcnJheSBvciBvYmplY3QgdXNpbmcgb25seSB0aGUgdHlwZXMgYWxsb3dlZC4gVGhhdCBpcywgaWYgdGhlIGl0ZW0gaW4gdGhlIGFycmF5IGlzIG9mIGEgdHlwZSBsaXN0ZWRcbiAgICAgICAgICAgICAgICAgKiBpbiB0aGUgYXJndW1lbnRzLCB0aGVuIGl0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGZpbHRlcmVkIGFycmF5LiBJbiB0aGlzIGNhc2UgJ2FycmF5JyBpcyBhIHZhbGlkIHR5cGUuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uU3RyaW5nfSB0eXBlcyBBIGxpc3Qgb2YgdHlwZW9mIHR5cGVzIHRoYXQgYXJlIGFsbG93ZWQgaW4gdGhlIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBBbiBhcnJheSBmaWx0ZXJlZCBieSBvbmx5IHRoZSBhbGxvd2VkIHR5cGVzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG9ubHk6IGZ1bmN0aW9uIG9ubHkgKG8sIHR5cGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB0eXBlcy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93cyB0aGUgJ3BsdXJhbCcgZm9ybSBvZiB0aGUgdHlwZS4uLlxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHR5cGVzLCBmdW5jdGlvbiAodHlwZSwga2V5KSB7IHRoaXNba2V5XSA9IHR5cGUucmVwbGFjZSgvcyQvLCAnJyk7IH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JyB8fCAhbykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIHZhciBpc0FycmF5ICA9IG8gaW5zdGFuY2VvZiBBcnJheSA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gaXNBcnJheSA/IFtdIDoge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlQXJyICA9IHR5cGVzLmluZGV4T2YoJ2FycmF5JyksXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlT2JqICA9IHR5cGVzLmluZGV4T2YoJ29iamVjdCBvYmplY3QnKTtcblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSXRlbSA9IHR5cGVzLmluZGV4T2YodHlwZW9mIGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlT2JqICE9PSAtMSAmJiB0eXBlQXJyID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgIShpdGVtIGluc3RhbmNlb2YgQXJyYXkpKSB8fCAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnICYmIHR5cGVJdGVtICE9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVPYmogIT09IC0xICYmIHR5cGVBcnIgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXMucHVzaCgnb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZUl0ZW0gIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlSXRlbSAhPT0gLTEgfHwgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSAmJiB0eXBlQXJyICE9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCB1c2luZyB0aGUgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3Igb2JqZWN0cywgYSBuZXcgb2JqZWN0IHdpbGwgYmUgcmV0dXJuZWQsIHdpdGhcbiAgICAgICAgICAgICAgICAgKiB0aGUgdmFsdWVzIHRoYXQgcGFzc2VkIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBzdHJpbmdzLCBhIG5ldyBzdHJpbmcgd2lsbCBiZSByZXR1cm5lZCB3aXRoIHRoZSBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgICogdGhhdCBwYXNzZWQgdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIG51bWJlcnMsIGEgbmV3IG51bWJlciB3aWxsIGJlIHJldHVybmVkIHdpdGggdGhlIGRpZ2l0cyB0aGF0IHBhc3NlZFxuICAgICAgICAgICAgICAgICAqIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uIEZ1bmN0aW9ucyB3aWxsIGJlIG9wZXJhdGVkIG9uIGFzIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gdXNlZCB0byBmaWx0ZXIgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uIHdoZXJlIChvLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShwcmVkaWNhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wID0gcHJlZGljYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZGljYXRlID0gZnVuY3Rpb24gKGkpIHsgcmV0dXJuIGkgPT0gdGVtcDsgfTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiAwID09PSAnYm9vbGVhbicpIHJldHVybiBwcmVkaWNhdGUuY2FsbChvLCBvLCAwKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNPYmplY3QgPSB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgIShvIGluc3RhbmNlb2YgQXJyYXkpID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSAhaXNPYmplY3QgPyBbXSA6IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHJlZGljYXRlLmNhbGwoaXRlbSwgaXRlbSwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzT2JqZWN0KSBmaWx0ZXJlZFtrZXldID0gaXRlbTsgZWxzZSBmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIGZpbHRlcmVkID0gZmlsdGVyZWQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRmlsdGVycyBhbiBvYmplY3QgYnkga2V5cyB1c2luZyB0aGUgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIHVzZWQgdG8gZmlsdGVyIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIGZpbHRlcmVkIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdoZXJlS2V5czogZnVuY3Rpb24gd2hlcmVLZXlzIChvLCBwcmVkaWNhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShwcmVkaWNhdGUgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wID0gcHJlZGljYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZGljYXRlID0gZnVuY3Rpb24gKGspIHsgcmV0dXJuIGsgPT0gdGVtcDsgfTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiAwID09PSAnYm9vbGVhbicpIHJldHVybiBwcmVkaWNhdGUuY2FsbChvLCBvLCAwKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNPYmplY3QgPSB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgIShvIGluc3RhbmNlb2YgQXJyYXkpID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSAhaXNPYmplY3QgPyBbXSA6IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHJlZGljYXRlLmNhbGwoa2V5LCBrZXksIGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNPYmplY3QpIGZpbHRlcmVkW2tleV0gPSBpdGVtOyBlbHNlIGZpbHRlcmVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgZmlsdGVyZWQgPSBmaWx0ZXJlZC5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGb3Igb2JqZWN0cywgaW52ZXJ0cyB0aGUgb2JqZWN0cyBrZXlzL3ZhbHVlcy4gSWYgdGhlIHZhbHVlIGlzbid0IGEgbnVtYmVyIG9yIGFycmF5LCBpdCB3aWxsIGJlIG9taXR0ZWQuXG4gICAgICAgICAgICAgICAgICogRm9yIHN0cmluZ3MsIGl0IHdpbGwgcmV2ZXJzZSB0aGUgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEZvciBudW1iZXIsIGl0IHdpbGwgY29tcHV0ZSB0aGUgbnVtYmVyJ3MgaW52ZXJzZSAoaS5lLiAxIC8geCkuXG4gICAgICAgICAgICAgICAgICogRm9yIGZ1bmN0aW9ucywgaW52ZXJ0IHJldHVybnMgYSBuZXcgZnVuY3Rpb24gdGhhdCB3cmFwcyB0aGUgZ2l2ZW4gZnVuY3Rpb24gYW5kIGludmVydHMgaXQncyByZXN1bHQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBpbnZlcnNlLCBhcyBkZXNjcmliZWQgYWJvdmUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaW52ZXJ0OiBmdW5jdGlvbiBpbnZlcnQgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ3N0cmluZycpICAgcmV0dXJuIGxpYnMuc3RyaW5nLnJldmVyc2Uobyk7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnbnVtYmVyJykgICByZXR1cm4gMSAvIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpICByZXR1cm4gIW87XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7IHJldHVybiBsaWJzLm9iamVjdC5pbnZlcnQoby5hcHBseShvLCBhcmd1bWVudHMpKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIGl0ZW0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIW9ialtpdGVtXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0gPSBrZXk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wID0gb2JqW2l0ZW1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2l0ZW1dLnB1c2godG1wLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgbWF4aW11bSBpdGVtIGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmdW5jIElmIHBhc3NlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgbWF4aW11bSBpdGVtIGluIHRoZSBvYmplY3QgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtYXg6IGZ1bmN0aW9uIG1heCAobywgZnVuYykge1xuICAgICAgICAgICAgICAgICAgICBpZighbyB8fCB0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICBpZighKGZ1bmMgaW5zdGFuY2VvZiBGdW5jdGlvbikpIGZ1bmMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXgsIG1heFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXggPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtID49IG1heCkgbWF4ID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF4ID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhWYWx1ZSA9IGZ1bmMuY2FsbChtYXgsIG1heCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmdW5jLmNhbGwoaXRlbSwgaXRlbSkgPj0gbWF4VmFsdWUpIG1heCA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF4O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtaW5pbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtaW5pbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1pbjogZnVuY3Rpb24gbWluIChvLCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZnVuYyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgZnVuYyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyAhPT0gJ29iamVjdCcpIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWluLCBtaW5WYWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZighZnVuYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWluID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA8PSBtaW4pIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbiA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWluVmFsdWUgPSBmdW5jLmNhbGwobWluLCBtaW4pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIDEsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnVuYy5jYWxsKGl0ZW0sIGl0ZW0pIDw9IG1pblZhbHVlKSBtaW4gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1pbjtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGVzdHMgd2hldGhlciBvciBub3QgdGhlIG9iamVjdCBoYXMgYSBtZXRob2QgY2FsbGVkICdtZXRob2QnLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gdGVzdCBleGlzdGVuY2UgZm9yLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBoYXMgYSBmdW5jdGlvbiBjYWxsZWQgJ21ldGhvZCcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzOiBmdW5jdGlvbiBfaW1wbGVtZW50cyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYSAgICA9IGFyZ3Muc2hpZnQoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZighYSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJncywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCEoYVttXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU2FtZSBhcyBPYmplY3Quai5pbXBsZW1lbnRzLCBleGNlcGN0IHdpdGggYSBoYXNPd25Qcm9wZXJ0eSBjaGVjay5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCBUaGUgbmFtZSBvZiB0aGUgbWV0aG9kIHRvIHRlc3QgZXhpc3RlbmNlIGZvci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaGFzIGl0cyBvd24gZnVuY3Rpb24gY2FsbGVkICdtZXRob2QnLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50c093bjogZnVuY3Rpb24gaW1wbGVtZW50c093biAobywgbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYSAgICA9IGFyZ3Muc2hpZnQoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZighYSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJncywgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCEoYVttXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB8fCAhby5oYXNPd25Qcm9wZXJ0eShtZXRob2QpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBFcnJvciB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYm9vbGVhbjoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgQm9vbGVhbiB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWF0aDoge1xuICAgICAgICAgICAgICAgIC8qKiBAdG9kbzogQWRkIHNvbWUgTWF0aCB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVnZXhwOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBSZWdFeHAgdXRpbGl0eSBmdW5jdGlvbnMuLi4gKi9cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGxpYnM7XG4gICAgfVxuICAgIG1vZHVsZS5leHBvcnRzID0gbGlicztcbn0oKSk7XG4iLCJleHBvcnRzLmVuZGlhbm5lc3MgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnTEUnIH07XG5cbmV4cG9ydHMuaG9zdG5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGxvY2F0aW9uLmhvc3RuYW1lXG4gICAgfVxuICAgIGVsc2UgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5sb2FkYXZnID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy51cHRpbWUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAwIH07XG5cbmV4cG9ydHMuZnJlZW1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMudG90YWxtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLmNwdXMgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnQnJvd3NlcicgfTtcblxuZXhwb3J0cy5yZWxlYXNlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbmF2aWdhdG9yLmFwcFZlcnNpb247XG4gICAgfVxuICAgIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubmV0d29ya0ludGVyZmFjZXNcbj0gZXhwb3J0cy5nZXROZXR3b3JrSW50ZXJmYWNlc1xuPSBmdW5jdGlvbiAoKSB7IHJldHVybiB7fSB9O1xuXG5leHBvcnRzLmFyY2ggPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnamF2YXNjcmlwdCcgfTtcblxuZXhwb3J0cy5wbGF0Zm9ybSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdicm93c2VyJyB9O1xuXG5leHBvcnRzLnRtcGRpciA9IGV4cG9ydHMudG1wRGlyID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnL3RtcCc7XG59O1xuXG5leHBvcnRzLkVPTCA9ICdcXG4nO1xuIl19
