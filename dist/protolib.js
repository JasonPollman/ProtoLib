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
                (typeof currentThis === 'object' ? currentThis : currentThis.valueOf()) : currentThis
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

                case constr === Boolean:
                    constructorName = 'boolean';
                    break;

                case constr === Error:
                    constructorName = 'date';
                    break;

                case constr === RegExp:
                    constructorName = 'regexp';
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
                toJSValue: function toJSValue () {
                    return getThisValueAndInvoke(function (s) {
                        return libs.string.toJSValue(s);
                    });
                },

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

                if (prop === '__proto__') {
                    proto = _super.__proto__; // jshint ignore:line
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

            if(proto) iterateProperties(_sub, proto);
            return _sub;
        }

        // Polyfill Object.setPrototypeOf
        Object.setPrototypeOf = Object.setPrototypeOf || function setPrototypeOfPolyfill (_sub, _super) {
            if(_sub.__proto__) {          // jshint ignore:line
                _sub.__proto__ = _super;  // jshint ignore:line
            }
            else {
                iterateProperties(_sub, _super);
            }
            return _sub;
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

                toJSValue: function toJSValue (s) {
                    var original = s;
                    s = s.trim();

                    switch(true) {
                        case s === 'false'     : return false;
                        case s === 'true'      : return true;
                        case s === 'null'      : return null;
                        case s === 'undefined' : return undefined;

                        case libs.object.isNumeric(s):
                            return libs.object.getNumeric(s);

                        default: return original;
                    }
                },

                randomString: function randomString (length, possible) {
                    possible = typeof possible === 'string' ? possible : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSUVWXYZ_ `~!@#$%^&*()_+\\|][\';/.,|}{":?><';
                    length   = libs.object.isNumeric(length) ? length : 10;

                    var res = '';
                    for(var i = 0; i < length; i++)
                        res += possible.charAt(Math.floor(Math.random() * possible.length));
                    return res;
                },

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
                            }).replace(/function \(\)/g, 'function()');
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
                    return libs.array.difference(sarr, oarr).join('');
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
                    return libs.array.intersect(sarr, oarr).join('');
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
                 * Returns all the items unique to a single array (the set difference).
                 * @param {...Array} arrays The Array objects to operate on.
                 * @param {Array} other The array to compute the difference from.
                 * @return {Array} A new array with items unique to each array.
                 */
                difference: function difference () {
                    var arrays   = libs.object.only(libs.object.toArray(arguments), 'array'),
                        diff     = [],
                        allItems = [],
                        i;

                    for(i = 0; i < arrays.length; i++) allItems = allItems.concat(arrays[i]);

                    for(i = 0; i < allItems.length; i++) {
                        var inArray = -1, unique = false;

                        for(var n = 0; n < arrays.length; n++) {
                            if(inArray === -1 && arrays[n].indexOf(allItems[i]) > -1) {
                                inArray = n;
                                unique  = true;
                            }
                            else if(inArray !== -1 && arrays[n].indexOf(allItems[i]) > -1) {
                                inArray = n;
                                unique  = false;
                            }
                        }
                        if(inArray !== -1 && unique) diff.push(allItems[i]);
                    }

                    return diff;
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
                        var arr = libs.object.copy(arrays[i]); // Don't want to modify the original array!
                        for(var n = 0; n < intersection.length; n++) {
                            if(arr.indexOf(intersection[n]) > -1) {
                                intermediate.push(intersection[n]);
                                var idx = arr.indexOf(intersection[n]);
                                arr.splice(idx, 1);
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
                                return item.slice(0);
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
                    var vals = [];
                    libs.object.every(arguments, function (o) {
                        vals.push(libs.object.isNumeric(o) ? parseFloat(o) : NaN);
                    });
                    return vals.length === 1 ? vals[0] : vals;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleCIsImxpYi9saWJwLmpzIiwibGliL2xpYnMuanMiLCJub2RlX21vZHVsZXMvb3MtYnJvd3NlcmlmeS9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiBJZGVudGlmaWVyLlxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICovXG4gICAgdmFyIG9pZCA9IC0xLFxuXG4gICAgIC8qKlxuICAgICAgKiBUcnVlIGlmIHRoZSBOb2RlLmpzIGVudmlyb25tZW50IGlzIGxvYWRlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICovXG4gICAgSVNfQlJPV1NFUiA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmVzIFByb3RvTGliIGluc3RhbmNlcyBmb3IgUHJvdG9saWIuZ2V0XG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBQcm90b2xpYnMgPSB7fTtcblxuICAgIC8vIFRoaXMgcHJvdmlkZXMgYSB3YXkgdG8gZGV0ZXJtaW5lIHRoZSBcImlkXCIgb2YgYSBmdW5jdGlvbiBjb25zdHJ1Y3RvciBpbiBhbiBlbnZpcm9ubWVudCBhZ25vc3RpYyB3YXkuLi5cbiAgICAvLyBJdCBhbHNvIGFsbG93cyB1cyB0byBnaXZlIG9iamVjdHMgYSB1bmlxdWUgaWQuLi5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ19fZ2V0X3Byb3RvbGliX2lkX18nLCB7XG4gICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICBnZXQgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZighKHR5cGVvZiB0aGlzID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgdGhpcyA9PT0gJ2Z1bmN0aW9uJykpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZ2V0IHVuaXF1ZSBpZCBvZiBsaXRlcmFsIHR5cGUnKTtcblxuICAgICAgICAgICAgaWYoIXRoaXMuX19wcm90b2xpYl9pZF9fKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfX3Byb3RvbGliX2lkX18nLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtYmVyYWJsZSAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGUgICAgIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICAgICAgICA6ICcweCcgKyAoKytvaWQpLnRvU3RyaW5nKDE2KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX19wcm90b2xpYl9pZF9fO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgX29iamVjdFVpZCAgID0gT2JqZWN0Ll9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9udW1iZXJVaWQgICA9IE51bWJlci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfc3RyaW5nVWlkICAgPSBTdHJpbmcuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2FycmF5VWlkICAgID0gQXJyYXkuX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2Z1bmN0aW9uVWlkID0gRnVuY3Rpb24uX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX2RhdGVVaWQgICAgID0gRGF0ZS5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfZXJyb3JVaWQgICAgPSBFcnJvci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICBfYm9vbGVhblVpZCAgPSBCb29sZWFuLl9fZ2V0X3Byb3RvbGliX2lkX18sXG4gICAgICAgIF9tYXRoVWlkICAgICA9IE1hdGguX19nZXRfcHJvdG9saWJfaWRfXyxcbiAgICAgICAgX3JlZ2V4cFVpZCAgID0gUmVnRXhwLl9fZ2V0X3Byb3RvbGliX2lkX187XG5cbiAgICB2YXIgUHJvdG9MaWIgPSBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICAgIC8vIFByZXZlbnQgRnVuY3Rpb24uY2FsbCBvciBiaW5kaW5nLi4uXG4gICAgICAgIGlmKCEodGhpcyBpbnN0YW5jZW9mIFByb3RvTGliKSkgcmV0dXJuIG5ldyBQcm90b0xpYihoYW5kbGUpO1xuXG4gICAgICAgIC8vIFNldCBlaXRoZXIgdGhlIHVzZXIgdGhlIGRlZmF1bHQgXCJoYW5kbGVcIiAobGlicmFyeSBhY2Nlc3NvcilcbiAgICAgICAgaGFuZGxlID0gdHlwZW9mIGhhbmRsZSA9PT0gJ3N0cmluZycgPyBoYW5kbGUgOiAnXyc7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgc2VsZiByZWZlcmVuY2UuXG4gICAgICAgICAqIEB0eXBlIHtQcm90b0xpYn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciBvciBub3QgdGhlIGxpYnJhcnkgZnVuY3Rpb25zIGhhdmUgYmVlbiBhdHRhY2hlZCB0byB0aGUgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBhdHRhY2hlZCA9IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQb2ludHMgdG8gdGhlIGN1cnJlbnQgdGhpcyBpdGVtLlxuICAgICAgICAgKiBAdHlwZSB7Kn1cbiAgICAgICAgICovXG4gICAgICAgIGN1cnJlbnRUaGlzID0gbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcmVzIGNhY2hlZCBsaWJyYXJ5IHByb3RvIHJlZmVyZW5jZSBvYmplY3RzXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBjYWNoZWQgPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcmVzIHRoZSBjb25zdHJ1Y3RvciBjaGFpbiBmb3IgZWFjaCBwcm90b3R5cGUgYXMgYW4gYXJyYXkuXG4gICAgICAgICAqIEZvciBleGFtcGxlOiB7IHN0cmluZzogWydvYmplY3QnLCAnc3RyaW5nJ10gfS5cbiAgICAgICAgICogQW5vdGhlciBleGFtcGxlOiB7IG15Q3VzdG9tQ2xhc3NUaGF0RXh0ZW5kc1N0cmluZzogWydvYmplY3QnLCAnc3RyaW5nJywgJ215Q3VzdG9tQ2xhc3NUaGF0RXh0ZW5kc1N0cmluZyddIH1cbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIGluaGVyaXRhbmNlQ2hhaW4gPSB7fSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHN0YXRpYyBsaWJyYXJ5XG4gICAgICAgICAqL1xuICAgICAgICBsaWJzID0gcmVxdWlyZSgnLi9saWIvbGlicycpKFByb3RvTGliKSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHByb3RvbGlicmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgbGlicCA9IHJlcXVpcmUoJy4vbGliL2xpYnAnKShsaWJzLCBnZXRUaGlzVmFsdWVBbmRJbnZva2UpO1xuXG4gICAgICAgIC8vIE1hcCB0aGUgb2JqZWN0IGlkcyB0byB0aGUgbGlicmFyeSBuYW1lcy4uLlxuICAgICAgICBsaWJwW19vYmplY3RVaWRdICAgPSBsaWJwLm9iamVjdCAgIHx8IHt9O1xuICAgICAgICBsaWJwW19zdHJpbmdVaWRdICAgPSBsaWJwLnN0cmluZyAgIHx8IHt9O1xuICAgICAgICBsaWJwW19udW1iZXJVaWRdICAgPSBsaWJwLm51bWJlciAgIHx8IHt9O1xuICAgICAgICBsaWJwW19hcnJheVVpZF0gICAgPSBsaWJwLmFycmF5ICAgIHx8IHt9O1xuICAgICAgICBsaWJwW19mdW5jdGlvblVpZF0gPSBsaWJwLmZ1bmN0aW9uIHx8IHt9O1xuICAgICAgICBsaWJwW19kYXRlVWlkXSAgICAgPSBsaWJwLmRhdGUgICAgIHx8IHt9O1xuICAgICAgICBsaWJwW19ib29sZWFuVWlkXSAgPSBsaWJwLmJvb2xlYW4gIHx8IHt9O1xuICAgICAgICBsaWJwW19lcnJvclVpZF0gICAgPSBsaWJwLmVycm9yICAgIHx8IHt9O1xuICAgICAgICBsaWJwW19tYXRoVWlkXSAgICAgPSBsaWJwLm1hdGggICAgIHx8IHt9O1xuICAgICAgICBsaWJwW19yZWdleHBVaWRdICAgPSBsaWJwLnJlZ2V4cCAgIHx8IHt9O1xuXG4gICAgICAgIC8vIFR1Y2sgdW5uYW1lZCBzdGF0aWMgZXh0ZW5zaW9ucyBoZXJlLi4uXG4gICAgICAgIGxpYnMubXkgPSB7fTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBjb25zdHJ1Y3RvciwgYW5kIGFsbCBvdGhlcnMgdGhhdCBpbmhlcml0cyBmcm9tIGl0cyBwcm90b3R5cGUuXG4gICAgICAgICAqIFdoaWNoIG1lYW5zIGlmIGNvbnN0ciA9PT0gT2JqZWN0LCBhbGwgY2FjaGUgd2lsbCBiZSBkZWxldGVkLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIHRvIGRlbGV0ZSB0aGUgY2FjaGUgZm9yLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGRlbGV0ZUNhY2hlRm9yQ29uc3RydWN0b3IgKGNvbnN0cikge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIGluaGVyaXRhbmNlQ2hhaW4pIHtcbiAgICAgICAgICAgICAgICBpZihpbmhlcml0YW5jZUNoYWluLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGluaGVyaXRhbmNlQ2hhaW5baV0uaW5kZXhPZihjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfXykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVkW2ldID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNhY2hlZFtpXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbltpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbmhlcml0YW5jZUNoYWluW2ldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwZW5kcyBhbGwgdGhlIGxpYnJhcnkgZnVuY3Rpb25zIHRvIHRoaXMgaW5zdGFuY2UgZm9yIHN0YXRpYyB1c2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gYXR0YWNoTGlicmFyeVRvU2VsZiAoKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgaW4gbGlicylcbiAgICAgICAgICAgICAgICBpZihsaWJzLmhhc093blByb3BlcnR5KGkpICYmICFzZWxmW2ldKSBzZWxmW2ldID0gbGlic1tpXTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0UHJvdG8gKG8pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gSUUgdGhyb3cgd2hlbiBjYWxsaW5nIE9iamVjdC5nZXRQcm90b3R5cGVPZiBvbiBwcmltaXRpdmUgdmFsdWVzLi4uXG4gICAgICAgICAgICAgICAgLy8gQnV0IG5vdCB3aXRoIGRlcHJlY2F0ZWQgX19wcm90b19fID8/P1xuICAgICAgICAgICAgICAgIHJldHVybiBvLl9fcHJvdG9fXyB8fCBvLmNvbnN0cnVjdG9yLnByb3RvdHlwZTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkcyB0aGUgbGlicmFyeSBtZXRob2RzIGZyb20gdGhlIHByaW1pdGl2ZSBvYmplY3QgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhcHBseUxpYnJhcnlUb1Byb3RvdHlwZXMgKCkge1xuICAgICAgICAgICAgaWYoIWF0dGFjaGVkKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsIGhhbmRsZSwge1xuICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlICAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3cgdXNlcnMgdG8gb3ZlcndyaXRlIHRoZSBoYW5kbGUgb24gYSBwZXIgaW5zdGFuY2UgYmFzaXMuLi5cbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhpc1toYW5kbGVdICE9PSB2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGhhbmRsZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWd1cmFibGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlICAgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0YWJsZSAgICAgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiB2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgdGhlIGxpYnAgbGlicmFyeS4uLlxuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjY0lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvID0gZ2V0UHJvdG8odGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY0lkICAgPSBwcm90by5jb25zdHJ1Y3Rvci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpYiAgID0ge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSAgICAgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3QgID0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGhpcyA9IHRoaXM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjY0lkID0gcHJvdG8uY29uc3RydWN0b3IuX19nZXRfcHJvdG9saWJfaWRfXztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjYWNoZWRbY2NJZF0gJiYgaSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkW2NjSWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGNhY2hlZFtjY0lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IobSBpbiBjYWNoZWRbY2NJZF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjYWNoZWRbY2NJZF0uaGFzT3duUHJvcGVydHkobSkpIGxpYlttXSA9IGNhY2hlZFtjY0lkXVttXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighaW5oZXJpdGFuY2VDaGFpbltjSWRdKSBpbmhlcml0YW5jZUNoYWluW2NJZF0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbltjSWRdID0gaW5oZXJpdGFuY2VDaGFpbltjY0lkXS5jb25jYXQoaW5oZXJpdGFuY2VDaGFpbltjSWRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGVkW2NJZF0gPSBsaWI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighbGlicFtjY0lkXSkgbGlicFtjY0lkXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IobSBpbiBsaWJwW2NjSWRdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGlicFtjY0lkXS5oYXNPd25Qcm9wZXJ0eShtKSkgbGliW21dID0gbGlicFtjY0lkXVttXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWluaGVyaXRhbmNlQ2hhaW5bY2NJZF0pIGluaGVyaXRhbmNlQ2hhaW5bY2NJZF0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaGVyaXRhbmNlQ2hhaW5bY0lkXS51bnNoaWZ0KGNjSWQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlZFtjSWRdID0gbGliO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0ID0gY2NJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2k7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocHJvdG8gPSBnZXRQcm90byhwcm90bykpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGliLl9fcHJvdG9saWJfY0lkX18gPSBjSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGliO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXR0YWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyB0aGUgbGlicmFyeSBtZXRob2RzIGZyb20gdGhlIHByaW1pdGl2ZSBvYmplY3QgcHJvdG90eXBlcy5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiByZW1vdmVMaWJyYXJ5RnJvbVByb3RvdHlwZXMgKCkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsIGhhbmRsZSwgeyB2YWx1ZTogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgZGVsZXRlIE9iamVjdC5wcm90b3R5cGVbaGFuZGxlXTtcbiAgICAgICAgICAgIGF0dGFjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZXMgdGhlIGxhc3QgaXRlbSBmcm9tIHRoZSAndGhpc1BvaW50ZXJTdGFjaycgYW5kIGludm9rZXMgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIHdpdGggaXQuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggdGhlIGN1cnJlbnQgJ3RoaXMnIHZhbHVlLlxuICAgICAgICAgKiBAcmV0dXJuIFRoZSByZXN1bHQgb2YgdGhlIGludm9jYXRpb24gb2YgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGN1cnJlbnRUaGlzICE9PSB1bmRlZmluZWQgJiYgY3VycmVudFRoaXMgIT09IG51bGwgP1xuICAgICAgICAgICAgICAgICh0eXBlb2YgY3VycmVudFRoaXMgPT09ICdvYmplY3QnID8gY3VycmVudFRoaXMgOiBjdXJyZW50VGhpcy52YWx1ZU9mKCkpIDogY3VycmVudFRoaXNcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgaGFuZGxlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoIFRoZSBuZXcgaGFuZGxlXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRIYW5kbGUgPSBmdW5jdGlvbiAoaCkge1xuICAgICAgICAgICAgc2VsZi51bmxvYWQoKTtcbiAgICAgICAgICAgIGlmKHR5cGVvZiBoID09PSAnc3RyaW5nJykgaGFuZGxlID0gaDtcbiAgICAgICAgICAgIHNlbGYubG9hZCgpO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZHMgYSBsaWJyYXJ5IG1ldGhvZCB0byBhIHByb3RvdHlwZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IFtjb25zdHI9T2JqZWN0XSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIG9iamVjdCB0byBleHRlbmQuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBsaWJyYXJ5IG1ldGhvZCB0byBhZGQuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBtZXRob2QgdG8gYWRkLlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBtZXRob2Qgd2FzIGFkZGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmV4dGVuZCA9IGZ1bmN0aW9uIChjb25zdHIsIG5hbWUsIHN0YXRpY05hbWVzcGFjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbGlicy5vYmplY3QuZ2V0Q2FsbGJhY2soYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgaWYodHlwZW9mIGNvbnN0ciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gY29uc3RyO1xuICAgICAgICAgICAgICAgIGNvbnN0ciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnICAgICB8fCAhKGNhbGxiYWNrIGluc3RhbmNlb2YgRnVuY3Rpb24pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyICE9PSAnZnVuY3Rpb24nIHx8IGNvbnN0ciA9PT0gY2FsbGJhY2spIGNvbnN0ciA9IE9iamVjdDtcblxuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9ySWQgICA9IGNvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fLFxuICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9IHR5cGVvZiBzdGF0aWNOYW1lc3BhY2UgPT09ICdzdHJpbmcnID9cbiAgICAgICAgICAgICAgICAgICAgc3RhdGljTmFtZXNwYWNlIDogdHlwZW9mIGNvbnN0ci5uYW1lID09PSAnc3RyaW5nJyA/IGNvbnN0ci5uYW1lIDogbnVsbDtcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gT2JqZWN0OlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gQXJyYXk6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdhcnJheSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IFN0cmluZzpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IE51bWJlcjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3JOYW1lID0gJ251bWJlcic7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IEZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnZnVuY3Rpb24nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RyID09PSBEYXRlOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAnZGF0ZSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdHIgPT09IEJvb2xlYW46XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdib29sZWFuJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gRXJyb3I6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZSA9ICdkYXRlJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0ciA9PT0gUmVnRXhwOlxuICAgICAgICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSAncmVnZXhwJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKCFsaWJwW2NvbnN0cnVjdG9ySWRdKSAgIGxpYnBbY29uc3RydWN0b3JJZF0gICA9IHt9O1xuICAgICAgICAgICAgaWYoIWxpYnNbY29uc3RydWN0b3JOYW1lXSkgbGlic1tjb25zdHJ1Y3Rvck5hbWVdID0ge307XG5cbiAgICAgICAgICAgIC8vIEFkZCBzdGF0aWMgdmVyc2lvbi4uXG4gICAgICAgICAgICB2YXIgc3RhdGljVmVyc2lvbiA9IGZ1bmN0aW9uIChvKSB7IHJldHVybiBjYWxsYmFjay5hcHBseShvLCBhcmd1bWVudHMpOyB9O1xuICAgICAgICAgICAgaWYoY29uc3RydWN0b3JOYW1lKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhpcyBwcm9wZXJ0eSBzbyB3ZSBjYW4gcmVtb3ZlIGl0IGxhdGVyIGlmIFByb3RvTGliLnJlbW92ZSBpcyBjYWxsZWQgb24gaXQuLi5cbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29uc3RyLCAnX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX18nLCB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlICAgICA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGUgICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICAgICAgOiBjb25zdHJ1Y3Rvck5hbWVcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGxpYnNbY29uc3RydWN0b3JOYW1lXVtuYW1lXSA9IHN0YXRpY1ZlcnNpb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlIGFsd2F5cyBhZGQgZXh0ZW5kZWQgZnVuY3Rpb25zIHRvIGxpYnMubXlcbiAgICAgICAgICAgIGxpYnMubXlbbmFtZV0gPSBzdGF0aWNWZXJzaW9uO1xuXG4gICAgICAgICAgICAvLyBBZGQgaW5zdGFuY2UgdmVyc2lvbi4uLlxuICAgICAgICAgICAgbGlicFtjb25zdHJ1Y3RvcklkXVtuYW1lXSAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoYywgYXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yKGNvbnN0cik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyBhIGxpYnJhcnkgbWV0aG9kIGZyb20gYSBjb25zdHJ1Y3RvcidzIHByb3RvdHlwZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RyIFRoZSBjb25zdHJ1Y3RvciB0byByZW1vdmUgdGhlIG1ldGhvZCBmcm9tLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgbGlicmFyeSBtZXRob2QgdG8gcmVtb3ZlLlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBtZXRob2Qgd2FzIHJlbW92ZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVtb3ZlID0gZnVuY3Rpb24gKGNvbnN0ciwgbmFtZSkge1xuICAgICAgICAgICAgaWYodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBjb25zdHIgIT09ICdmdW5jdGlvbicpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgdmFyIHVpZCA9IGNvbnN0ci5fX2dldF9wcm90b2xpYl9pZF9fO1xuICAgICAgICAgICAgaWYobGlicFt1aWRdICYmIGxpYnBbdWlkXVtuYW1lXSkge1xuICAgICAgICAgICAgICAgIGxpYnBbdWlkXVtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbGlicFt1aWRdW25hbWVdO1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gc3RhdGljIG5hbWVzcGFjZSwgaWYgYWRkZWQgdGhlcmUuLi5cbiAgICAgICAgICAgICAgICBpZihsaWJzW2NvbnN0ci5fX3Byb3RvbGliX3N0YXRpY19uYW1lc3BhY2VfX10gJiYgbGlic1tjb25zdHIuX19wcm90b2xpYl9zdGF0aWNfbmFtZXNwYWNlX19dW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpYnNbY29uc3RyLl9fcHJvdG9saWJfc3RhdGljX25hbWVzcGFjZV9fXVtuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBsaWJzLm15XG4gICAgICAgICAgICAgICAgaWYobGlicy5teVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm15W25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbGlicy5teVtuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkZWxldGVDYWNoZUZvckNvbnN0cnVjdG9yKGNvbnN0cik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZXMgdGhlIHByb3RvdHlwZSBsaWJyYXJ5IHJlZmVyZW5jZSBmcm9tIHRoZSBvYmplY3QgcHJvdG90eXBlLlxuICAgICAgICAgKiBAcmV0dXJuIHtQcm90b0xpYn0gVGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudW5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVtb3ZlTGlicmFyeUZyb21Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBQcm90b0xpYltoYW5kbGVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGVsZXRlIFByb3RvTGliW2hhbmRsZV07XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwbGllcyB0aGUgbGlicmFyeSB0byB0aGUgb2JqZWN0IHByb3RvdHlwZSBhbmQgYWxsIHN0YXRpYyBmdW5jdGlvbnNcbiAgICAgICAgICogdG8gdGhlIGN1cnJlbnQgUHJvdG9MaWIgaW5zdGFuY2UuXG4gICAgICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgY3VycmVudCBQcm90b0xpYiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXBwbHlMaWJyYXJ5VG9Qcm90b3R5cGVzKCk7XG4gICAgICAgICAgICBhdHRhY2hMaWJyYXJ5VG9TZWxmKCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRzIHRoZSBsaWJyYXJ5IGNhY2hlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBjb25zdHIgVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGtpbGwgdGhlIGNhY2hlIGZvci5cbiAgICAgICAgICogQHJldHVybiB7UHJvdG9MaWJ9IFRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5raWxsQ2FjaGUgPSBmdW5jdGlvbiAoY29uc3RyKSB7XG4gICAgICAgICAgICBpZihjb25zdHIpIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgY29uc3RyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhY2hlZFtjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX10gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjYWNoZWRbY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX19dO1xuXG4gICAgICAgICAgICAgICAgICAgIGluaGVyaXRhbmNlQ2hhaW5bY29uc3RyLl9fZ2V0X3Byb3RvbGliX2lkX19dID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaW5oZXJpdGFuY2VDaGFpbltjb25zdHIuX19nZXRfcHJvdG9saWJfaWRfX107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkID0ge307XG4gICAgICAgICAgICAgICAgaW5oZXJpdGFuY2VDaGFpbiA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgdGhlIGxpYnJhcnkgdG8gdGhlIG9iamVjdCBwcm90b3R5cGUsIGFuZCBhdHRhY2ggYWxsIHRoZSBzdGF0aWMgZnVuY3Rpb25zXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IFByb3RvTGliIGluc3RhbmNlLi4uXG4gICAgICAgIHNlbGYubG9hZCgpO1xuXG4gICAgICAgIC8vIEFkZCB0aGlzIGluc3RhbmNlIHRvIHRoZSBQcm90b2xpYiBcImNvbnRhaW5lclwiXG4gICAgICAgIFByb3RvbGlic1toYW5kbGVdID0gc2VsZjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIFByb3RvTGliIGxpYnJhcnkgYnkgaGFuZGxlLCBvciwgYW4gaW5zdGFuY2Ugd2l0aCB0aGUgZ2l2ZW4gaGFuZGxlIGRvZXNuJ3QgZXhpc3QsIGNyZWF0ZXMgb25lLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2hhbmRsZT0nXyddIFRoZSBoYW5kbGUgZm9yIHRoZSBpbnN0YW5jZSB0byBnZXQgb3IgY3JlYXRlLlxuICAgICAqIEByZXR1cm4ge1Byb3RvTGlifSBUaGUgbmV3IChvciByZXRyaWV2ZWQpIFByb3RvTGliIGluc3RhbmNlLlxuICAgICAqL1xuICAgIFByb3RvTGliLmdldCA9IGZ1bmN0aW9uIGdldCAoaGFuZGxlKSB7XG4gICAgICAgIGhhbmRsZSA9IHR5cGVvZiBoYW5kbGUgPT09ICdzdHJpbmcnID8gaGFuZGxlIDogJ18nO1xuICAgICAgICByZXR1cm4gUHJvdG9saWJzW2hhbmRsZV0gfHwgbmV3IFByb3RvTGliKGhhbmRsZSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZXMgdGhlIGNhY2hlIGZvciB0aGUgUHJvdG9saWIgaW5zdGFuY2Ugd2l0aCB0aGUgZ2l2ZW4gaGFuZGxlLiBJZiBubyBoYW5kbGUgaXMgc3BlY2lmaWVkLFxuICAgICAqIHRoZSBjYWNoZSBmb3IgYWxsIGluc3RhbmNlcyB3aWxsIGJlIGRlbGV0ZWQuXG4gICAgICogQHBhcmFtIHtTdHJpbmc9fSBoYW5kbGUgVGhlIGhhbmRsZSBvZiB0aGUgaW5zdGFuY2UgdG8gZGVsZXRlXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBQcm90b0xpYiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIFByb3RvTGliLmtpbGxDYWNoZSA9IGZ1bmN0aW9uIGtpbGxDYWNoZSAoaGFuZGxlKSB7XG4gICAgICAgIGlmKFByb3RvbGlic1toYW5kbGVdIGluc3RhbmNlb2YgUHJvdG9MaWIpIHtcbiAgICAgICAgICAgIFByb3RvbGlic1toYW5kbGVdLmtpbGxDYWNoZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoIWhhbmRsZSkge1xuICAgICAgICAgICAgZm9yKHZhciBuIGluIFByb3RvbGlicykge1xuICAgICAgICAgICAgICAgIGlmKFByb3RvbGlicy5oYXNPd25Qcm9wZXJ0eShuKSkgUHJvdG9saWJzW25dLmtpbGxDYWNoZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm90b0xpYjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgY2FjaGUgZm9yIHRoZSBnaXZlbiBjb25zdHJ1Y3RvciBmb3IgYWxsIFByb3RvTGliIGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0ge1N0cmluZz19IGNvbnN0ciBUaGUgY29uc3RydWN0b3IgY2FjaGUgdG8gZGVsZXRlXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBQcm90b0xpYiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIFByb3RvTGliLmtpbGxDYWNoZUZvckNvbnN0cnVjdG9yID0gZnVuY3Rpb24ga2lsbENhY2hlRm9yQ29uc3RydWN0b3IgKGNvbnN0cikge1xuICAgICAgICBmb3IodmFyIG4gaW4gUHJvdG9saWJzKSB7XG4gICAgICAgICAgICBpZihQcm90b2xpYnMuaGFzT3duUHJvcGVydHkobikpIFByb3RvbGlic1tuXS5raWxsQ2FjaGUoY29uc3RyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvdG9MaWI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGxpYnJhcnkgbWV0aG9kcyBmcm9tIE9iamVjdFtoYW5kbGVdIGFuZCByZWxlYXNlcyB0aGUgUHJvdG9MaWIgaW5zdGFuY2UgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbiAoaWZcbiAgICAgKiBpdCdzIG5vdCByZWZlcmVuY2VzIGVsc2V3aGVyZSkuXG4gICAgICogQHBhcmFtIHtTdHJpbmc9fSBbaGFuZGxlPSdfJ10gVGhlIGhhbmRsZSBvZiB0aGUgUHJvdG9MaWIgaW5zdGFuY2UgdG9cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIFByb3RvTGliIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgUHJvdG9MaWIuZGVzdHJveSA9IGZ1bmN0aW9uIGRlc3Ryb3kgKGhhbmRsZSkge1xuICAgICAgICBoYW5kbGUgPSB0eXBlb2YgaGFuZGxlID09PSAnc3RyaW5nJyA/IGhhbmRsZSA6ICdfJztcbiAgICAgICAgaWYodHlwZW9mIFByb3RvbGlic1toYW5kbGVdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgUHJvdG9saWJzW2hhbmRsZV0udW5sb2FkKCk7XG4gICAgICAgICAgICBQcm90b2xpYnNbaGFuZGxlXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGRlbGV0ZSBQcm90b2xpYnNbaGFuZGxlXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvdG9MaWI7XG4gICAgfTtcblxuICAgIHJldHVybiAhSVNfQlJPV1NFUiA/XG4gICAgICAgIG1vZHVsZS5leHBvcnRzICA9IFByb3RvTGliIDpcbiAgICAgICAgd2luZG93LlByb3RvTGliID0gUHJvdG9MaWIgO1xufSgpKTtcbiIsIihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIGxpYnAgKGxpYnMsIGdldFRoaXNWYWx1ZUFuZEludm9rZSkge1xuICAgICAgICB2YXIgbGlicCA9IHtcbiAgICAgICAgICAgIHN0cmluZzoge1xuICAgICAgICAgICAgICAgIHRvSlNWYWx1ZTogZnVuY3Rpb24gdG9KU1ZhbHVlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnRvSlNWYWx1ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNhbWVsaXplOiBmdW5jdGlvbiBjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5jYW1lbGl6ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRlY2FtZWxpemU6IGZ1bmN0aW9uIGRlY2FtZWxpemUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuZGVjYW1lbGl6ZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2VGcm9tU3RyaW5nOiBmdW5jdGlvbiBkaWZmZXJlbmNlRnJvbVN0cmluZyAob3RoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmRpZmZlcmVuY2VGcm9tU3RyaW5nKHMsIG90aGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlcGxhY2VUb2tlbnM6IGZ1bmN0aW9uIHJlcGxhY2VUb2tlbnMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVwbGFjZVN0cmluZ1Rva2VucyhzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludGVyc2VjdFN0cmluZzogZnVuY3Rpb24gaW50ZXJzZWN0U3RyaW5nIChvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcuaW50ZXJzZWN0U3RyaW5nKHMsIG90aGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0ICh0aW1lcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVwZWF0KHMsIHRpbWVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJ0cmltOiBmdW5jdGlvbiBydHJpbSAod2hhdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucnRyaW0ocywgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBsdHJpbTogZnVuY3Rpb24gbHRyaW0gKHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmx0cmltKHMsIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaHRtbEVuY29kZTogZnVuY3Rpb24gaHRtbEVuY29kZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5odG1sRW5jb2RlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaHRtbERlY29kZTogZnVuY3Rpb24gaHRtbERlY29kZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5odG1sRGVjb2RlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWRkU2xhc2hlczogZnVuY3Rpb24gYWRkU2xhc2hlcyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5hZGRTbGFzaGVzKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdWNGaXJzdDogZnVuY3Rpb24gdWNGaXJzdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy51Y0ZpcnN0KHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbGNGaXJzdDogZnVuY3Rpb24gbGNGaXJzdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5sY0ZpcnN0KHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdGl0bGVDYXNlOiBmdW5jdGlvbiB0aXRsZUNhc2UgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcudGl0bGVDYXNlKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc3BsaWNlOiBmdW5jdGlvbiBzcGxpY2UgKGluZGV4LCBjb3VudCwgYWRkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5zcGxpY2UocywgaW5kZXgsIGNvdW50LCBhZGQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZWxsaXBzZXM6IGZ1bmN0aW9uIGVsbGlwc2VzXyAobGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLmVsbGlwc2VzKHMsIGxlbmd0aCwgcGxhY2UsIGVsbGlwc2VzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNodWZmbGU6IGZ1bmN0aW9uIHNodWZmbGUgKHNwbGl0dGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5zaHVmZmxlKHMsIHNwbGl0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJldmVyc2U6IGZ1bmN0aW9uIHJldmVyc2UgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmV2ZXJzZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhvdXRUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRob3V0VHJhaWxpbmdTbGFzaCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRob3V0VHJhaWxpbmdTbGFzaChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRoVHJhaWxpbmdTbGFzaCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy53aXRoVHJhaWxpbmdTbGFzaChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJlZ2V4cFNhZmU6IGZ1bmN0aW9uIHJlZ2V4cFNhZmUgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcucmVnZXhwU2FmZShzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChsZW5ndGgsIGRlbGltLCBwcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLnBhZChzLCBsZW5ndGgsIGRlbGltLCBwcmUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbmV3bGluZVRvQnJlYWs6IGZ1bmN0aW9uIG5ld2xpbmVUb0JyZWFrICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLm5ld2xpbmVUb0JyZWFrKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdGFic1RvU3BhbjogZnVuY3Rpb24gdGFic1RvU3BhbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy50YWJzVG9TcGFuKHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgd29yZFdyYXBUb0xlbmd0aDogZnVuY3Rpb24gd29yZFdyYXBUb0xlbmd0aCAod2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuc3RyaW5nLndvcmRXcmFwVG9MZW5ndGgocywgd2lkdGgsIHBhZGxlZnQsIHBhZHJpZ2h0LCBvbWl0Rmlyc3QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYXJyYXk6IHtcbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuc2h1ZmZsZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHVuaW9uOiBmdW5jdGlvbiB1bmlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS51bmlvbi5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRpZmZlcmVuY2U6IGZ1bmN0aW9uIGRpZmZlcmVuY2UgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGlmZmVyZW5jZS5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludGVyc2VjdDogZnVuY3Rpb24gaW50ZXJzZWN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudW5zaGlmdChhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmludGVyc2VjdC5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdpdGhvdXQ6IGZ1bmN0aW9uIHdpdGhvdXQgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkud2l0aG91dC5hcHBseShhLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJvdGF0ZTogZnVuY3Rpb24gcm90YXRlIChkaXJlY3Rpb24sIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgZGlyZWN0aW9uLCBhbW91bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcm90YXRlTGVmdDogZnVuY3Rpb24gcm90YXRlTGVmdCAoYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZUxlZnQoYSwgYW1vdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHJvdGF0ZVJpZ2h0OiBmdW5jdGlvbiByb3RhdGVSaWdodCAoYW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LnJvdGF0ZVJpZ2h0KGEsIGFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtYWtlVW5pcXVlOiBmdW5jdGlvbiBtYWtlVW5pcXVlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkubWFrZVVuaXF1ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHVuaXF1ZTogZnVuY3Rpb24gdW5pcXVlICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkudW5pcXVlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYXNjZW5kaW5nOiBmdW5jdGlvbiBhc2NlbmRpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5hc2NlbmRpbmcoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBkZXNjZW5kaW5nOiBmdW5jdGlvbiBkZXNjZW5kaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGVzY2VuZGluZyhhKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbnVtYmVyOiB7XG5cbiAgICAgICAgICAgICAgICB0bzogZnVuY3Rpb24gdG9fIChrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0ludCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiAlIDEgPT09IDAgJiYgbi50b1N0cmluZygpLmluZGV4T2YoJy4nKSA9PT0gLTEpIGlzSW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpc0ludCA/IGxpYnMubnVtYmVyLnJhbmRvbUludEluUmFuZ2UobiwgaykgOiBsaWJzLm51bWJlci5yYW5kb21OdW1iZXJJblJhbmdlKG4sIGspO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNJbnQ6IGZ1bmN0aW9uIGlzSW50ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmlzSW50KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZmFjdG9yaWFsOiBmdW5jdGlvbiBmYWN0b3JpYWwgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuZmFjdG9yaWFsKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2hvb3NlOiBmdW5jdGlvbiBjaG9vc2UgKGspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmNob29zZShuLCBrKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHBhZDogZnVuY3Rpb24gcGFkIChsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnBhZChuLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0Zyb206IGZ1bmN0aW9uIGRheXNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGRheXNGcm9tTm93OiBmdW5jdGlvbiBkYXlzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHNlY29uZHNGcm9tOiBmdW5jdGlvbiBzZWNvbmRzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbU5vdzogZnVuY3Rpb24gc2Vjb25kc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuc2Vjb25kc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb206IGZ1bmN0aW9uIHllYXJzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeWVhcnNGcm9tTm93OiBmdW5jdGlvbiB5ZWFyc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbTogZnVuY3Rpb24gbW9udGhzRnJvbSAoZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzRnJvbShuLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1vbnRoc0Zyb21Ob3c6IGZ1bmN0aW9uIG1vbnRoc0Zyb21Ob3cgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzRnJvbU5vdyhuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGhvdXJzRnJvbTogZnVuY3Rpb24gaG91cnNGcm9tIChkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb20obiwgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBob3Vyc0Zyb21Ob3c6IGZ1bmN0aW9uIGhvdXJzRnJvbU5vdyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb21Ob3cobik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW51dGVzRnJvbTogZnVuY3Rpb24gbWludXRlc0Zyb20gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tKG4sIGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb21Ob3c6IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tTm93ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbW9udGhzQWdvOiBmdW5jdGlvbiBtb250aHNBZ28gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIubW9udGhzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZGF5c0FnbzogZnVuY3Rpb24gZGF5c0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2Vjb25kc0FnbzogZnVuY3Rpb24gc2Vjb25kc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5zZWNvbmRzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbWludXRlc0FnbzogZnVuY3Rpb24gbWludXRlc0FnbyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeWVhcnNBZ286IGZ1bmN0aW9uIHllYXJzQWdvICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzQWdvKG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIuY2xvY2tUaW1lKG4sIG9taXRNUyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uOiB7XG4gICAgICAgICAgICAgICAgaW5oZXJpdHM6IGZ1bmN0aW9uIGluaGVyaXRzIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmZ1bmN0aW9uLmluaGVyaXRzKG8sIHMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgICAgICB1bmlxdWVJZDogZnVuY3Rpb24gdW5pcXVlSWQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QudW5pcXVlSWQobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBoaXN0b2dyYW06IGZ1bmN0aW9uIGhpc3RvZ3JhbSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5oaXN0b2dyYW0obyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBjb3B5OiBmdW5jdGlvbiBjb3B5ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmNvcHkobyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBlYWNoOiBmdW5jdGlvbiBlYWNoIChzdGFydCwgZW5kLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZWFjaChvLCBzdGFydCwgZW5kLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBvY2N1cnJlbmNlc09mOiBmdW5jdGlvbiBvY2N1cnJlbmNlc09mICh3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5vY2N1cnJlbmNlc09mKG8sIHdoYXQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAga2V5czogZnVuY3Rpb24ga2V5cyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5rZXlzKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2l6ZTogZnVuY3Rpb24gc2l6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5zaXplKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNOdW1lcmljOiBmdW5jdGlvbiBpc051bWVyaWMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNOdW1lcmljKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZ2V0TnVtZXJpYzogZnVuY3Rpb24gZ2V0TnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5nZXROdW1lcmljKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNFbXB0eTogZnVuY3Rpb24gaXNFbXB0eSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0VtcHR5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNBcnJheTogZnVuY3Rpb24gaXNBcnJheSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0FycmF5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNQdXJlT2JqZWN0OiBmdW5jdGlvbiBpc1B1cmVPYmplY3QgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNQdXJlT2JqZWN0KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uIGlzU3RyaW5nICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzU3RyaW5nKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uIGlzVW5kZWZpbmVkICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzVW5kZWZpbmVkKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiBpc051bGwgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNOdWxsKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNCb29sZWFuOiBmdW5jdGlvbiBpc0Jvb2xlYW4gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaXNCb29sZWFuKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gaXNGdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pc0Z1bmN0aW9uKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaXNBcmd1bWVudHM6IGZ1bmN0aW9uIGlzQXJndW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9OdW1iZXI6IGZ1bmN0aW9uIHRvTnVtYmVyICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvTnVtYmVyKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9JbnQ6IGZ1bmN0aW9uIHRvSW50ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnRvSW50KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgdG9BcnJheTogZnVuY3Rpb24gdG9BcnJheSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC50b0FycmF5KG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZ2V0Q2FsbGJhY2s6IGZ1bmN0aW9uIGdldENhbGxiYWNrICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldENhbGxiYWNrKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgcmFuZG9tOiBmdW5jdGlvbiByYW5kb20gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QucmFuZG9tKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShvLCBmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGFueTogZnVuY3Rpb24gYW55IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5hbnkobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBmaXJzdDogZnVuY3Rpb24gZmlyc3QgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmZpcnN0KG8sIG4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24gbGFzdCAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubGFzdChvLCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGZpbmRDaGlsZEF0UGF0aDogZnVuY3Rpb24gZmluZENoaWxkQXRQYXRoIChwYXRoLCBkZWxpbWl0ZXIsIGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmZpbmRDaGlsZEF0UGF0aChvLCBwYXRoLCBkZWxpbWl0ZXIsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIGNsb25lICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmNsb25lKG8pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgb25seTogZnVuY3Rpb24gb25seSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qub25seS5hcHBseShvLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbiB3aGVyZSAocHJlZGljYXRlRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LndoZXJlKG8sIHByZWRpY2F0ZUZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIHdoZXJlS2V5czogZnVuY3Rpb24gd2hlcmVLZXlzIChwcmVkaWNhdGVGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3Qud2hlcmVLZXlzKG8sIHByZWRpY2F0ZUZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGludmVydDogZnVuY3Rpb24gaW52ZXJ0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIG1heDogZnVuY3Rpb24gbWF4IChmKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5tYXgobywgZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBtaW46IGZ1bmN0aW9uIG1pbiAoZikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QubWluKG8sIGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50czogZnVuY3Rpb24gX2ltcGxlbWVudHMgKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuaW1wbGVtZW50cyhvLCBtZXRob2QpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50c093bjogZnVuY3Rpb24gaW1wbGVtZW50c093biAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5pbXBsZW1lbnRzT3duKG8sIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkYXRlOiB7XG4gICAgICAgICAgICAgICAgYWR2YW5jZURheXM6IGZ1bmN0aW9uIGFkdmFuY2VEYXlzIChuLCBhZGp1c3RGb3JXZWVrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZGF0ZS5hZHZhbmNlRGF5cyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWR2YW5jZU1vbnRoczogZnVuY3Rpb24gYWR2YW5jZU1vbnRocyAobiwgYWRqdXN0Rm9yV2Vla2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRUaGlzVmFsdWVBbmRJbnZva2UoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmRhdGUuYWR2YW5jZU1vbnRocyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgYWR2YW5jZVllYXJzOiBmdW5jdGlvbiBhZHZhbmNlWWVhcnMgKG4sIGFkanVzdEZvcldlZWtlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5kYXRlLmFkdmFuY2VZZWFycyhkLCBuLCBhZGp1c3RGb3JXZWVrZWQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgeXl5eW1tZGQ6IGZ1bmN0aW9uIHl5eXltbWRkIChkZWxpbSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VGhpc1ZhbHVlQW5kSW52b2tlKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5kYXRlLnl5eXltbWRkKGQsIGRlbGltKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNsb2NrVGltZTogZnVuY3Rpb24gY2xvY2tUaW1lIChvbWl0TVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdldFRoaXNWYWx1ZUFuZEludm9rZShmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuZGF0ZS5jbG9ja1RpbWUoZCwgISFvbWl0TVMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIEVycm9yIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBib29sZWFuOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBCb29sZWFuIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBtYXRoOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBNYXRoIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIFJlZ0V4cCB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBsaWJwO1xuICAgIH1cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGxpYnA7XG59KCkpO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBsaWJzIChQcm90b0xpYikge1xuICAgICAgICB2YXIgSVNfQlJPV1NFUiA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnLFxuICAgICAgICAgICAgSEFTX09TICAgICA9IElTX0JST1dTRVIgPyBmYWxzZSA6IHR5cGVvZiByZXF1aXJlKCdvcycpID09PSAnb2JqZWN0JztcblxuICAgICAgICAvLyBVc2VkIGluIE9iamVjdC5zZXRQcm90b3R5cGVPZiBwb2x5ZmlsbCBvbmx5XG4gICAgICAgIHZhciBleGNsdWRlID0gWydsZW5ndGgnLCAnbmFtZScsICdhcmd1bWVudHMnLCAnY2FsbGVyJywgJ3Byb3RvdHlwZSddO1xuXG4gICAgICAgIC8vIFVzZWQgaW4gT2JqZWN0LnNldFByb3RvdHlwZU9mIHBvbHlmaWxsIG9ubHlcbiAgICAgICAgZnVuY3Rpb24gYmluZEZ1bmN0aW9uKG8sIGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmbi5hcHBseShvLCBhcmd1bWVudHMpOyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlZCBpbiBPYmplY3Quc2V0UHJvdG90eXBlT2YgcG9seWZpbGwgb25seVxuICAgICAgICBmdW5jdGlvbiBiaW5kUHJvcGVydHkobywgcGFyZW50LCBwcm9wKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgcHJvcCwge1xuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyByZXR1cm4gcGFyZW50W3Byb3BdOyB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IHBhcmVudFtwcm9wXSA9IHZhbDsgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBwcm9wZXJ0aWVzIG9uIGFuIG9iaiBmcm9tIHRoZSBnaXZlbiBwcm90b3R5cGUuXG4gICAgICAgICAqIFVzZWQgaW4gdGhlIGNhc2UgdGhhdCBPYmplY3Quc2V0UHJvdG90eXBlT2YgYW5kIE9iamVjdC5fX3Byb3RvX18gaXMgdW5hdmFpbGFibGUsIGUuZy4gb25seSBJRSA8IDExXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBpdGVyYXRlUHJvcGVydGllcyAoX3N1YiwgX3N1cGVyKSB7XG4gICAgICAgICAgICB2YXIgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhfc3VwZXIpLFxuICAgICAgICAgICAgICAgIHByb3RvO1xuXG4gICAgICAgICAgICBfc3ViLl9fcHJvdG9fXyA9IF9zdXBlcjsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBwcm9wcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wID0gcHJvcHNbaV07XG5cbiAgICAgICAgICAgICAgICBpZiAocHJvcCA9PT0gJ19fcHJvdG9fXycpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdG8gPSBfc3VwZXIuX19wcm90b19fOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihleGNsdWRlLmluZGV4T2YoaSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfc3ViLCBwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWRlc2NyaXB0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdXBlckRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKF9zdXBlciwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc3VwZXJEZXNjcmlwdG9yLmdldCAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgX3N1cGVyW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3N1Yltwcm9wXSA9IGJpbmRGdW5jdGlvbihfc3ViLCBfc3VwZXJbcHJvcF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZFByb3BlcnR5KF9zdWIsIF9zdXBlciwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHByb3RvKSBpdGVyYXRlUHJvcGVydGllcyhfc3ViLCBwcm90byk7XG4gICAgICAgICAgICByZXR1cm4gX3N1YjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBvbHlmaWxsIE9iamVjdC5zZXRQcm90b3R5cGVPZlxuICAgICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gc2V0UHJvdG90eXBlT2ZQb2x5ZmlsbCAoX3N1YiwgX3N1cGVyKSB7XG4gICAgICAgICAgICBpZihfc3ViLl9fcHJvdG9fXykgeyAgICAgICAgICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICBfc3ViLl9fcHJvdG9fXyA9IF9zdXBlcjsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0ZVByb3BlcnRpZXMoX3N1YiwgX3N1cGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfc3ViO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbHRlcnMgRmlyZWZveCdzIEZ1bmN0aW9uLnRvU3RyaW5nKCkgcmVzdWx0cyB0byBtYXRjaCBDaHJvbWUvU2FmYXJpLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmdW5jdGlvbi5cbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgYWx0ZXJlZCBzdHJpbmcsIHdpdGggbmV3bGluZXMgcmVwbGFjZWQgYW5kICd1c2Ugc3RyaWN0JyByZW1vdmVkLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oPzpcXHIpP1xcbisvZywgJycpLnJlcGxhY2UoL1widXNlIHN0cmljdFwiO3wndXNlIHN0cmljdCc7L2csICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJRSBkb2Vzbid0IGFsbG93IE9iamVjdC5rZXlzIG9uIHByaW1pdGl2ZSB0eXBlcy4uLlxuICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTxTdHJpbmd8TnVtYmVyPn1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldEtleXMgKG8pIHtcbiAgICAgICAgICAgIHN3aXRjaCh0eXBlb2Ygbykge1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvID8gT2JqZWN0LmtleXMobykgOiBbXTtcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBvLmxlbmd0aDsgaSsrKSBrZXlzLnB1c2goaS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgTlVMTF9GVU5DVElPTiA9IGZ1bmN0aW9uIEVNUFRZX0NBTExCQUNLX1JFUExBQ0VNRU5UICgpIHt9O1xuXG4gICAgICAgIHZhciBsaWJzID0ge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0cmluZyBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RyaW5nOiB7XG5cbiAgICAgICAgICAgICAgICB0b0pTVmFsdWU6IGZ1bmN0aW9uIHRvSlNWYWx1ZSAocykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSBzO1xuICAgICAgICAgICAgICAgICAgICBzID0gcy50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgcyA9PT0gJ2ZhbHNlJyAgICAgOiByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHMgPT09ICd0cnVlJyAgICAgIDogcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHMgPT09ICdudWxsJyAgICAgIDogcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHMgPT09ICd1bmRlZmluZWQnIDogcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBsaWJzLm9iamVjdC5pc051bWVyaWMocyk6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmdldE51bWVyaWMocyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICByYW5kb21TdHJpbmc6IGZ1bmN0aW9uIHJhbmRvbVN0cmluZyAobGVuZ3RoLCBwb3NzaWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBwb3NzaWJsZSA9IHR5cGVvZiBwb3NzaWJsZSA9PT0gJ3N0cmluZycgPyBwb3NzaWJsZSA6ICcwMTIzNDU2Nzg5YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVVZXWFlaXyBgfiFAIyQlXiYqKClfK1xcXFx8XVtcXCc7Ly4sfH17XCI6Pz48JztcbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoICAgPSBsaWJzLm9iamVjdC5pc051bWVyaWMobGVuZ3RoKSA/IGxlbmd0aCA6IDEwO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXMgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzICs9IHBvc3NpYmxlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb3NzaWJsZS5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ2FtZWxpemVzIGFsbCBvZiB0aGUgcHJvdmlkZWQgc3RyaW5nIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLlN0cmluZ30gc3RyaW5nIEEgbGlzdCBvZiBzdHJpbmdzIHRvIGNhbWVsaXplLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PFN0cmluZz59IEFuIGFycmF5IG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMsIHdpdGggYWxsIHN0cmluZ3MgY2FtZWxpemVkLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNhbWVsaXplOiBmdW5jdGlvbiBjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzID09PSAnZnVuY3Rpb24nKSBzID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcyA9IHMudG9TdHJpbmcoKS5yZXBsYWNlKC9bXmEtejAtOSRdL2dpLCAnXycpLnJlcGxhY2UoL1xcJChcXHcpL2csICckXyQxJykuc3BsaXQoL1tcXHNfXSsvZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChzLCAxLCBzLmxlbmd0aCwgZnVuY3Rpb24gKGksIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trXSA9IGxpYnMuc3RyaW5nLnVjRmlyc3QoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcyA9IGxpYnMuc3RyaW5nLmxjRmlyc3Qocy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQubGVuZ3RoID09PSAxID8gcmV0WzBdIDogcmV0O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBEZWNhbWVsaXplcyBhbGwgb2YgdGhlIHByb3ZpZGVkIHN0cmluZyBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHN0cmluZyBBIGxpc3Qgb2Ygc3RyaW5ncyB0byBkZWNhbWVsaXplLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PFN0cmluZz59IEFuIGFycmF5IG9mIHRoZSBwcm92aWRlZCBhcmd1bWVudHMsIHdpdGggYWxsIHN0cmluZ3MgZGVjYW1lbGl6ZWQuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGVjYW1lbGl6ZTogZnVuY3Rpb24gZGVjYW1lbGl6ZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzID09PSAnZnVuY3Rpb24nKSBzID0gZml4RmlyZWZveEZ1bmN0aW9uU3RyaW5nKHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcyA9IHMudG9TdHJpbmcoKS5yZXBsYWNlKC8oW0EtWiRdKS9nLCBmdW5jdGlvbiAoJCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyAnICsgKHR5cGVvZiAkID09PSAnc3RyaW5nJyA/ICQudG9Mb3dlckNhc2UoKSA6ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5yZXBsYWNlKC9mdW5jdGlvbiBcXChcXCkvZywgJ2Z1bmN0aW9uKCknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKHR5cGVvZiBzID09PSAnc3RyaW5nJyA/IHMudHJpbSgpIDogcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0Lmxlbmd0aCA9PT0gMSA/IHJldFswXSA6IHJldDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhbGwgdGhlIGNoYXJhY3RlcnMgZm91bmQgaW4gb25lIHN0cmluZyBidXQgbm90IHRoZSBvdGhlci5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG90aGVyIFRoZSBzdHJpbmcgdG8gY29tcHV0ZSB0aGUgZGlmZmVyZW5jZSBhZ2FpbnN0LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gQSBkaWZmZXJlbmNlIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkaWZmZXJlbmNlRnJvbVN0cmluZzogZnVuY3Rpb24gZGlmZmVyZW5jZUZyb21TdHJpbmcgKHMsIG90aGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvdGhlciAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHMgIT09ICdzdHJpbmcnKSByZXR1cm4gcztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhcnIgPSBzLnNwbGl0KCcnKSwgb2FyciA9IG90aGVyLnNwbGl0KCcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkuZGlmZmVyZW5jZShzYXJyLCBvYXJyKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBvbmx5IHRoZSBjaGFyYWN0ZXJzIGNvbW1vbiB0byBib3RoIHN0cmluZ3NcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG90aGVyIFRoZSBzdHJpbmcgdG8gY29tcHV0ZSB0aGUgaW50ZXJzZWN0aW9uIGFnYWluc3QuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgaW50ZXJzZWN0aW9uIGJldHdlZW4gdGhlIHR3byBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGludGVyc2VjdFN0cmluZzogZnVuY3Rpb24gaW50ZXJzZWN0U3RyaW5nIChzLCBvdGhlcikge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3RoZXIgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzICE9PSAnc3RyaW5nJykgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYXJyID0gcy5zcGxpdCgnJyksIG9hcnIgPSBvdGhlci5zcGxpdCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLmFycmF5LmludGVyc2VjdChzYXJyLCBvYXJyKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVwZWF0IGEgc3RyaW5nICd0aW1lcycgdGltZXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lcyBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmVwZWF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0IChzLCB0aW1lcykge1xuICAgICAgICAgICAgICAgICAgICB0aW1lcyA9IHBhcnNlSW50KHRpbWVzLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVzID0gaXNOYU4odGltZXMpIHx8ICFpc0Zpbml0ZSh0aW1lcykgfHwgdGltZXMgPD0gMCA/IDEgOiB0aW1lcztcblxuICAgICAgICAgICAgICAgICAgICB2YXIgb3MgPSBzO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAxOyBpIDwgdGltZXM7IGkrKykgcyArPSBvcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJpZ2h0IHRyaW1zIGEgc3RyaW5nLiBTYW1lIGFzIFN0cmluZy50cmltLCBidXQgb25seSBmb3IgdGhlIGVuZCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFt3aGF0PSdcXFxccysnXSBXaGF0IHRvIHRyaW0uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgcmlnaHQgdHJpbW1lZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBydHJpbTogZnVuY3Rpb24gcnRyaW0gKHMsIHdoYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hhdCA9IHR5cGVvZiB3aGF0ID09PSAnc3RyaW5nJyA/IHdoYXQgOiAnXFxcXHMrJztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZShuZXcgUmVnRXhwKHdoYXQgKyAnJCcpLCAnJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIExlZnQgdHJpbXMgYSBzdHJpbmcuIFNhbWUgYXMgU3RyaW5nLnRyaW0sIGJ1dCBvbmx5IGZvciB0aGUgYmVnaW5uaW5nIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3doYXQ9J1xcXFxzKyddIFdoYXQgdG8gdHJpbS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBsZWZ0IHRyaW1tZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbHRyaW06IGZ1bmN0aW9uIGx0cmltIChzLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHdoYXQgPSB0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgPyB3aGF0IDogJ1xcXFxzKyc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyB3aGF0KSwgJycpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBFc2NhcGVzIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIEhUTUwgZXNjYXBlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBodG1sRW5jb2RlOiBmdW5jdGlvbiBodG1sRW5jb2RlIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnJicgIDogJyZhbXA7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICc8JyAgOiAnJmx0OycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnPicgIDogJyZndDsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1wiJyAgOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdcXCcnIDogJyYjMDM5OydcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvWyY8PlwiJ10vZywgZnVuY3Rpb24gKG0pIHsgcmV0dXJuIG1hcFttXTsgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFVuLWVzY2FwZXMgSFRNTCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgSFRNTCBlc2NhcGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGh0bWxEZWNvZGU6IGZ1bmN0aW9uIGh0bWxEZWNvZGUgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICcmYW1wOycgIDogJyYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyZsdDsnICAgOiAnPCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJmd0OycgICA6ICc+JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcmcXVvdDsnIDogJ1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcmIzAzOTsnIDogJ1xcJydcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKCZhbXA7fCZsdDt8Jmd0O3wmcXVvdDt8JiMwMzk7KS9nLCBmdW5jdGlvbiAobSkgeyByZXR1cm4gbWFwW21dOyB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ3JlYXRlcyBhbiAnZXZhbCcgc2FmZSBzdHJpbmcsIGJ5IGFkZGluZyBzbGFzaGVzIHRvIFwiLCAnLCBcXHQsIFxcbiwgXFxmLCBcXHIsIGFuZCB0aGUgTlVMTCBieXRlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEEgc3RyaW5nIHdpdGggc2xhc2hlc1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGFkZFNsYXNoZXM6IGZ1bmN0aW9uIGFkZFNsYXNoZXMgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvW1xcXFxcIidcXHRcXG5cXGZcXHJdL2csICdcXFxcJCYnKS5yZXBsYWNlKC9cXHUwMDAwL2csICdcXFxcMCcpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBjYXBpdGFsaXplZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciB1cHBlciBjYXNlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB1Y0ZpcnN0OiBmdW5jdGlvbiB1Y0ZpcnN0IChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBsZXR0ZXIgbG93ZXJjYXNlZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGggdGhlIGZpcnN0IGxldHRlciBsb3dlciBjYXNlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBsY0ZpcnN0OiBmdW5jdGlvbiBsY0ZpcnN0IChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgcy5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHN0cmluZyBpbiBUaXRsZSBDYXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSB0aXRsZSBjYXNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdGl0bGVDYXNlOiBmdW5jdGlvbiB0aXRsZUNhc2UgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKHMuc3BsaXQoJyAnKSwgZnVuY3Rpb24gKHQpIHsgYXJyLnB1c2gobGlicy5zdHJpbmcudWNGaXJzdCh0KSk7IH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyLmpvaW4oJyAnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU3BsaWNlcyBhIHN0cmluZywgbXVjaCBsaWtlIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXggVGhlIGluZGV4IHRvIGJlZ2luIHNwbGljaW5nIHRoZSBzdHJpbmcgYXRcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gY291bnQgVGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRvIGRlbGV0ZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhZGQgVGhlIHN0cmluZyB0byBhcHBlbmQgYXQgdGhlIHNwbGljZWQgc2VjdGlvblxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHNwbGljZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNwbGljZTogZnVuY3Rpb24gc3BsaWNlIChzLCBpbmRleCwgY291bnQsIGFkZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5zbGljZSgwLCBpbmRleCkgKyAoYWRkIHx8ICcnKSArIHMuc2xpY2UoaW5kZXggKyBjb3VudCk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybiBhIHRydW5jYXRlZCBzdHJpbmcgd2l0aCBlbGxpcHNlcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBsZW5ndGggVGhlIGxlbmd0aCBvZiB0aGUgZGVzaXJlZCBzdHJpbmcuIElmIG9tbWl0ZWQsIHRoZSBzdHJpbmdzIG9yaWdpbmFsIGxlbmd0aCB3aWxsIGJlIHVzZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmc9fSBbcGxhY2U9J2JhY2snXSBQb3NzaWJsZSB2YWx1ZXMgYXJlICdmcm9udCcgYW5kICdiYWNrJy4gU3BlY2lmeWluZyAnZnJvbnQnIHdpbGwgdHJ1bmNhdGUgdGhlXG4gICAgICAgICAgICAgICAgICogc3RyaW5nIGFuZCBhZGQgZWxsaXBzZXMgdG8gdGhlIGZyb250LCAnYmFjaycgKG9yIGFueSBvdGhlciB2YWx1ZSkgd2lsbCBhZGQgdGhlIGVsbGlwc2VzIHRvIHRoZSBiYWNrLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2VsbGlwc2VzPScuLi4nXSBUaGUgc3RyaW5nIHZhbHVlIG9mIHRoZSBlbGxpcHNlcy4gVXNlIHRoaXMgdG8gYWRkIGFueXRoaW5nIG90aGVyIHRoYW4gJy4uLidcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBBIHRydW5jYXRlZCBzdHJpbmcgd2l0aCBlbGxpcHNlcyAoaWYgaXRzIGxlbmd0aCBpcyBncmVhdGVyIHRoYW4gJ2xlbmd0aCcpXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZWxsaXBzZXM6IGZ1bmN0aW9uIGVsbGlwc2VzXyAocywgbGVuZ3RoLCBwbGFjZSwgZWxsaXBzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoaXNOYU4ocGFyc2VJbnQobGVuZ3RoLCAxMCkpKSBsZW5ndGggPSBzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYobGVuZ3RoIDwgMCB8fCAhaXNGaW5pdGUobGVuZ3RoKSkgbGVuZ3RoID0gMDtcblxuICAgICAgICAgICAgICAgICAgICBlbGxpcHNlcyA9IHR5cGVvZiBlbGxpcHNlcyA9PT0gJ3N0cmluZycgPyBlbGxpcHNlcyA6ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBpZihzLmxlbmd0aCA8PSBsZW5ndGgpIHJldHVybiBzO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8PSBlbGxpcHNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGxpcHNlcy5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKCFwbGFjZSB8fCBwbGFjZSAhPT0gJ2Zyb250Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKDAsIGxlbmd0aCAtIGVsbGlwc2VzLmxlbmd0aCkgKyBlbGxpcHNlcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGxpcHNlcyArIHMuc3Vic3RyKDAsIGxlbmd0aCAtIGVsbGlwc2VzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU2h1ZmZsZXMgYSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHNwbGl0dGVyIEEgc3RyaW5nIHVzZWQgdG8gc3BsaXQgdGhlIHN0cmluZywgdG8gdG9rZW5pemUgaXQgYmVmb3JlIHNodWZmbGluZy5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBtaXhlZCB1cCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgc2h1ZmZsZTogZnVuY3Rpb24gc2h1ZmZsZSAocywgc3BsaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBzLnNwbGl0KHR5cGVvZiBzcGxpdHRlciA9PT0gJ3N0cmluZycgPyBzcGxpdHRlciA6ICcnKSwgbiA9IGEubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlU3BsaXRzID0gbiAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gbiAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gYVtpXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYVtpXSA9IGFbal07XG4gICAgICAgICAgICAgICAgICAgICAgICBhW2pdID0gdG1wO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBrID0gMDsgayA8IHJlcGxhY2VTcGxpdHM7IGsrKykgYS5zcGxpY2UobGlicy5udW1iZXIucmFuZG9tSW50SW5SYW5nZSgwLCBhLmxlbmd0aCksIDAsIHNwbGl0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuam9pbignJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldmVyc2VzIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSByZXZlcnNlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gcmV2ZXJzZSAocykge1xuICAgICAgICAgICAgICAgICAgICBpZihzLmxlbmd0aCA8IDY0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBzLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHN0ciArPSBzLmNoYXJBdChpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFN0cmlwcyB0aGUgdHJhaWxpbmcgc2xhc2hlcyBmcm9tIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBJZiB1c2luZyBOb2RlLmpzLCBpdCB3aWxsIHJlcGxhY2UgdGhlIHRyYWlsaW5nIHNsYXNoIGJhc2VkIG9uIHRoZSB2YWx1ZSBvZiBvcy5wbGF0Zm9ybVxuICAgICAgICAgICAgICAgICAqIChpLmUuIGlmIHdpbmRvd3MsICdcXFxcJyB3aWxsIGJlIHJlcGxhY2VkLCAnLycgb3RoZXJ3aXNlKS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHdpdGhvdXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aXRob3V0VHJhaWxpbmdTbGFzaDogZnVuY3Rpb24gd2l0aG91dFRyYWlsaW5nU2xhc2ggKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIUlTX0JST1dTRVIgJiYgSEFTX09TICYmIHJlcXVpcmUoJ29zJykucGxhdGZvcm0gPT09ICd3aW4zMicpIHJldHVybiBzLnJlcGxhY2UoL1xcXFwrJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkZCBhIHRyYWlsaW5nIHNsYXNoIHRvIGEgc3RyaW5nLCBpZiBpdCBkb2Vzbid0IGFscmVhZHkgaGF2ZSBvbmUuXG4gICAgICAgICAgICAgICAgICogSWYgdXNpbmcgTm9kZS5qcywgaXQgd2lsbCByZXBsYWNlIHRoZSB0cmFpbGluZyBzbGFzaCBiYXNlZCBvbiB0aGUgdmFsdWUgb2Ygb3MucGxhdGZvcm1cbiAgICAgICAgICAgICAgICAgKiAoaS5lLiBpZiB3aW5kb3dzLCAnXFxcXCcgd2lsbCBiZSByZXBsYWNlZCwgJy8nIG90aGVyd2lzZSkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHMgVGhlIHN0cmluZyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdpdGhUcmFpbGluZ1NsYXNoOiBmdW5jdGlvbiB3aXRoVHJhaWxpbmdTbGFzaCAocykge1xuICAgICAgICAgICAgICAgICAgICBpZighSVNfQlJPV1NFUiAmJiBIQVNfT1MgJiYgcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykgcmV0dXJuIGxpYnMuc3RyaW5nLndpdGhvdXRUcmFpbGluZ1NsYXNoKHMpICsgJ1xcXFwnO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5zdHJpbmcud2l0aG91dFRyYWlsaW5nU2xhc2gocykgKyAnLyc7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEVzY2FwZXMgcmVndWxhciBleHByZXNzaW9uIHNwZWNpYWwgY2hhcmFjdGVycy4gVGhpcyBpcyB1c2VmdWwgaXMgeW91IHdpc2ggdG8gY3JlYXRlIGEgbmV3IHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgICAgICAgICAgICAgICAqIGZyb20gYSBzdG9yZWQgc3RyaW5nIHZhbHVlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVndWxhciBleHByZXNzaW9uIHNhZmUgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVnZXhwU2FmZTogZnVuY3Rpb24gcmVnZXhwU2FmZSAocykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUGFkcyBhIHN0cmluZyB3aXRoICdkZWxpbScgY2hhcmFjdGVycyB0byB0aGUgc3BlY2lmaWVkIGxlbmd0aC4gSWYgdGhlIGxlbmd0aCBpcyBsZXNzIHRoYW4gdGhlIHN0cmluZyBsZW5ndGgsXG4gICAgICAgICAgICAgICAgICogdGhlIHN0cmluZyB3aWxsIGJlIHRydW5jYXRlZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcyBUaGUgc3RyaW5nIHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCBUaGUgbGVuZ3RoIHRvIHBhZCB0aGUgc3RyaW5nIHRvLiBJZiBsZXNzIHRoYXQgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nLCB0aGUgc3RyaW5nIHdpbGxcbiAgICAgICAgICAgICAgICAgKiBiZSByZXR1cm5lZC4gSWYgbGVzcyB0aGFuIHRoZSBsZW5ndGggb2YgdGhlIHN0cmluZywgdGhlIHN0cmluZyB3aWxsIGJlIHNsaWNlZC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkZWxpbT0nICddIFRoZSBjaGFyYWN0ZXIgdG8gcGFkIHRoZSBzdHJpbmcgd2l0aC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbcHJlPWZhbHNlXSBJZiB0cnVlLCB0aGUgcGFkZGluZyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZywgb3RoZXJ3aXNlIHRoZSBwYWRkaW5nXG4gICAgICAgICAgICAgICAgICogd2lsbCBiZSBhZGRlZCB0byB0aGUgZW5kLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBwYWRkZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcGFkOiBmdW5jdGlvbiBwYWQgKHMsIGxlbmd0aCwgZGVsaW0sIHByZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaSwgdGhpc0xlbmd0aCA9IHMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFkZWxpbSkgZGVsaW0gPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnOyBlbHNlIGlmKGlzTmFOKHBhcnNlSW50KGxlbmd0aCwgMTApKSkgcmV0dXJuIHM7XG5cbiAgICAgICAgICAgICAgICAgICAgbGVuZ3RoID0gcGFyc2VJbnQobGVuZ3RoLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGxlbmd0aCA8IHRoaXNMZW5ndGgpIHJldHVybiAhcHJlID8gcy5zbGljZSgwLCBsZW5ndGgpIDogcy5zbGljZSgtbGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihwcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGxlbmd0aCAtIHRoaXNMZW5ndGg7IGkrKykgcyA9IGRlbGltICsgcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IGxlbmd0aCAtIHRoaXNMZW5ndGg7IGkrKykgcyArPSBkZWxpbTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVwbGFjZXMgbmV3bGluZXMgd2l0aCBiciB0YWdzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCBuZXdsaW5lcyBjb252ZXJ0ZWQgdG8gYnIgdGFncy5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBuZXdsaW5lVG9CcmVhazogZnVuY3Rpb24gbmV3bGluZVRvQnJlYWsgKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKFxcclxcbnxcXG4pL2csICc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlcGxhY2VzIHRhYnMgd2l0aCBhIHNwYW4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAndGFiJ1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBzdHJpbmcgd2l0aCB0YWJzIGNvbnZlcnRlZCB0byBzcGFucyB3aXRoIHRoZSBjbGFzcyAndGFiJ1xuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRhYnNUb1NwYW46IGZ1bmN0aW9uIHRhYnNUb1NwYW4gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFx0L2csICc8c3BhbiBjbGFzcz1cInRhYlwiPjwvc3Bhbj4nKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWRqdXN0cyBhIHN0cmluZyB0byBmaXQgd2l0aGluIHRoZSBjb25maW5lcyBvZiAnd2lkdGgnLCB3aXRob3V0IGJyZWFraW5nIHdvcmRzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzIFRoZSBzdHJpbmcgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtsZW5ndGg9MTIwXSBUaGUgbGVuZ3RoIHRvIHdvcmQgd3JhcCB0aGUgc3RyaW5nIHRvLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3BhZGxlZnQ9MF0gVGhlIG51bWJlciBvZiBjb2x1bW5zIHRvIHBhZCB0aGUgc3RyaW5nIG9uIHRoZSBsZWZ0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcGFkcmlnaHQ9MF0gVGhlIG51bWJlciBvZiBjb2x1bW5zIHRvIHBhZCB0aGUgc3RyaW5nIG9uIHRoZSByaWdodFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IG9taXRGaXJzdCBJZiB0cnVlLCB0aGUgZmlyc3QgbGluZSB3aWxsIG5vdCBiZSBwYWRkZWQgbGVmdFxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHN0cmluZyBhZGp1c3RlZCBhbmQgcGFkZGVkIGZvciB0aGUgc3Rkb3V0LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdvcmRXcmFwVG9MZW5ndGg6IGZ1bmN0aW9uIHdvcmRXcmFwVG9MZW5ndGggKHMsIHdpZHRoLCBwYWRsZWZ0LCBwYWRyaWdodCwgb21pdEZpcnN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHBhZHJpZ2h0ID09PSB1bmRlZmluZWQgJiYgcGFkbGVmdCkgcGFkcmlnaHQgPSBwYWRsZWZ0O1xuXG4gICAgICAgICAgICAgICAgICAgIHBhZGxlZnQgID0gIWlzTmFOKHBhcnNlSW50KHBhZGxlZnQsICAxMCkpID8gcGFyc2VJbnQocGFkbGVmdCwgMTApICA6IDA7XG4gICAgICAgICAgICAgICAgICAgIHBhZHJpZ2h0ID0gIWlzTmFOKHBhcnNlSW50KHBhZHJpZ2h0LCAxMCkpID8gcGFyc2VJbnQocGFkcmlnaHQsIDEwKSA6IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhZGRpbmdMZWZ0ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBwYWRsZWZ0OyAgbisrKSBwYWRkaW5nTGVmdCAgKz0gJyAnO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xzICAgPSAhaXNOYU4ocGFyc2VJbnQod2lkdGgsIDEwKSkgPyBsZW5ndGggOiAxMjAsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnIgICAgPSBzLnNwbGl0KCcgJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtICAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVuICAgID0gIW9taXRGaXJzdCA/IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQgOiBjb2xzIC0gcGFkcmlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgICAgPSAhb21pdEZpcnN0ID8gcGFkZGluZ0xlZnQgOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZW4gICA9IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUoKGl0ZW0gPSBhcnIuc2hpZnQoKSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbS5sZW5ndGggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gaXRlbSArICcgJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gLT0gaXRlbS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihpdGVtLmxlbmd0aCA+IG9sZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gaXRlbS5zdWJzdHJpbmcoMCwgbGVuIC0gMSkgKyAnLVxcbicgKyBwYWRkaW5nTGVmdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnIudW5zaGlmdChpdGVtLnN1YnN0cmluZyhsZW4sIGl0ZW0ubGVuZ3RoIC0gMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbiA9IGNvbHMgLSBwYWRyaWdodCAtIHBhZGxlZnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbicgKyBwYWRkaW5nTGVmdCArIGl0ZW0gKyAnICc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gY29scyAtIHBhZHJpZ2h0IC0gMSAtIHBhZGxlZnQgLSBpdGVtLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGF0ZSBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF0ZToge1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIE1vdmVzIGEgZGF0ZSBmb3J3YXJkICdkYXlzSW5UaGVGdXR1cmUnIGRheXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gZGF5c0luVGhlRnV0dXJlIFRoZSBudW1iZXIgb2YgZGF5cyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhZHZhbmNlRGF5czogZnVuY3Rpb24gYWR2YW5jZURheXMgKGQsIGRheXNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGQgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgICAgIGRheXNJblRoZUZ1dHVyZSA9IGRheXNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKGRheXNJblRoZUZ1dHVyZSkgPyBkYXlzSW5UaGVGdXR1cmUgOiAxO1xuICAgICAgICAgICAgICAgICAgICBkLnNldFRpbWUoZC5nZXRUaW1lKCkgKyAoZGF5c0luVGhlRnV0dXJlICogODY0MDAwMDApKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ21vbnRoc0luVGhlRnV0dXJlJyBtb250aHMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbW9udGhzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiBtb250aHMgaW4gdGhlIGZ1dHVyZSB0byBhZHZhbmNlIHRoZSBkYXRlXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtCb29sZWFuPX0gW2FkanVzdEZvcldlZWtlbmQ9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRoZSBkYXRlIHNob3VsZCBmYWxsIG9uIGEgd2Vla2VuZCBkYXlcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIGRhdGUsIGFkanVzdGVkIHRoZSBudW1iZXIgb2Ygc3BlY2lmaWVkIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhZHZhbmNlTW9udGhzOiBmdW5jdGlvbiBhZHZhbmNlTW9udGhzIChkLCBtb250aHNJblRoZUZ1dHVyZSwgYWRqdXN0Rm9yV2Vla2VuZCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGQgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoc0luVGhlRnV0dXJlID0gbW9udGhzSW5UaGVGdXR1cmUgJiYgbGlicy5nZW5lcmljLmlzTnVtZXJpYyhtb250aHNJblRoZUZ1dHVyZSkgPyBtb250aHNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArIChtb250aHNJblRoZUZ1dHVyZSAqIDI2Mjk3NDYwMDApKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogTW92ZXMgYSBkYXRlIGZvcndhcmQgJ3llYXJzSW5UaGVGdXR1cmUnIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHllYXJzSW5UaGVGdXR1cmUgVGhlIG51bWJlciBvZiB5ZWFycyBpbiB0aGUgZnV0dXJlIHRvIGFkdmFuY2UgdGhlIGRhdGVcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW49fSBbYWRqdXN0Rm9yV2Vla2VuZD1mYWxzZV0gV2hldGhlciBvciBub3QgdGhlIGRhdGUgc2hvdWxkIGZhbGwgb24gYSB3ZWVrZW5kIGRheVxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgZGF0ZSwgYWRqdXN0ZWQgdGhlIG51bWJlciBvZiBzcGVjaWZpZWQgeWVhcnMuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYWR2YW5jZVllYXJzOiBmdW5jdGlvbiBhZHZhbmNlWWVhcnMgKGQsIHllYXJzSW5UaGVGdXR1cmUsIGFkanVzdEZvcldlZWtlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybiBkO1xuICAgICAgICAgICAgICAgICAgICB5ZWFyc0luVGhlRnV0dXJlID0geWVhcnNJblRoZUZ1dHVyZSAmJiBsaWJzLmdlbmVyaWMuaXNOdW1lcmljKHllYXJzSW5UaGVGdXR1cmUpID8geWVhcnNJblRoZUZ1dHVyZSA6IDE7XG4gICAgICAgICAgICAgICAgICAgIGQuc2V0VGltZShkLmdldFRpbWUoKSArICh5ZWFyc0luVGhlRnV0dXJlICogMzE1MzYwMDAwMDApKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhZGp1c3RGb3JXZWVrZW5kICYmIChkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShkLmdldERheSgpID09PSAwIHx8IGQuZ2V0RGF5KCkgPT09IDYpIGQuc2V0VGltZShkLmdldFRpbWUoKSArIDg2NDAwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgZGF0ZSBpbiB0aGUgeXl5eS1tbS1kZCBmb3JtYXQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBUaGUgZGF0ZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2RlbGltPSctJ10gVGhlIGRlbGltaXRlciB0byB1c2VkIHRoZSBzZXBhcmF0ZSB0aGUgZGF0ZSBjb21wb25lbnRzIChlLmcuICctJyBvciAnLicpXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGRhdGUgaW4gdGhlIHl5eXktbW0tZGQgZm9ybWF0LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHl5eXltbWRkOiBmdW5jdGlvbiB5eXl5bW1kZCAoZCwgZGVsaW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkIGluc3RhbmNlb2YgRGF0ZSkpIHJldHVybiBkO1xuICAgICAgICAgICAgICAgICAgICBkZWxpbSA9IHR5cGVvZiBkZWxpbSAhPT0gJ3N0cmluZycgPyAnLScgOiBkZWxpbSA7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRkICAgPSBkLmdldERhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1tICAgPSBkLmdldE1vbnRoKCkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgeXl5eSA9IGQuZ2V0RnVsbFllYXIoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihkZCA8IDEwKSBkZCA9ICcwJyArIGRkO1xuICAgICAgICAgICAgICAgICAgICBpZihtbSA8IDEwKSBtbSA9ICcwJyArIG1tO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geXl5eSArIGRlbGltICsgbW0gKyBkZWxpbSArIGRkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJ0cyBhIGRhdGUgdG8gdGhlIEhIOk1NOlNTLk1TRUMgdGltZSBmb3JtYXRcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0RhdGV9IFRoZSBkYXRlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtvbWl0TVM9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgdGhlIE1TIHBvcnRpb24gb2YgdGhlIHJldHVybmVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBmb3JtYXR0ZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKGQsIG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICBpZighKGQgaW5zdGFuY2VvZiBEYXRlKSkgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5jbG9ja1RpbWUoZC5nZXRUaW1lKCksICEhb21pdE1TKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE51bWJlciBsaWJyYXJ5IGZ1bmN0aW9uc1xuICAgICAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbnVtYmVyOiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIGludGVnZXIgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbUludEluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUludChtaW4sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gcGFyc2VJbnQobWF4LCAxMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoaXNOYU4obWluKSAmJiAhaXNGaW5pdGUobWluKSkgbWluID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYoaXNOYU4obWF4KSAmJiAhaXNGaW5pdGUobWF4KSkgbWF4ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgYSByYW5kb20gZmxvYXQgaW4gcmFuZ2UgW21pbiwgbWF4XSAoaW5jbHVzaXZlKVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gVGhlIG1pbmltdW0gcG9zc2libGUgdmFsdWUgKGluY2x1c2l2ZSlcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbWF4IFRoZSBtYXhpbXVtIHBvc3NpYmxlIHZhbHVlIChpbmNsdXNpdmUpXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfSBBIHJhbmRvbSBudW1iZXIgYmV0d2VlbiBtaW4gYW5kIG1heFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbU51bWJlckluUmFuZ2U6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgICAgICAgICAgICAgICAgICBtaW4gPSBwYXJzZUZsb2F0KG1pbik7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IHBhcnNlRmxvYXQobWF4KTtcblxuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtaW4pICYmICFpc0Zpbml0ZShtaW4pKSBtaW4gPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZihpc05hTihtYXgpICYmICFpc0Zpbml0ZShtYXgpKSBtYXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZWN1cnNpdmVseSBjb21wdXRlcyB0aGUgZmFjdG9yaWFsIG9mIHRoZSBudW1iZXIgbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBBIG51bWJlci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ8SW5maW5pdHl9IG4hXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZmFjdG9yaWFsOiBmdW5jdGlvbiBmYWN0b3JpYWwgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPCAwKSByZXR1cm4gTmFOO1xuICAgICAgICAgICAgICAgICAgICBpZihuID4gMTcwKSByZXR1cm4gSW5maW5pdHk7XG4gICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDAgfHwgbiA9PT0gMSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuICogZmFjdG9yaWFsKG4gLSAxKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRGV0ZXJtaW5lcyBpcyB0aGUgZ2l2ZW4gbnVtYmVycyBhcmUgaW50ZWdlcnNcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk51bWJlcn0gbiBOdW1iZXJzLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgYWxsIGFyZ3VtZW50cyBhcmUgaW50ZWdlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0ludDogZnVuY3Rpb24gaXNJbnQgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyAmJiBuICUgMSA9PT0gMCAmJiBuLnRvU3RyaW5nKCkuaW5kZXhPZignLicpID09PSAtMTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJlY3Vyc2l2ZWx5IGNvbXB1dGVzIG4gY2hvb3NlIGsuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gQSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGsgQSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7TnVtYmVyfEluZmluaXR5fSBuIGNob29zZSBrLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNob29zZTogZnVuY3Rpb24gY2hvb3NlIChuLCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCB0eXBlb2YgayAhPT0gJ251bWJlcicpIHJldHVybiBOYU47XG4gICAgICAgICAgICAgICAgICAgIGlmKGsgPT09IDApIHJldHVybiAxO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG4gKiBjaG9vc2UobiAtIDEsIGsgLSAxKSkgLyBrO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBQYWRzIGEgbnVtYmVyIHdpdGggcHJlY2VlZGluZyB6ZXJvcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggVGhlIGZpbmFsIGxlbmd0aCBvZiB0aGUgc3RyaW5nXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHBhZGRlZCBudW1iZXIsIG5vdyBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBwYWQ6IGZ1bmN0aW9uIHBhZCAobiwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLnN0cmluZy5wYWQobi50b1N0cmluZygpLCBsZW5ndGgsICcwJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGF5c0Zyb206IGZ1bmN0aW9uIGRheXNGcm9tIChuLCBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkYXRlID09PSAnbnVtYmVyJykgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgIGRhdGUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGRheXMuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGF5c0Zyb21Ob3c6IGZ1bmN0aW9uIGRheXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5kYXlzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBkYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbTogZnVuY3Rpb24gc2Vjb25kc0Zyb20gKG4sIGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIGRhdGUgPT09ICdudW1iZXInKSBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSAgZGF0ZSA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGF0ZS5zZXRTZWNvbmRzKGRhdGUuZ2V0U2Vjb25kcygpICsgbik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBjdXJyZW50IGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzZWNvbmRzRnJvbU5vdzogZnVuY3Rpb24gc2Vjb25kc0Zyb21Ob3cgKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb206IGZ1bmN0aW9uIHllYXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHllYXJzLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0Zyb21Ob3c6IGZ1bmN0aW9uIHllYXJzRnJvbU5vdyAobikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5udW1iZXIueWVhcnNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIG1vZGlmaWVkIGRhdGUuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbW9udGhzRnJvbTogZnVuY3Rpb24gbW9udGhzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldE1vbnRoKGRhdGUuZ2V0TW9udGgoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIG1vbnRocy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgZGF0ZSBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtb250aHNGcm9tTm93OiBmdW5jdGlvbiBtb250aHNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5tb250aHNGcm9tKG4sIG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBBZHZhbmNlcyAob3IgcmV2ZXJzZXMpIHRoZSBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIFRoZSBkYXRlIHRvIGNoYW5nZS5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBUaGUgbW9kaWZpZWQgZGF0ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBob3Vyc0Zyb206IGZ1bmN0aW9uIGhvdXJzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldEhvdXJzKGRhdGUuZ2V0SG91cnMoKSArIG4pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQWR2YW5jZXMgKG9yIHJldmVyc2VzKSB0aGUgY3VycmVudCBkYXRlIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGhvdXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGhvdXJzRnJvbU5vdzogZnVuY3Rpb24gaG91cnNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5ob3Vyc0Zyb20obiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGRhdGUgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSBUaGUgZGF0ZSB0byBjaGFuZ2UuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBtb2RpZmllZCBkYXRlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1pbnV0ZXNGcm9tOiBmdW5jdGlvbiBtaW51dGVzRnJvbSAobiwgZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGF0ZSA9PT0gJ251bWJlcicpIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpICBkYXRlID0gbmV3IERhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkYXRlLnNldE1pbnV0ZXMoZGF0ZS5nZXRNaW51dGVzKCkgKyBuKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGU7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEFkdmFuY2VzIChvciByZXZlcnNlcykgdGhlIGN1cnJlbnQgZGF0ZSB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gVGhlIGRhdGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWludXRlc0Zyb21Ob3c6IGZ1bmN0aW9uIG1pbnV0ZXNGcm9tTm93IChuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5taW51dGVzRnJvbShuLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIG1vbnRocyBpbiB0aGUgcGFzdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbiBUaGUgbnVtYmVyIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0RhdGV9IEEgRGF0ZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbW9udGhzQWdvOiBmdW5jdGlvbiBtb250aHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIGRheXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGRheXNBZ286IGZ1bmN0aW9uIGRheXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLmRheXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIHNlY29uZHMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHNlY29uZHNBZ286IGZ1bmN0aW9uIHNlY29uZHNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnNlY29uZHNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIG1pbnV0ZXMgaW4gdGhlIHBhc3QuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG4gVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRlfSBBIERhdGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1pbnV0ZXNBZ286IGZ1bmN0aW9uIG1pbnV0ZXNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLm1pbnV0ZXNGcm9tTm93KC1uLCBuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIHRpbWUsIHllYXJzIGluIHRoZSBwYXN0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuIFRoZSBudW1iZXIgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RGF0ZX0gQSBEYXRlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB5ZWFyc0FnbzogZnVuY3Rpb24geWVhcnNBZ28gKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMubnVtYmVyLnllYXJzRnJvbU5vdygtbiwgbmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGEgbnVtYmVyIHRvIHRoZSBISDpNTTpTUy5NU0VDIHRpbWUgZm9ybWF0XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IHQgVGhlIG51bWJlciBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAbWVtYmVyb2YgTnVtYmVyLnByb3RvdHlwZVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbj19IFtvbWl0TVM9ZmFsc2VdIFdoZXRoZXIgb3Igbm90IHRvIGluY2x1ZGUgdGhlIE1TIHBvcnRpb24gb2YgdGhlIHJldHVybmVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBmb3JtYXR0ZWQgbnVtYmVyLCBub3cgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgY2xvY2tUaW1lOiBmdW5jdGlvbiBjbG9ja1RpbWUgKHQsIG9taXRNUykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbXMsIHNlY3MsIG1pbnMsIGhycztcblxuICAgICAgICAgICAgICAgICAgICBtcyA9IHQgJSAxMDAwO1xuICAgICAgICAgICAgICAgICAgICB0ID0gKHQgLSBtcykgLyAxMDAwO1xuXG4gICAgICAgICAgICAgICAgICAgIHNlY3MgPSB0ICUgNjA7XG4gICAgICAgICAgICAgICAgICAgIHQgPSAodCAtIHNlY3MpIC8gNjA7XG5cbiAgICAgICAgICAgICAgICAgICAgbWlucyA9IHQgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgaHJzID0gKHQgLSBtaW5zKSAvIDYwO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm51bWJlci5wYWQoaHJzLnRvU3RyaW5nKCksIDIpICArICc6JyArIGxpYnMubnVtYmVyLnBhZChtaW5zLnRvU3RyaW5nKCksIDIpICsgJzonICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMubnVtYmVyLnBhZChzZWNzLnRvU3RyaW5nKCksIDIpICsgKChvbWl0TVMgPT09IHRydWUpID8gJycgOiAnLicgKyBsaWJzLm51bWJlci5wYWQobXMudG9TdHJpbmcoKSwgMykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRnVuY3Rpb24gbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGZ1bmN0aW9uOiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gICAgICAgICAgICAgICAgICogTW9zdGx5IGJvcnJvd2VkIGRpcmVjdGx5IGZyb20gTm9kZS5qc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yIFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gc3VwZXJDb25zdHJ1Y3RvciBUaGUgcGFyZW50IGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBpbmhlcml0aW5nIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaW5oZXJpdHM6IGZ1bmN0aW9uIGluaGVyaXRzIChjb25zdHJ1Y3Rvciwgc3VwZXJDb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCB8fCBjb25zdHJ1Y3RvciA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgYmUgJyArICdudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBlckNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQgfHwgc3VwZXJDb25zdHJ1Y3RvciA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBzdXBlciBjb25zdHJ1Y3RvciB0byBcImluaGVyaXRzXCIgbXVzdCBub3QgJyArICdiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHN1cGVyIGNvbnN0cnVjdG9yIHRvIFwiaW5oZXJpdHNcIiBtdXN0ICcgKyAnaGF2ZSBhIHByb3RvdHlwZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yLnN1cGVyXyA9IHN1cGVyQ29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihjb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBLaWxsIGFsIHRoZSBQcm90b0xpYiBjYWNoZSwgZm9yIGFsbCBpbnN0YW5jZXMuLi5cbiAgICAgICAgICAgICAgICAgICAgUHJvdG9MaWIua2lsbENhY2hlRm9yQ29uc3RydWN0b3IoY29uc3RydWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFycmF5OiB7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTaHVmZmxlcyBhbiBhcnJheVxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgbWl4ZWQgdXAgYXJyYXlcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBzaHVmZmxlOiBmdW5jdGlvbiBzaHVmZmxlIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IGEubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKSwgdG1wID0gYVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFbaV0gPSBhW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtqXSA9IHRtcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIHVuaW9uIGJldHdlZW4gdGhlIGN1cnJlbnQgYXJyYXksIGFuZCBhbGwgdGhlIGFycmF5IG9iamVjdHMgcGFzc2VkIGluLiBUaGF0IGlzLFxuICAgICAgICAgICAgICAgICAqIHRoZSBzZXQgb2YgdW5pcXVlIG9iamVjdHMgcHJlc2VudCBpbiBhbGwgb2YgdGhlIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLkFycmF5fSBhcnIgQSBsaXN0IG9mIGFycmF5IG9iamVjdHNcbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIHVuaW9uIHNldCBvZiB0aGUgcHJvdmlkZWQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHVuaW9uOiBmdW5jdGlvbiB1bmlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdW5pb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgYXJncy51bnNoaWZ0KGEpO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhcnJheSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1bmlvbi5pbmRleE9mKGl0ZW0pID09PSAtMSkgdW5pb24ucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuaW9uO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIGFsbCB0aGUgaXRlbXMgdW5pcXVlIHRvIGEgc2luZ2xlIGFycmF5ICh0aGUgc2V0IGRpZmZlcmVuY2UpLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGFycmF5cyBUaGUgQXJyYXkgb2JqZWN0cyB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IG90aGVyIFRoZSBhcnJheSB0byBjb21wdXRlIHRoZSBkaWZmZXJlbmNlIGZyb20uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgdW5pcXVlIHRvIGVhY2ggYXJyYXkuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZTogZnVuY3Rpb24gZGlmZmVyZW5jZSAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnJheXMgICA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgICAgID0gW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxJdGVtcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IoaSA9IDA7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIGFsbEl0ZW1zID0gYWxsSXRlbXMuY29uY2F0KGFycmF5c1tpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgYWxsSXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbkFycmF5ID0gLTEsIHVuaXF1ZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwgYXJyYXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5BcnJheSA9PT0gLTEgJiYgYXJyYXlzW25dLmluZGV4T2YoYWxsSXRlbXNbaV0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5BcnJheSA9IG47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZSAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGluQXJyYXkgIT09IC0xICYmIGFycmF5c1tuXS5pbmRleE9mKGFsbEl0ZW1zW2ldKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluQXJyYXkgPSBuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUgID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5BcnJheSAhPT0gLTEgJiYgdW5pcXVlKSBkaWZmLnB1c2goYWxsSXRlbXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpZmY7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGl0ZW1zIGNvbW1vbiB0byBhbGwgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uQXJyYXl9IGl0ZW1zIFRoZSBhcnJheXMgZnJvbSB3aGljaCB0byBjb21wdXRlIHRoZSBpbnRlcnNlY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXl9IEEgbmV3IGFycmF5IHdpdGggaXRlbXMgY29tbW9uIHRvIGJvdGggYXJyYXlzLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGludGVyc2VjdDogZnVuY3Rpb24gaW50ZXJzZWN0ICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFycmF5cyA9IGxpYnMub2JqZWN0Lm9ubHkobGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpLCAnYXJyYXknKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihhcnJheXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgICAgIGlmKGFycmF5cy5sZW5ndGggPT09IDEpIHJldHVybiBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1swXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVyc2VjdGlvbiA9IGFycmF5c1swXSwgaW50ZXJtZWRpYXRlID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDE7IGkgPCBhcnJheXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBsaWJzLm9iamVjdC5jb3B5KGFycmF5c1tpXSk7IC8vIERvbid0IHdhbnQgdG8gbW9kaWZ5IHRoZSBvcmlnaW5hbCBhcnJheSFcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBpbnRlcnNlY3Rpb24ubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihhcnIuaW5kZXhPZihpbnRlcnNlY3Rpb25bbl0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlLnB1c2goaW50ZXJzZWN0aW9uW25dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IGFyci5pbmRleE9mKGludGVyc2VjdGlvbltuXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyci5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBpbnRlcm1lZGlhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgYXJyYXkgZnJvbSB0aGUgY3VycmVudCBvbmUsIHdpdGggYWxsIG9jY3VyZW5jZXMgb2YgdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLjxicj5cbiAgICAgICAgICAgICAgICAgKiBGb3IgZXhhbXBsZTogPGVtPlsxLDIsMyw0LDVdLndpdGhvdXQoMSk8L2VtPiB3aWxsIHJldHVybiA8ZW0+WzIsMyw0LDVdPC9lbT5cbiAgICAgICAgICAgICAgICAgKiBhbmQgPGVtPlsxLCBudWxsLCAyLCBudWxsLCB1bmRlZmluZWRdLndpdGhvdXQobnVsbCwgdW5kZWZpbmVkKTwvZW0+IHdpbGwgcmV0dXJuIDxlbT5bMSwgMl08L2VtPlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheTwqPn0gQSBzaGFsbG93IGNvcHkgb2YgdGhlIGFycmF5IHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50cyBvbW1pdGVkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHdpdGhvdXQ6IGZ1bmN0aW9uIHdpdGhvdXQgKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGxpYnMub2JqZWN0LnRvQXJyYXkoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGEgICAgPSBhcmdzLnNoaWZ0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMgID0gW107XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChhLCBmdW5jdGlvbiAodikgeyBpZihhcmdzLmluZGV4T2YodikgPT09IC0xKSByZXMucHVzaCh2KTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgb3IgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuIElmIHRoZSBkaXJlY3Rpb24gaXMgbGVmdCwgaXQgd2lsbCBzaGlmdCBvZmYgdGhlXG4gICAgICAgICAgICAgICAgICogZmlyc3QgPGVtPm48L2VtPiBlbGVtZW50cyBhbmQgcHVzaCB0aGVtIHRvIHRoZSBlbmQgb2YgdGhlIGFycmF5LiBJZiByaWdodCwgaXQgd2lsbCBwb3Agb2ZmIHRoZSBsYXN0IDxlbT5uPC9lbT5cbiAgICAgICAgICAgICAgICAgKiBpdGVtcyBhbmQgdW5zaGlmdCB0aGVtIG9udG8gdGhlIGZyb250IG9mIHRoZSBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZz19IFtkaXJlY3Rpb249J2xlZnQnXSBUaGUgZGlyZWN0aW9uIHRvIHJvdGF0ZSBhcnJheSBtZW1iZXJzLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHNoaWZ0XG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCBzaGlmdGVkLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJvdGF0ZTogZnVuY3Rpb24gcm90YXRlIChhLCBkaXJlY3Rpb24sIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICBpZihkaXJlY3Rpb24gJiYgbGlicy5vYmplY3QuaXNOdW1lcmljKGRpcmVjdGlvbikgJiYgIWFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW1vdW50ICAgID0gZGlyZWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWFtb3VudCB8fCAoYW1vdW50ICYmICFsaWJzLm9iamVjdC5pc051bWVyaWMoYW1vdW50KSkpIGFtb3VudCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhbW91bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICE9PSAncmlnaHQnKSBhLnB1c2goYS5zaGlmdCgpKTsgZWxzZSBhLnVuc2hpZnQoYS5wb3AoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJvdGF0ZXMgdGhlIGFycmF5IGxlZnQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByb3RhdGVMZWZ0OiBmdW5jdGlvbiByb3RhdGVMZWZ0IChhLCBhbW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMuYXJyYXkucm90YXRlKGEsICdsZWZ0JywgYW1vdW50KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUm90YXRlcyB0aGUgYXJyYXkgcmlnaHQgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGltZXMuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyB1c2VmdWwgaWYgdHJ5aW5nIHRvIGNyZWF0ZSBhIGNpcmN1bGFyIHF1ZXVlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGEgVGhlIEFycmF5IG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW2Ftb3VudD0xXSBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJvdGF0ZSB0aGUgYXJyYXkgbGVmdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIGN1cnJlbnQgYXJyYXksIHJvdGF0ZWQgcmlnaHQuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcm90YXRlUmlnaHQ6IGZ1bmN0aW9uIHJvdGF0ZUxlZnQgKGEsIGFtb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5hcnJheS5yb3RhdGUoYSwgJ3JpZ2h0JywgYW1vdW50KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmVtb3ZlcyBkdXBsaWNhdGVzIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8Kj59IFRoZSBjdXJyZW50IGFycmF5LCB3aXRoIGR1cGxpY2F0ZXMgcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBtYWtlVW5pcXVlOiBmdW5jdGlvbiBtYWtlVW5pcXVlIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZpc2l0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihhW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goYVtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpLS07IC8vIFNwbGljZSB3aWxsIGFmZmVjdCB0aGUgaW50ZXJuYWwgYXJyYXkgcG9pbnRlciwgc28gZml4IGl0Li4uXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEdldHMgYW4gYXJyYXkgb2YgdW5pcXVlIGl0ZW1zIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSB3aXRoIG5vIGR1cGxpY2F0ZSB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdW5pcXVlOiBmdW5jdGlvbiB1bmlxdWUgKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIShhIGluc3RhbmNlb2YgQXJyYXkpKSByZXR1cm4gYTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmlzaXRlZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcXVlICA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goYSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZpc2l0ZWQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5pcXVlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTb3J0cyB0aGUgYXJyYXkgaW4gYXNjZW5kaW5nIG9yZGVyLlxuICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgYSBkZXN0cnVjdGl2ZSBhY3Rpb24sIGFuZCB3aWxsIG1vZGlmeSB0aGUgYXJyYXkgaW4gcGxhY2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gYSBUaGUgQXJyYXkgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5fSBUaGUgYXJyYXkgc29ydGVkIGluIGFzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhc2NlbmRpbmc6IGZ1bmN0aW9uIGFzY2VuZGluZyAoYSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKGEgaW5zdGFuY2VvZiBBcnJheSkpIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhICE9PSB1bmRlZmluZWQgJiYgYSAhPT0gbnVsbCkgYSA9IGEudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGIgIT09IHVuZGVmaW5lZCAmJiBiICE9PSBudWxsKSBiID0gYi50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogU29ydHMgdGhlIGFycmF5IGluIGRlc2NlbmRpbmcgb3JkZXIuXG4gICAgICAgICAgICAgICAgICogVGhpcyBpcyBhIGRlc3RydWN0aXZlIGFjdGlvbiwgYW5kIHdpbGwgbW9kaWZ5IHRoZSBhcnJheSBpbiBwbGFjZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBhIFRoZSBBcnJheSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBhcnJheSBzb3J0ZWQgaW4gZGVzY2VuZGluZyBvcmRlci5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBkZXNjZW5kaW5nOiBmdW5jdGlvbiBkZXNjZW5kaW5nIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoYSBpbnN0YW5jZW9mIEFycmF5KSkgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGEgIT09IHVuZGVmaW5lZCAmJiBhICE9PSBudWxsKSBhID0gYS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYiAhPT0gdW5kZWZpbmVkICYmIGIgIT09IG51bGwpIGIgPSBiLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPCBiID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQXJyYXkgbGlicmFyeSBmdW5jdGlvbnNcbiAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9iamVjdDoge1xuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogR2V0cyB0aGUgdW5pcXVlIGlkIG9mIGFuIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBPbmx5IHdvcmtzIGZvciBub24tbGl0ZXJhbHMsIG90aGVyaXNlIE9iamVjdC5fX2dldF9wcm90b2xpYl9pZF9fIHdpbGwgdGhyb3cuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R8RnVuY3Rpb259IG8gVGhlIG9iamVjdCB0byBnZXQgdGhlIHVuaXF1ZSBpZCBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBBIHVuaXF1ZSBvYmplY3QgaWRcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB1bmlxdWVJZDogZnVuY3Rpb24gdW5pcXVlSWQgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8uX19nZXRfcHJvdG9saWJfaWRfXztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQ29tcHV0ZXMgdGhlIGZyZXF1ZW5jaWVzIGZvciBlYWNoIGl0ZW0gaW4gYWxsIG9mIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLip9IG9ianMgVGhlIG9iamVjdHMgdG8gY29tcHV0ZSB0aGUgaGlzdG9ncmFtIGZyb20uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0PE51bWJlcj59IEFuIG9iamVjdCB0aGF0IGhhcyB0aGUgaXRlbXMgZnJvbSBhbGwgb2YgdGhlIGFyZ3VtZW50cyBhcyBpdHMga2V5cyBhbmQgdGhlaXIgZnJlcXVlbmNpZXMgYXMgaXQncyB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaGlzdG9ncmFtOiBmdW5jdGlvbiBoaXN0b2dyYW0gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaGlzdG9ncmFtID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighaGlzdG9ncmFtW29dKSBoaXN0b2dyYW1bb10gPSAxOyBlbHNlIGhpc3RvZ3JhbVtvXSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFoaXN0b2dyYW1bJ2Z1bmN0aW9uJ10pIGhpc3RvZ3JhbVsnZnVuY3Rpb24nXSA9IDE7IGVsc2UgaGlzdG9ncmFtW29dKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCh0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHR5cGVvZiB2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCA9PT0gbnVsbDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAnbnVsbCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmIHZhbCBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdhcnJheSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoaXN0b2dyYW1bdmFsXSAhPT0gJ251bWJlcicpIGhpc3RvZ3JhbVt2YWxdID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlzdG9ncmFtW3ZhbF0rKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoaXN0b2dyYW07XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENyZWF0ZXMgYSBzaGFsbG93IGNvcHkgb2YgJ2l0ZW0nLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gaXRlbSBUaGUgaXRlbSB0byBzaGFsbG93IFwiY29weVwiLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IEEgc2hhbGxvdyBjb3B5IG9mIHRoZSBpdGVtLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGNvcHk6IGZ1bmN0aW9uIGNvcHkgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvcHk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFpdGVtKSByZXR1cm4gaXRlbTtcblxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGVvZiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvcHkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShpdGVtLCBmdW5jdGlvbiAobywgaykgeyBjb3B5W2tdID0gbzsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBudW1iZXIgb2Ygb2NjdXJlbmNlcyBvZiBcIndoYXRcIlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gb2JqIFRoZSBpdGVtIHRvIGNvdW50IHRoZSBvY2N1cmVuY2VzIG9mIFwid2hhdFwiIGluLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gd2hhdCBUaGUgaXRlbSB0byBjb3VudCB0aGUgb2NjdXJlbmNlcyBvZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgb2NjdXJyZW5jZXNPZjogZnVuY3Rpb24gb2NjdXJyZW5jZXNPZiAob2JqLCB3aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPCAyKSByZXR1cm4gMDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihvYmoudG9TdHJpbmcoKSwgd2hhdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2NjdXJyZW5jZXNPZihmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcob2JqLnRvU3RyaW5nKCkpLCB3aGF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygd2hhdCA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHdoYXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4cCA9IG5ldyBSZWdFeHAod2hhdC50b1N0cmluZygpLCAnZycpLCBtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKG0gPSByZWdleHAuZXhlYyhvYmopKSBjb3VudCsrOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvYmogIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5ldmVyeShvYmosIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXRlbSA9PT0gd2hhdCkgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyB0aGUgb2JqZWN0J3Mga2V5cy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0FycmF5PFN0cmluZ3xOdW1iZXI+fSBUaGUgb2JqZWN0J3Mga2V5IHNldFxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGtleXMgOiBmdW5jdGlvbiBrZXlzIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IHVuZGVmaW5lZCB8fCBvID09PSBudWxsKSByZXR1cm4gW107XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleXMgPSBnZXRLZXlzKG8pLCBpZHg7XG4gICAgICAgICAgICAgICAgICAgIGlmKGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaWR4ID4gLTEpIGtleXMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlICdzaXplJyBvciAnbGVuZ3RoJyBvZiBhbiBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBTdHJpbmcgICAtPiBUaGUgc3RyaW5nJ3MgbGVuZ3RoICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBOdW1iZXIgICAtPiBUaGUgbnVtYmVyIG9mIGRpZ2l0cyA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBPYmplY3QgICAtPiBUaGUgbnVtYmVyIG9mIGtleXMgICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBBcnJheSAgICAtPiBUaGUgbnVtYmVyIG9mIGl0ZW1zICA8L2xpPlxuICAgICAgICAgICAgICAgICAqICAgICAgPGxpPiBGdW5jdGlvbiAtPiAxICAgICAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1iZXIgb2YgaXRlbXMgd2l0aGluIHRoZSBvYmplY3QuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgc2l6ZTogZnVuY3Rpb24gc2l6ZSAobykge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8udG9TdHJpbmcoKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbyBpbnN0YW5jZW9mIEFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0eXBlb2YgbyA9PT0gJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pICYmIHR5cGVvZiBvLmxlbmd0aCAhPT0gJ3VuZGVmaW5lZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8ubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMobykubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIERldGVybWluZXMgaWYgYW4gb2JqZWN0IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgbnVtZXJpYywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzTnVtZXJpYzogZnVuY3Rpb24gaXNOdW1lcmljICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAhaXNOYU4ocGFyc2VGbG9hdChpdGVtKSkgJiYgaXNGaW5pdGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJ0cyBhbiBvYmplY3QgdG8gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZ2V0TnVtZXJpYzogZnVuY3Rpb24gZ2V0TnVtZXJpYyAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHMucHVzaChsaWJzLm9iamVjdC5pc051bWVyaWMobykgPyBwYXJzZUZsb2F0KG8pIDogTmFOKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWxzLmxlbmd0aCA9PT0gMSA/IHZhbHNbMF0gOiB2YWxzO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIGFuIG9iamVjdCBoYXMgbm8ga2V5cywgaWYgYW4gYXJyYXkgaGFzIG5vIGl0ZW1zLCBvciBpZiBhIHN0cmluZyA9PT0gJycuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgJ2VtcHR5JywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzRW1wdHk6IGZ1bmN0aW9uIGlzRW1wdHkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LnNpemUoaXRlbSkgPT09IDAgJiYgaXRlbSAhPT0gZmFsc2UgJiYgaXRlbSAhPT0gJycgJiYgaXRlbSAhPT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYXJyYXlzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uIGlzQXJyYXkgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBBcnJheTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgb2JqZWN0cyBhbmQgbm90IGFycmF5cywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gb2JqZWN0IGFuZCBub3QgYW4gYXJyYXksIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc1B1cmVPYmplY3Q6IGZ1bmN0aW9uIGlzUHVyZU9iamVjdCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIShpdGVtIGluc3RhbmNlb2YgQXJyYXkpICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgc3RyaW5ncywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7Li4uT2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBzdHJpbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc1N0cmluZzogZnVuY3Rpb24gaXNTdHJpbmcgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgYm9vbGVhbnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgYm9vbGVhbiwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGlzQm9vbGVhbjogZnVuY3Rpb24gaXNCb29sZWFuICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVHJ1ZSBpZiB0aGUgb2JqZWN0cyBwYXNzZWQgaW4gYXJlIGFsbGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gaXNGdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGl0ZW0gPT09ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsbGwsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0gey4uLk9iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc051bGw6IGZ1bmN0aW9uIGlzTnVsbCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmd1bWVudHMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSA9PT0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFRydWUgaWYgdGhlIG9iamVjdHMgcGFzc2VkIGluIGFyZSBhbGwgdW5kZWZpbmVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uIGlzVW5kZWZpbmVkICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUcnVlIGlmIHRoZSBvYmplY3RzIHBhc3NlZCBpbiBhcmUgYWxsIGFyZ3VtZW50cyBvYmplY3RzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcmd1bWVudHMgb2JqZWN0LCBmYWxzZSBvdGhlcndpc2VcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpc0FyZ3VtZW50czogZnVuY3Rpb24gaXNBcmd1bWVudHMgKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpdGVtKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBDb252ZXJzIGFuIG9iamVjdCB0byBhIG51bWJlciwgaWYgcG9zc2libGUuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5PYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBvYmplY3QgYXMgYSBmbG9hdCBvciBOYU4uXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdG9OdW1iZXI6IGZ1bmN0aW9uIHRvTnVtYmVyICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZXZlcnkoYXJndW1lbnRzLCBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlRmxvYXQobykgOiBOYU4pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHMubGVuZ3RoID09PSAxID8gdmFsc1swXSA6IHZhbHM7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnMgYW4gb2JqZWN0IHRvIGFuIGludGVnZXIsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgb2JqZWN0IGFzIGFuIGludGVnZXIgb3IgTmFOLlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRvSW50OiBmdW5jdGlvbiB0b0ludCAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmV2ZXJ5KGFyZ3VtZW50cywgZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYWRpeCA9IC9eMHgvLnRlc3QobykgPyAxNiA6IDEwOyAvLyBDaGVjayBmb3IgaGV4IHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKGxpYnMub2JqZWN0LmlzTnVtZXJpYyhvKSA/IHBhcnNlSW50KG8sIHJhZGl4KSA6IE5hTik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFscy5sZW5ndGggPT09IDEgPyB2YWxzWzBdIDogdmFscztcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogUmV0dXJucyBhIHJhbmRvbSBhcnJheSBpdGVtLCByYW5kb20gb2JqZWN0IHByb3BlcnR5LCByYW5kb20gY2hhcmFjdGVyIGluIGEgc3RyaW5nLCBvciByYW5kb20gZGlnaXQgaW4gYSBudW1iZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gcmFuZG9tIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG8gaW5zdGFuY2VvZiBBcnJheSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBvLmxlbmd0aCldIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvW09iamVjdC5rZXlzKG8pW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKG8pLmxlbmd0aCldXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBvLCBuZWdhdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihvLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInICYmIG8gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVnYXRpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguYWJzKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHZhbC50b1N0cmluZygpW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHZhbC50b1N0cmluZygpLmxlbmd0aCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSB2YWwgPSBwYXJzZUludCh2YWwsIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZWdhdGl2ZSA/IC12YWwgOiB2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZWFjaCBwcm9wZXJ0eSB0aGUgb2JqZWN0IGNvbnRhaW5zLiBJZiB0aGlzIGlzIGNhbGxlZFxuICAgICAgICAgICAgICAgICAqIG9uIGEgbnVtYmVyIG9yIGZ1bmN0aW9uLCB0aGUgb2JqZWN0IHdpbGwgYmUgY2FzdCB0byBhIHN0cmluZy48YnI+PGJyPlxuICAgICAgICAgICAgICAgICAqIFRoZSBjYWxsYmFjayBgZmAgd2lsbCBiZSBpbnZva2VkIHdpdGggdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAgICAgICAgICAgICAgICogPHVsPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPnZhbHVlICAgICAtIFRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBvYmplY3QgYmVpbmcgaXRlcmF0ZWQgb3ZlcjwvbGk+XG4gICAgICAgICAgICAgICAgICogXHQ8bGk+a2V5ICAgICAgIC0gVGhlIGtleSBvZiB0aGUgY3VycmVudCBvYmplY3QgKGlmIGFuIG9iamVjdCwgdGhlIGluZGV4IGlmIGFuIGFycmF5KTwvbGk+XG4gICAgICAgICAgICAgICAgICogXHQ8bGk+aXRlcmF0aW9uIC0gVGhlIGN1cnJlbnQgaXRlcmF0aW9uIChzYW1lIGFzIGtleSBpZiBhIHN0cmluZyBvciBhcnJheSk8L2xpPlxuICAgICAgICAgICAgICAgICAqIFx0PGxpPmV4aXQgICAgICAtIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBicmVhayB0aGUgbG9vcCBhbmQgcmV0dXJuIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIGl0LFxuICAgICAgICAgICAgICAgICAqIFx0XHRcdFx0XHRvciBhIHNpbmdsZSB2YWx1ZSBpZiBvbmx5IGEgc2luZ2xlIHZhbHVlIGlzIHBhc3NlZC48L2xpPlxuICAgICAgICAgICAgICAgICAqIDwvdWw+XG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyPX0gW3JhbmdlQT0wXSBUaGUgaXRlcmF0aW9uIHN0YXJ0IGluZGV4XG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbcmFuZ2VCPSdsZW5ndGggb2YgdGhlIGl0ZW0nXSBUaGUgaXRlcmF0aW9uIGVuZCBpbmRleFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMgeyp9IFRoZSB2YWx1ZSBwYXNzZWQgdG8gdGhlIGV4aXQgcGFyYW1ldGVyIG9mIHRoZSBjYWxsYmFjay4uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIGVhY2ggKG8sIHJhbmdlQSwgcmFuZ2VCLCBmKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FuJ3QgdXNlIGxhc3QgaGVyZS4uIHdvdWxkIGNhdXNlIGNpcmN1bGFyIHJlZi4uLlxuICAgICAgICAgICAgICAgICAgICBmID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgayA+PSAwOyBrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50c1trXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZiA9IGFyZ3VtZW50c1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgICAgPSBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJva2VuID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmICAgPSBvLFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5cywgcHJvcGVydHksIHZhbHVlLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBleGl0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlbiAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgICAgICA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gbGlicy5vYmplY3QudG9BcnJheShhcmd1bWVudHMpIDogYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBpZihmIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykgc2VsZiA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzZWxmKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZUEgPSBwYXJzZUludChyYW5nZUEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VBID0gKGlzTmFOKHJhbmdlQSkgfHwgIWlzRmluaXRlKHJhbmdlQSkpID8gMCA6IHJhbmdlQTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VCID0gcGFyc2VJbnQocmFuZ2VCKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlQiA9IChpc05hTihyYW5nZUIpIHx8ICFpc0Zpbml0ZShyYW5nZUIpKSA/IGtleXMubGVuZ3RoIDogcmFuZ2VCO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IDAsIG47XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyhyYW5nZUEpID4gTWF0aC5hYnMocmFuZ2VCKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJhbmdlQiA8IDApIHJhbmdlQiA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VBIDwgMCkgcmFuZ2VBID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPiBrZXlzLmxlbmd0aCAtIDEpIHJhbmdlQSA9IGtleXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihuID0gcmFuZ2VBOyBuID49IHJhbmdlQjsgbi0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZi5jYWxsKG8sIHZhbHVlLCBwcm9wZXJ0eSwgbiwgZXhpdCwgaSsrLCBvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYnJva2VuKSBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZUIgPSByYW5nZUIgKyAxID4ga2V5cy5sZW5ndGggPyBrZXlzLmxlbmd0aCA6IHJhbmdlQiArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYocmFuZ2VCIDwgMCkgcmFuZ2VCID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyYW5nZUEgPCAwKSByYW5nZUEgPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKG4gPSByYW5nZUE7IG4gPCByYW5nZUI7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICAgID0gKHR5cGVvZiBvID09PSAnbnVtYmVyJyAmJiAhaXNOYU4ocGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkpKSA/IHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pIDogc2VsZltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGYuY2FsbChvLCB2YWx1ZSwgcHJvcGVydHksIG4sIGV4aXQsIGkrKywgbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGJyb2tlbikgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEludm9rZXMgdGhlIGNhbGxiYWNrICdmJyBmb3IgZXZlcnkgcHJvcGVydHkgdGhlIG9iamVjdCBjb250YWlucy4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnMgZmFsc2UsIHRoZVxuICAgICAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZXZlcnk6IGZ1bmN0aW9uIGV2ZXJ5IChvLCBmKSB7XG4gICAgICAgICAgICAgICAgICAgIGYgPSBmIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBmIDogdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGYgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGYgPSBvLCBrZXlzLCBwcm9wZXJ0eSwgdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2Ygc2VsZiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHNlbGYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHNlbGYgPT09ICdib29sZWFuJykgc2VsZiA9IG8udG9TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZWZveCBkb2VzIHNvbWUgZnVua3kgc3R1ZmYgaGVyZS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdmdW5jdGlvbicpIHNlbGYgPSBmaXhGaXJlZm94RnVuY3Rpb25TdHJpbmcoc2VsZik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBTYWZhcmkuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0FyZ3MgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMgPSBnZXRLZXlzKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4ICA9IGtleXMuaW5kZXhPZignbGVuZ3RoJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJncyAmJiBpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGtleXNbbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgICAgPSAodHlwZW9mIG8gPT09ICdudW1iZXInICYmICFpc05hTihwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSkpID8gcGFyc2VGbG9hdChzZWxmW3Byb3BlcnR5XSkgOiBzZWxmW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBJbnZva2VzIHRoZSBjYWxsYmFjayAnZicgZm9yIGV2ZXJ5IHByb3BlcnR5IHRoZSBvYmplY3QgY29udGFpbnMuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zIHRydWUsIHRoZVxuICAgICAgICAgICAgICAgICAqIGxvb3AgaXMgYnJva2VuIGFuZCBmYWxzZSBpcyByZXR1cm5lZDsgb3RoZXJ3aXNlIHRydWUgaXMgcmV0dXJuZWQuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGYgVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtIHdpdGhpbiB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgbm9uZSBvZiB0aGUgY2FsbGJhY2sgaW52b2NhdGlvbnMgcmV0dXJuZWQgZmFsc2UuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgYW55OiBmdW5jdGlvbiBhbnkgKG8sIGYpIHtcbiAgICAgICAgICAgICAgICAgICAgZiA9IGYgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGYgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoZiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IG8sIGtleXMsIHByb3BlcnR5LCB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBzZWxmID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygc2VsZiA9PT0gJ2Jvb2xlYW4nKSBzZWxmID0gby50b1N0cmluZygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlZm94IGRvZXMgc29tZSBmdW5reSBzdHVmZiBoZXJlLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykgc2VsZiA9IGZpeEZpcmVmb3hGdW5jdGlvblN0cmluZyhzZWxmKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIFNhZmFyaS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJncyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXScsIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHggID0ga2V5cy5pbmRleE9mKCdsZW5ndGgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcmdzICYmIGlkeCA+IC0xKSBrZXlzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIG4gPSAwOyBuIDwga2V5cy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0ga2V5c1tuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSAgICA9ICh0eXBlb2YgbyA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHBhcnNlRmxvYXQoc2VsZltwcm9wZXJ0eV0pKSkgPyBwYXJzZUZsb2F0KHNlbGZbcHJvcGVydHldKSA6IHNlbGZbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBmLmNhbGwobywgdmFsdWUsIHByb3BlcnR5LCBuLCBpKyssIG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJldCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIENvbnZlcnRzIGFuIG9iamVjdCB0byBhbiBhcnJheS4gRm9yIHN0cmluZ3MsIG51bWJlcnMsIGFuZCBmdW5jdGlvbnMgdGhpcyB3aWxsXG4gICAgICAgICAgICAgICAgICogcmV0dXJuIGEgY2hhciBhcnJheSB0byB0aGVpciByZXNwZWN0aXZlIC50b1N0cmluZygpIHZhbHVlc1xuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtBcnJheTwqPn0gVGhlIG9iamVjdCwgY29udmVydGVkIHRvIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIHRvQXJyYXkgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobyBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gbGlicy5vYmplY3QuY29weShvKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uICh2YWwpIHsgYXJyLnB1c2godmFsKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIGZpcnN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICAgICAqIHRoYXQgaXRlbSB3aWxsIGJlIHJldHVybmVkLCByYXRoZXIgdGhhbiBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtOdW1iZXI9fSBbbj0xXSBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJldHVyblxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0FycmF5PCo+fSBUaGUgZmlyc3QgbiBlbGVtZW50cyBvZiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIGZpcnN0IChvLCBuKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBwYXJzZUludChuLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIG4gPSBpc05hTihuKSB8fCAhaXNGaW5pdGUobikgPyAxIDogbjtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHYgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuICE9PSAwKSB2ID0gby50b1N0cmluZygpLnNsaWNlKDAsIG4pOyBlbHNlIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYobyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihuID09PSAxKSByZXR1cm4gb1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuICE9PSAwID8gby5zbGljZSgwLCBuKSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAwLCBuIC0gMSwgZnVuY3Rpb24gKGl0ZW0sIGtleSkgeyB2W2tleV0gPSBpdGVtOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXlzID0gZ2V0S2V5cyh2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXlzLmxlbmd0aCA9PT0gMSA/IHZba2V5c1swXV0gOiB2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMSA/IHZbMF0gOiB2O1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBsYXN0IG4gZWxlbWVudHMgb2YgYW4gb2JqZWN0LiBJZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LCBhbmQgb25seSBvbmUgaXRlbXMgaXMgcmV0cmlldmVkLFxuICAgICAgICAgICAgICAgICAqIHRoYXQgaXRlbSB3aWxsIGJlIHJldHVybmVkIHJhdGhlciB0aGFuIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcj19IFtuPTFdIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmV0dXJuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IFRoZSBsYXN0IG4gZWxlbWVudHMgb2YgdGhlIGFycmF5LlxuICAgICAgICAgICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGxhc3Q6IGZ1bmN0aW9uIGxhc3QgKG8sIG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgcmV0dXJuIG87XG5cbiAgICAgICAgICAgICAgICAgICAgbiA9IHBhcnNlSW50KG4sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgbiA9IGlzTmFOKG4pIHx8ICFpc0Zpbml0ZShuKSA/IDEgOiBuO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdiA9IG51bGwsIGtleXMsIGxlbiA9IGxpYnMub2JqZWN0LnNpemUobyksIGlkeDtcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGxpYnMub2JqZWN0LmlzQXJndW1lbnRzKG8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeCAgPSBrZXlzLmluZGV4T2YoJ2xlbmd0aCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpZHggPiAtMSkga2V5cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSBbXTsgbGVuID0ga2V5cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBcmd1bWVudHMgb2JqZWN0IHNob3VsZCBpZ25vcmUgdW5kZWZpbmVkIG1lbWJlcnMuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2goa2V5cywgMCwgbGVuLCBmdW5jdGlvbiAoaykgeyBpZihvW2tdICE9PSB1bmRlZmluZWQpIHYudW5zaGlmdChvW2tdKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ID0gdi5zbGljZSgwLCBuKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobiAhPT0gMCkgdiA9IG8udG9TdHJpbmcoKS5zbGljZSgtbik7IGVsc2UgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihvIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gPT09IDEpIHJldHVybiBvW28ubGVuZ3RoIC0xXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuICE9PSAwID8gby5zbGljZSgtbikgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHYgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG4gPCAwKSBuID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgbGVuIC0gbiwgbGVuLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7IHZba2V5XSA9IGl0ZW07IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXModik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IDEgPyB2W2tleXNbMF1dIDogdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdi5sZW5ndGggPT09IDEgPyB2WzBdIDogdi5sZW5ndGggPiAwID8gdiA6IG51bGw7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIElmIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIG9iamVjdCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIHJldHVybmVkLiBPdGhlcndpc2UsIGFuIFwiZW1wdHlcIiBmdW5jdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuICAgICAgICAgICAgICAgICAqIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhIGNhbGxiYWNrIGNhbiBhbHdheXMgYmUgaW52b2tlZCwgd2l0aG91dCBjaGVja2luZyBpZiB0aGUgYXJndW1lbnQgaXMgYSBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAqIG92ZXIgYW5kIG92ZXIuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBnZXQgdGhlIGNhbGxiYWNrIGZvci5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gSWYgdGhlIGxhc3QgaXRlbSBpbiB0aGUgb2JqZWN0IGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgcmV0dXJuZWQuIE90aGVyd2lzZSwgYW4gXCJlbXB0eVwiIGZ1bmN0aW9uIHdpbGwgYmUgcmV0dXJuZWQuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZ2V0Q2FsbGJhY2s6IGZ1bmN0aW9uIGdldENhbGxiYWNrIChvKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXN0ID0gbGlicy5vYmplY3QubGFzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhc3QgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IGxhc3QgOiBOVUxMX0ZVTkNUSU9OO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaW5kIGEgY2hpbGQgb2YgYW4gb2JqZWN0IHVzaW5nIHRoZSBnaXZlbiBwYXRoLCBzcGxpdCBieSB0aGUgZ2l2ZW4gZGVsaW1pdGVyIChvciAnLicgYnkgZGVmYXVsdClcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gdGhlIGNoaWxkIG9iamVjdFxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nPX0gW2RlbGltaXRlcj0nLiddIFRoZSBwYXRoIGRlbGltaXRlclxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb249fSBkb25lIEEgY2FsbGJhY2sgZm9yIGNvbXBsZXRpb25cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfE51bGx9IFRoZSBjaGlsZCBvYmplY3QgYXQgdGhlIGdpdmVuIHN0cmluZyBwYXRoLCBvciBudWxsIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgICAgICAgICAgICAgICogQGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgZmluZENoaWxkQXRQYXRoOiBmdW5jdGlvbiBmaW5kQ2hpbGRBdFBhdGggKG8sIHBhdGgsIGRlbGltaXRlciwgb3JpZ2luYWwsIGludm9rZWQsIGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IGxpYnMub2JqZWN0LmdldENhbGxiYWNrKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxmID0gbztcblxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbCA9ICghKG9yaWdpbmFsIGluc3RhbmNlb2YgRnVuY3Rpb24pICYmIG9yaWdpbmFsKSA/IG9yaWdpbmFsIDogc2VsZjtcbiAgICAgICAgICAgICAgICAgICAgaW52b2tlZCAgPSBpbnZva2VkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9IHR5cGVvZiBkZWxpbWl0ZXIgPT09ICdzdHJpbmcnID8gZGVsaW1pdGVyIDogJy4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCAgICAgID0gcGF0aC5zcGxpdChkZWxpbWl0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcCA9IHBhdGguc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAobywgaywgaSwgZXhpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMCAmJiBrID09PSBwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb25lLmNhbGwob3JpZ2luYWwsIG8sIHNlbGYsIGspO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52b2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGl0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IGxpYnMub2JqZWN0LmZpbmRDaGlsZEF0UGF0aChvLCBwYXRoLmpvaW4oZGVsaW1pdGVyKSwgZGVsaW1pdGVyLCBvcmlnaW5hbCwgaW52b2tlZCwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihvYmogIT09IG51bGwpIGV4aXQob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKCFpbnZva2VkICYmIG9yaWdpbmFsID09PSBzZWxmICYmIGRvbmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgZG9uZS5jYWxsKG9yaWdpbmFsLCBudWxsLCBzZWxmLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFByb2R1Y2VzIGEgc2hhbGxvdyBjbG9uZSBvZiB0aGUgb2JqZWN0LCB0aGF0IGlzLCBpZiBKU09OLnN0cmluZ2lmeSBjYW4gaGFuZGxlIGl0Ljxicj5cbiAgICAgICAgICAgICAgICAgKiBUaGUgb2JqZWN0IG11c3QgYmUgbm9uLWNpcmN1bGFyLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBBIHNoYWxsb3cgY2xvbmUgb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gY2xvbmUgKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvID09PSAnbnVtYmVyJykgcmV0dXJuIG87XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG8pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gY2xvbmUgb2JqZWN0OiAnICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIGFycmF5IG9yIG9iamVjdCB1c2luZyBvbmx5IHRoZSB0eXBlcyBhbGxvd2VkLiBUaGF0IGlzLCBpZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkgaXMgb2YgYSB0eXBlIGxpc3RlZFxuICAgICAgICAgICAgICAgICAqIGluIHRoZSBhcmd1bWVudHMsIHRoZW4gaXQgd2lsbCBiZSBhZGRlZCB0byB0aGUgZmlsdGVyZWQgYXJyYXkuIEluIHRoaXMgY2FzZSAnYXJyYXknIGlzIGEgdmFsaWQgdHlwZS5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHsuLi5TdHJpbmd9IHR5cGVzIEEgbGlzdCBvZiB0eXBlb2YgdHlwZXMgdGhhdCBhcmUgYWxsb3dlZCBpbiB0aGUgYXJyYXkuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7QXJyYXk8Kj59IEFuIGFycmF5IGZpbHRlcmVkIGJ5IG9ubHkgdGhlIGFsbG93ZWQgdHlwZXMuXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgb25seTogZnVuY3Rpb24gb25seSAobywgdHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZXMgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVzLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3dzIHRoZSAncGx1cmFsJyBmb3JtIG9mIHRoZSB0eXBlLi4uXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2godHlwZXMsIGZ1bmN0aW9uICh0eXBlLCBrZXkpIHsgdGhpc1trZXldID0gdHlwZS5yZXBsYWNlKC9zJC8sICcnKTsgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnIHx8ICFvKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQXJyYXkgID0gbyBpbnN0YW5jZW9mIEFycmF5ID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBpc0FycmF5ID8gW10gOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVBcnIgID0gdHlwZXMuaW5kZXhPZignYXJyYXknKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVPYmogID0gdHlwZXMuaW5kZXhPZignb2JqZWN0IG9iamVjdCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJdGVtID0gdHlwZXMuaW5kZXhPZih0eXBlb2YgaXRlbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVPYmogIT09IC0xICYmIHR5cGVBcnIgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAhKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkpIHx8ICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgJiYgdHlwZUl0ZW0gIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc0FycmF5KSBmaWx0ZXJlZC5wdXNoKGl0ZW0pOyBlbHNlIGZpbHRlcmVkW2tleV0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYodHlwZU9iaiAhPT0gLTEgJiYgdHlwZUFyciAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlcy5wdXNoKCdvYmplY3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlSXRlbSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNBcnJheSkgZmlsdGVyZWQucHVzaChpdGVtKTsgZWxzZSBmaWx0ZXJlZFtrZXldID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVJdGVtICE9PSAtMSB8fCAoaXRlbSBpbnN0YW5jZW9mIEFycmF5ICYmIHR5cGVBcnIgIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlzQXJyYXkpIGZpbHRlcmVkLnB1c2goaXRlbSk7IGVsc2UgZmlsdGVyZWRba2V5XSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEZpbHRlcnMgYW4gb2JqZWN0IHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uIEZvciBvYmplY3RzLCBhIG5ldyBvYmplY3Qgd2lsbCBiZSByZXR1cm5lZCwgd2l0aFxuICAgICAgICAgICAgICAgICAqIHRoZSB2YWx1ZXMgdGhhdCBwYXNzZWQgdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRm9yIHN0cmluZ3MsIGEgbmV3IHN0cmluZyB3aWxsIGJlIHJldHVybmVkIHdpdGggdGhlIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgKiB0aGF0IHBhc3NlZCB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiBGb3IgbnVtYmVycywgYSBuZXcgbnVtYmVyIHdpbGwgYmUgcmV0dXJuZWQgd2l0aCB0aGUgZGlnaXRzIHRoYXQgcGFzc2VkXG4gICAgICAgICAgICAgICAgICogdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gRnVuY3Rpb25zIHdpbGwgYmUgb3BlcmF0ZWQgb24gYXMgc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiB1c2VkIHRvIGZpbHRlciB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBmaWx0ZXJlZCBvYmplY3RcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB3aGVyZTogZnVuY3Rpb24gd2hlcmUgKG8sIHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVkaWNhdGUgPSBmdW5jdGlvbiAoaSkgeyByZXR1cm4gaSA9PSB0ZW1wOyB9OyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9ICFpc09iamVjdCA/IFtdIDoge307XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChpdGVtLCBpdGVtLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoaXNPYmplY3QpIGZpbHRlcmVkW2tleV0gPSBpdGVtOyBlbHNlIGZpbHRlcmVkLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgZmlsdGVyZWQgPSBmaWx0ZXJlZC5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBGaWx0ZXJzIGFuIG9iamVjdCBieSBrZXlzIHVzaW5nIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gdXNlZCB0byBmaWx0ZXIgdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcmV0dXJuIHsqfSBUaGUgZmlsdGVyZWQgb2JqZWN0XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgd2hlcmVLZXlzOiBmdW5jdGlvbiB3aGVyZUtleXMgKG8sIHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZighKHByZWRpY2F0ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVkaWNhdGUgPSBmdW5jdGlvbiAoaykgeyByZXR1cm4gayA9PSB0ZW1wOyB9OyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKG8gPT09IG51bGwgfHwgbyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIDAgPT09ICdib29sZWFuJykgcmV0dXJuIHByZWRpY2F0ZS5jYWxsKG8sIG8sIDApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpc09iamVjdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiAhKG8gaW5zdGFuY2VvZiBBcnJheSkgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9ICFpc09iamVjdCA/IFtdIDoge307XG5cbiAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCBmdW5jdGlvbiAoaXRlbSwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwcmVkaWNhdGUuY2FsbChrZXksIGtleSwgaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpc09iamVjdCkgZmlsdGVyZWRba2V5XSA9IGl0ZW07IGVsc2UgZmlsdGVyZWQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gIT09ICdvYmplY3QnKSBmaWx0ZXJlZCA9IGZpbHRlcmVkLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEZvciBvYmplY3RzLCBpbnZlcnRzIHRoZSBvYmplY3RzIGtleXMvdmFsdWVzLiBJZiB0aGUgdmFsdWUgaXNuJ3QgYSBudW1iZXIgb3IgYXJyYXksIGl0IHdpbGwgYmUgb21pdHRlZC5cbiAgICAgICAgICAgICAgICAgKiBGb3Igc3RyaW5ncywgaXQgd2lsbCByZXZlcnNlIHRoZSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICogRm9yIG51bWJlciwgaXQgd2lsbCBjb21wdXRlIHRoZSBudW1iZXIncyBpbnZlcnNlIChpLmUuIDEgLyB4KS5cbiAgICAgICAgICAgICAgICAgKiBGb3IgZnVuY3Rpb25zLCBpbnZlcnQgcmV0dXJucyBhIG5ldyBmdW5jdGlvbiB0aGF0IHdyYXBzIHRoZSBnaXZlbiBmdW5jdGlvbiBhbmQgaW52ZXJ0cyBpdCdzIHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIGludmVyc2UsIGFzIGRlc2NyaWJlZCBhYm92ZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbnZlcnQ6IGZ1bmN0aW9uIGludmVydCAobykge1xuICAgICAgICAgICAgICAgICAgICBpZihvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvID09PSAnc3RyaW5nJykgICByZXR1cm4gbGlicy5zdHJpbmcucmV2ZXJzZShvKTtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdudW1iZXInKSAgIHJldHVybiAxIC8gbztcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mIG8gPT09ICdib29sZWFuJykgIHJldHVybiAhbztcblxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgcmV0dXJuIGxpYnMub2JqZWN0LmludmVydChvLmFwcGx5KG8sIGFyZ3VtZW50cykpOyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBsaWJzLm9iamVjdC5lYWNoKG8sIGZ1bmN0aW9uIChpdGVtLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZighb2JqW2l0ZW1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXAgPSBvYmpbaXRlbV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtpdGVtXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbaXRlbV0ucHVzaCh0bXAsIGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSZXR1cm5zIHRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbyBUaGUgb2JqZWN0IHRvIG9wZXJhdGUgb24uXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbj19IGZ1bmMgSWYgcGFzc2VkLCB0aGUgZnVuY3Rpb24gd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4geyp9IFRoZSBtYXhpbXVtIGl0ZW0gaW4gdGhlIG9iamVjdCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIG1heDogZnVuY3Rpb24gbWF4IChvLCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFvIHx8IHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIGlmKCEoZnVuYyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkgZnVuYyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCwgbWF4VmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heCA9IGxpYnMub2JqZWN0LmZpcnN0KG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGl0ZW0gPj0gbWF4KSBtYXggPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXggPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFZhbHVlID0gZnVuYy5jYWxsKG1heCwgbWF4KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGlicy5vYmplY3QuZWFjaChvLCAxLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZ1bmMuY2FsbChpdGVtLCBpdGVtKSA+PSBtYXhWYWx1ZSkgbWF4ID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXg7XG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIFJldHVybnMgdGhlIG1pbmltdW0gaXRlbSBpbiB0aGUgb2JqZWN0LlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZnVuYyBJZiBwYXNzZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Kn0gVGhlIG1pbmltdW0gaXRlbSBpbiB0aGUgb2JqZWN0IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbWluOiBmdW5jdGlvbiBtaW4gKG8sIGZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIW8gfHwgdHlwZW9mIG8gIT09ICdvYmplY3QnKSByZXR1cm4gbztcbiAgICAgICAgICAgICAgICAgICAgaWYoIShmdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24pKSBmdW5jID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvICE9PSAnb2JqZWN0JykgcmV0dXJuIG87XG4gICAgICAgICAgICAgICAgICAgIHZhciBtaW4sIG1pblZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaW4gPSBsaWJzLm9iamVjdC5maXJzdChvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihpdGVtIDw9IG1pbikgbWluID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWluID0gbGlicy5vYmplY3QuZmlyc3Qobyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5WYWx1ZSA9IGZ1bmMuY2FsbChtaW4sIG1pbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxpYnMub2JqZWN0LmVhY2gobywgMSwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmdW5jLmNhbGwoaXRlbSwgaXRlbSkgPD0gbWluVmFsdWUpIG1pbiA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWluO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBUZXN0cyB3aGV0aGVyIG9yIG5vdCB0aGUgb2JqZWN0IGhhcyBhIG1ldGhvZCBjYWxsZWQgJ21ldGhvZCcuXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG8gVGhlIG9iamVjdCB0byBvcGVyYXRlIG9uLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIG1ldGhvZCB0byB0ZXN0IGV4aXN0ZW5jZSBmb3IuXG4gICAgICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGhhcyBhIGZ1bmN0aW9uIGNhbGxlZCAnbWV0aG9kJywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGltcGxlbWVudHM6IGZ1bmN0aW9uIF9pbXBsZW1lbnRzICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFhKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmdzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIShhW21dIGluc3RhbmNlb2YgRnVuY3Rpb24pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBTYW1lIGFzIE9iamVjdC5qLmltcGxlbWVudHMsIGV4Y2VwY3Qgd2l0aCBhIGhhc093blByb3BlcnR5IGNoZWNrLlxuICAgICAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvIFRoZSBvYmplY3QgdG8gb3BlcmF0ZSBvbi5cbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIFRoZSBuYW1lIG9mIHRoZSBtZXRob2QgdG8gdGVzdCBleGlzdGVuY2UgZm9yLlxuICAgICAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBoYXMgaXRzIG93biBmdW5jdGlvbiBjYWxsZWQgJ21ldGhvZCcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzT3duOiBmdW5jdGlvbiBpbXBsZW1lbnRzT3duIChvLCBtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBsaWJzLm9iamVjdC50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhICAgID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKCFhKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaWJzLm9iamVjdC5ldmVyeShhcmdzLCBmdW5jdGlvbiAobSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIShhW21dIGluc3RhbmNlb2YgRnVuY3Rpb24pIHx8ICFvLmhhc093blByb3BlcnR5KG1ldGhvZCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIEVycm9yIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBib29sZWFuOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBCb29sZWFuIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBtYXRoOiB7XG4gICAgICAgICAgICAgICAgLyoqIEB0b2RvOiBBZGQgc29tZSBNYXRoIHV0aWxpdHkgZnVuY3Rpb25zLi4uICovXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgICAvKiogQHRvZG86IEFkZCBzb21lIFJlZ0V4cCB1dGlsaXR5IGZ1bmN0aW9ucy4uLiAqL1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbGlicztcbiAgICB9XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsaWJzO1xufSgpKTtcbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iXX0=
