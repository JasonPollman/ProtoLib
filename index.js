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
                return o.__proto__ || o.constructor.prototype.constructor; // jshint ignore:line
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
