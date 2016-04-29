# ProtoLib
------
**The namespace friendly prototype library.**   
> There's nothing wrong with modifying built-in prototypes, as long as you do it right.

------
**Some of the magic from Javascript comes from the ability to modify built-in types... but it's also taboo.**    
It can lead to dangerous library collisions. That's where *ProtoLib* comes to the rescue. It's is a fast, Node.js and browser friendly JavaScript library that "tucks" utility methods inside a single, customizable property added to *Object.prototype*.

Static utility methods are cumbersome and don't lend themselves to *easy reading*. Basically, I grew tired of using static libraries, and re-writing utility methods over various projects... enter ProtoLib.

Currently tested and working in Node.js, Chrome, Firefox, Safari, IE 10 & 11.

## Features
---
- **Over 100 library methods**
    - [See the list below...](#available-methods)
    - Methods are attached to an object, attached to *Object.prototype*, which means more terse, readable code.
    - Iterating functions like [each](#each), [every](#every), and [any](#any) work on objects, arrays, strings, numbers, and functions.
- **Collision Free**
    - *You* define the property attached to *Object.prototype*.
    - The default is *_* (underscore), but this can be set to any string.
    - No ES6 for browser compatibility.
- **Extensible**
    - ProtoLib allows you to extend the library for any prototype.
    - Extend both custom objects and primitives.
- **Switch the library on and off, on the fly**

## Contents
---
1. [Install](#install)
2. [Getting Started](#getting-started)
    - [Node.js](#nodejs)
    - [Browser Use](#browser-use)
3. [Available Methods](#available-methods)
    - [Objects](#objects)
    - [Strings](#strings)
    - [Arrays](#arrays)
    - [Functions](#functions)
    - [Numbers](#numbers)
    - [Date Objects](#date-objects)
5. [Extending ProtoLib](#extending-protolib)
    - [Adding Methods](#adding-methods)
    - [Deleting Methods](#deleting-methods)
6. [Advanced](#advanced)
    - [Instance Methods](#protolib-instance-methods)
    - [Static Methods](#static-methods)

## Install
---
```bash
$ npm install protolib --save
```
## Getting Started
---

### Node.js

```js
// Require the protolib library.
var ProtoLib = require('protolib');

// Get a new instance, specifying the accessor property (i.e. "handle").
// This will default to '_' if unspecified.
var lib = ProtoLib.get('_');

// That's it!
// All objects now have access to the defined library methods from the '_' property.
var str = 'hello world!';

str._.titleCase() // -> 'Hello World!'
str._.ucFirst()   // -> 'Hello world!'
str._.reverse()   // -> '!dlrow olleh'

// Chaning with ProtoLib:
str._.titleCase()._.reverse()) // ->'!dlroW olleH'
```

**Oh Noes! I'm using a library that uses '_', what can I do?**

```js
var ProtoLib = require('protolib');

// Just get a new ProtoLib instance with a different handle.
var lib = ProtoLib.get('lib'),
    obj = { foo: 'hello', bar: 'world' };

obj.lib.invert()        // -> { hello: 'foo', world: 'bar' }
   .lib.histogram()     // -> { 'foo': 1, 'bar': 1 }
   .lib.size()          // -> 2
```

**Do not use *new* with ProtoLib**    
ProtoLib has a static function: *ProtoLib.get*. It should be used to prevent instantiating new *ProtoLib* instances across files. By using *ProtoLib.get* you can retrieve the same instance of the library across namespaces.

```js
// Bad, don't do it.
var lib = new ProtoLib('handle');

// Correct way to instantiate ProtoLib...
var lib = ProtoLib.get('_');
```

**Example: Cross-file use:**   
``foo.js``
```js
var ProtoLib = require('protolib'),
    lib      = ProtoLib.get('_');

// Library now available to objects...
'string'._.reverse();
```

``bar.js``
```js

// If called after foo.js, bar.js will still have the library methods attached.
// This still works...
'string'._.reverse();

// However, just to be safe you should include the library at the top of each file.
// If you don't need a reference to the class itself, just call:
require('protolib').get('_');
```

### Browser Use
Use ***/dist/protolib.min.js***... */index.js* is for Node.js only.

*my-html-file.hmtl*
```html
<script type="text/javascript" src="path/to/protolib.min.js"></script>
<script type="text/javascript" src="my-script.js"></script>
```
*my-script.js*
```js
var lib = window.ProtoLib.get('_');
var arr = [1, 2, 3, 4];

arr._.rotate('left', 2)                 // -> [3, 4, 1, 2]
arr._.intersect([1, 5, 6], [9, 3, 4])   // -> [3, 4, 1]
arr._.without(4, 1)                     // -> [3]

// Chaining some methods together:
arr = [1, 2, 'hello', 'world', { foo: 'bar' }];

arr._.only('string')                   // -> ['hello', 'world']
   ._.each(function (val, key) {       // -> ['dlrow', 'olleh']
        this[key] = val._.reverse();
   });
```

## Available Methods
---
### [**Objects**](#objects)
Methods available to all *Objects* (objects, arrays, strings, functions, etc.).   

| Name                              | Description                      |
| :-------------------------------- | :------------------------------- |
| [any](#any)                         | Loops through each item in an object until a *non-undefined* value is returned |
| [clone](#clone)                     | Clones an object using *JSON.stringify* and *JSON.parse* |
| [copy](#copy)                       | Creates a shallow copy of an object |
| [each](#each)                       | Loops through each item in an object, with an optional start and end range |
| [every](#every)                     | Loops through each item in an object until *false* is returned |
| [findChildAtPath](#findchildatpath) | Walks an object's children an returns the child specified by a string path |
| [first](#first)                     | Gets the first *n* items of an object |
| [getCallback](#getcallback)         | Gets the callback (last) value from a set, or returns an empty function |
| [getNumeric](#getnumeric)           | Gets an object's numeric equivalent (or *NaN*) |
| [histogram](#histogram)             | Computes an object's histogram of values |
| [implements](#implements)           | Determines if an object has the given property, and that property is a method |
| [implementsOwn](#implementsown)     | Determines if an object has the given property, and that property is a method which belongs to the object |
| [invert](#invert)                   | Inverts an object's keys and values, or computes the mathematical inverse of a number |
| [isArguments](#isarguments)         | Determines if the given objects are all Arguments objects |
| [isArray](#isarray)                 | Determines if the given objects are all arrays |
| [isBoolean](#isboolean)             | Determines if the given objects are all booleans |
| [isEmpty](#isempty)                 | Determines if the given objects are all empty (not null, not undefined, and not an empty string) |
| [isFunction](#isfunction)           | Determines if the given objects are all functions |
| [isNumeric](#isnumeric)             | Determines if the given objects are all numeric (can be parsed as a number) |
| [isNull](#isnull)                   | Determines if the given objects are all null |
| [isPureObject](#ispureobject)       | Determines if the given objects are all objects (and not arrays) |
| [isString](#isstring)               | Determines if the given objects are all strings |
| [isUndefined](#isundefined)         | Determines if the given objects are all undefined |
| [keys](#keys)                       | Gets an object's key set |
| [last](#last)                       | Gets the last *n* items of an object |
| [max](#max)                         | Finds the maximum value in an object |
| [min](#min)                         | Finds the minimum value in an object |
| [occurrencesOf](#occurrencesof)     | Counts an object's occurrences of the provided arguments |
| [random](#random)                   | Gets a random item from the object |
| [size](#size)                       | Gets the size ("length") of an object |
| [toArray](#toarray)                 | Converts an object to an array |
| [toNumber](#tonumber)               | Gets an object's numeric equivalent (or *NaN*) |
| [toInt](#toint)                     | Gets an object's integer equivalent (or *NaN*) |
| [only](#only)                       | Filters an object by the given types |
| [uniqueId](#uniqueid)               | Gets a unique id for non-literal types |
| [where](#where)                     | Filters an object using a predicate function |
| [whereKeys](#wherekeys)             | Filters an object by its keys using a predicate function |

### [**Strings**](#strings)
Methods available to all *String* objects.    

| Name                                | Description                      |
| :---------------------------------- | :------------------------------- |
| [addSlashes](#addslashes)           | Creates an eval-safe string, by escaping ```/['"\t\n\f\r\u0000]/``` |
| [camelize](#camelize)               | Converts a string to camel case |
| [decamelize](#decamelize)           | Converts a camel cased string to sentence form |
| [ellipses](#ellipses)               | Truncates a string, adding ellipses if the string is longer than *length* |
| [htmlDecode](#htmldecode)           | Unescapes HTML special characters |
| [htmlEncode](#htmlencode)           | Escapes HTML special characters |
| [lcFirst](#lcfirst)                 | Lowercases the first character of a string |
| [ltrim](#ltrim)                     | Left trims whitespace from a string |
| [newlineToBreak](#newlinetobreak)   | Replaces newlines with *\<br\>* tags |
| [pad](#pad)                         | Pads (or truncates) a string to *length* |
| [regexpSafe](#regexpsafe)           | Returns a regular expression safe string |
| [repeat](#repeat)                   | Repeats a string *n* times |
| [reverse](#reverse)                 | Reverses a string |
| [rtrim](#rtrim)                     | Right trims whitespace from a string |
| [splice](#splice)                   | Splices a string like *Array.splice* |
| [shuffle](#shuffle)                 | Shuffles a string |
| [titleCase](#titlecase)             | Converts a string to title case |
| [tabsToSpan](#tabstospan)           | Converts tab characters to a "tab" span |
| [ucFirst](#ucfirst)                 | Uppercases the first character of a string |
| [withoutTrailingSlash](#withouttrailingslash) | Removes trailing slashes from a string |
| [withTrailingSlash](#withtrailingslash)       | Adds a trailing slash to a string |

### [**Arrays**](#arrays)    
Methods available to all *Array* objects and their inheritors.   

| Name                                | Description                      |
| :---------------------------------- | :------------------------------- |
| [ascending](#ascending) | Sorts an array in ascending order |
| [descending](#descending) | Sorts an array in descending order |
| [difference](#difference) | Computes the set difference of the given arrays |
| [intersect](#intersect) | Computes the set intersection of the given arrays |
| [makeUnique](#makeunique) | Removes duplicates from the array (modifies the array) |
| [unique](#unique) | Returns a new array with duplicates removed |
| [rotate](#rotate) | Rotates an array's contents left or right |
| [rotateLeft](#rotateleft) | Rotates an array's contents left |
| [rotateRight](#rotateright) | Rotates an array's contents right |
| [shuffle](#shuffle-2) | Shuffles the contents of an array |
| [union](#union) | Computes the **unique** union of the given arrays |
| [without](#without) | Returns a new array with all occurrences of the arguments omitted |

### [**Functions**](#functions)
Methods available to all *Function* objects and their inheritors.    

| Name                                | Description                      |
| :---------------------------------- | :------------------------------- |
| [inherits](#inherits) | Inherit the prototype methods from one constructor into another |

### [**Numbers**](#numbers)    
Methods available to all *Number* objects and their inheritors.   

| Name                                | Description                      |
| :---------------------------------- | :------------------------------- |
| [choose](#choose) | Computes *n* choose *k* |
| [clockTime](#clocktime) | Returns a string in the *HH:MM:SS:MSEC* format |
| [daysAgo](#daysago) | Gets a date that occurs *n* days ago |
| [daysFrom](#daysfrom) | Gets a date that occurs *n* days from the given date |
| [daysFromNow](#daysfromnow) | Gets a date that occurs *n* days from the current date |
| [factorial](#factorial) | Returns the factorial of a number |
| [hoursAgo](#hoursago) | Gets a date that occurs *n* hours ago |
| [hoursFrom](#hoursfrom) | Gets a date that occurs *n* hours from the given date |
| [hoursFromNow](#hoursfromnow) | Gets a date that occurs *n* hours from the current time |
| [isInt](#isint) | True if all arguments are integers, false otherwise |
| [minutesAgo](#minutesago) | Gets a date that occurs *n* minutes ago |
| [minutesFrom](#minutesfrom) | Gets a date that occurs *n* minutes from the given date |
| [minutesFromNow](#minutesfromnow) | Gets a date that occurs *n* minutes from the current time |
| [monthsAgo](#monthsago) | Gets a date that occurs *n* months ago |
| [monthsFrom](#monthsfrom) | Gets a date that occurs *n* months from the given date |
| [monthsFromNow](#monthsfromnow) | Gets a date that occurs *n* months from the current date |
| [pad](#pad) | Pads a number with leading (or trailing) zeros |
| [randomNumberInRange](#randomnumberinrange) | Get a random number in the range [min, max] (inclusive) |
| [randomIntInRange](#randomintinrange) | Get a random integer in the range [min, max] (inclusive) |
| [secondsAgo](#secondsago) | Gets a date that occurs *n* seconds ago |
| [secondsFrom](#secondsfrom) | Gets a date that occurs *n* seconds from the given date |
| [secondsFromNow](#secondsfromnow) | Gets a date that occurs *n* seconds from the current time |
| [to](#to) | Returns a random integer (if passed an int), or float (if passed a float) in the given range |
| [yearsAgo](#yearsago) | Gets a date that occurs *n* years ago |
| [yearsFrom](#yearsfrom) | Gets a date that occurs *n* years from the given date |
| [yearsFromNow](#yearsfromnow) | Gets a date that occurs *n* years from the current date |
| [yyyymmdd](#yyyymmdd) | Returns a number in the YYYY-MM-DD format |

### [**Dates**](#dates)   
Methods available to all *Date* objects and their inheritors.   

| Name                                | Description                      |
| :---------------------------------- | :------------------------------- |
| [advanceDays](#advancedays) | Advances the date *n* days |
| [advanceMonths](#advancemonths) | Advances the date *n* months |
| [advanceYears](#advanceyears) | Advances the date *n* years |
| [clockTime](#clocktime-2) | Returns a string in the *HH:MM:SS:MSEC* format |
| [yyyymmdd](#yyyymmdd) | Returns a number in the YYYY-MM-DD format |     


---
**The examples below assume you have set 'lib' to a new instance of ProtoLib and that you're using the default handler ('_'), that is...**

```js
var ProtoLib = require('protolib'),
    lib = ProtoLib.get('_');

// Or in the browser...
var lib = window.ProtoLib.get('_');
```

### Objects

#### histogram    
**Returns an object containing a frequencies of values.**   
For objects (arrays and pure objects), it will count the frequency of values. For strings, it will count character frequencies. Numbers and functions will be converted using *toString*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **histogram**() → *{Object<Number>}* |
| static   | **histogram**(*{...\*}* **items**) → *{Object<Number>}* |

```js
[1, 2, 3, 4, 1, 1, 1, 5, 5]._.histogram()
// Returns { 1: 4, 2: 1, 3: 1, 4: 1, 5: 2 }

'racecar'._.histogram()
// Returns { r: 2, a: 2, c: 2, e: 1 }

'AAAAaaaa'._.histogram()
// Returns { A: 4, a: 4 }

(1234).histogram()
// Returns { 1: 1, 2: 1, 3: 1, 4: 1 }

(-1234).histogram()
// Returns { '-': 1, 1: 1, 2: 1, 3: 1, 4: 1 }

{ foo: 'bar', hello: 'world', number: 5, five: 5 }._.histogram()
// Returns { bar: 1, world: 1, 5: 2 }

/* Static Use */

lib.object.histogram([1, 2, 3], 'a string', function () {});
// Returns { 1: 1, 2: 1, 3: 1, a: 1, ' ': 1, s: 1, t: 1, r: 1, i: 1, n: 1, g: 1, 'function': 1 }

lib.object.histogram([1, 2, 3, [3, 4, 5], ['a', 'b', 'c']]);
// Returns { 1: 1, 2: 1, 3: 1, array: 2 }
```

#### copy    
**Returns a shallow copy of an object**   
For non-objects, the provided value is simply returned. For objects, a shallow copy is made.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **copy**() → *{\*}* |
| static   | **copy**(*{\*}* **item**) → *{\*}* |

```js
[1, 2, 3, 'a', 'b', 'c']._.copy();
// Returns a copy of the above array.

{ foo: 'bar' }._.copy();
// Returns a copy of the above object.

'hello world'._.copy();
// Returns 'hello world'

/* Static Use */
lib.object.copy(something);
```

#### occurrencesOf   
**Counts the number of occurrences of *what**    

| Context  | Signature        |
| :------- | :--------------- |
| instance | **occurrencesOf**(*{\*}* **what**) → *{Number}* |
| static   | **occurrencesOf**(*{\*}* **item**, *{\*}* **what**) → *{Number}* |

```js
[1, 1, 1, 1, 3]._.occurrencesOf(1);
// Returns 4

[1, 1, 1, 1, 3]._.occurrencesOf('1');
// Returns 0

{ foo: 'bar', hello: 'world' }._.occurrencesOf('bar');
// Returns 1

'racecar'._.occurrencesOf('r');
// Returns 2

'the rain falls mainly in the plain in spain'._.occurrencesOf('ain');
// Returns 4


/* Static Use */
lib.object.occurrencesOf(haystack, needle);
```

#### keys    
**Returns the object's key set**   
Note: For numbers and functions, this will *always* return an empty array.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **keys**() → *{Array<String>}* |
| static   | **keys**(*{\*}* item) → *{Array<String>}* |

```js
[1, 1, 1, 1, 3]._.keys();
// Returns ['0', '1', '2', '3', '4']

{ foo: 'bar', baz: 'biz' }._.keys();
// Returns ['foo', 'bar']

'a string'._.keys();
// Returns ['0', '1', '2', '3', '4', '5', '6', '7']

(1234)._.keys();
// Returns []

(function () {})._.keys();
// Returns []

/* Static Use */
lib.object.keys(item);
```

#### size
**Returns the "size" of an object (length).**   
For strings, it will return *the string's length*, for numbers: the *number of digits*, for objects: *Object.keys(...).length*, for arrays: *Array.length*, and for functions: *1*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **size**() → *{Number}* |
| static   | **size**(*{\*}* **item**) → *{Number}* |

```js
[1, 1, 1, 1, 3]._.size();
// Returns 5

{ foo: 'bar', baz: 'biz' }._.size();
// Returns 2

'a string'._.size();
// Returns 8

(1234)._.size();
// Returns 4

(-1234)._.size();
// Returns 5

(function () {})._.size();
// Returns 1

/* Static Use */
lib.object.size(item);
```

#### isNumeric    
**Determines if the object "is numeric".**   
Returns true if the object can be parsed as a number and is finite, false otherwise.   
If used in the static context, it will return true if and only if all arguments are numeric.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isNumeric**() → *{Boolean}* |
| static   | **isNumeric**(*{...\*}* **items**) → *{Boolean}* |

```js
[]._.isNumeric();               // false
{}._.isNumeric();               // false

'string'._.isNumeric();         // false
'1234'._.isNumeric();           // true
'-1234'._.isNumeric();          // true
'1e7'._.isNumeric();            // true
'0xFF'._.isNumeric();           // true

(1234)._.isNumeric();           // true
(-1234)._.isNumeric();          // true
(1e7)._.isNumeric();            // true
(0x64)._.isNumeric();           // true

(function () {})._.isNumeric(); // false

/* Static Use */
lib.object.isNumeric(a, b, c...);
```

#### getNumeric
**Get's an object's number equivalent.**   
Returns the number represented by the given value, or *NaN*.   
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **getNumeric**() → *{Number|NaN}* |
| static   | **getNumeric**(*{...\*}* **objs**) → *{Number|NaN}* |

```js
[]._.getNumeric();               // NaN
{}._.getNumeric();               // NaN

'string'._.getNumeric();         // NaN
'1234'._.getNumeric();           // 1234
'-1234'._.getNumeric();          // -1234
'-1234.56'._.getNumeric();       // -1234.56
'1e7'._.getNumeric();            // 10000000
'0xFF'._.getNumeric();           // 255

(1234)._.getNumeric();           // 1234
(1234.56)._.getNumeric();        // 1234.56
(-1234)._.getNumeric();          // -1234
(1e7)._.getNumeric();            // 10000000
(0x64)._.getNumeric();           // 100

(function () {})._.isNumeric();  // NaN

/* Static Use */
lib.object.getNumeric('1', '0xFF', 'hello world', 7); // Returns [1, 255, NaN, 7]
lib.object.getNumeric('90'); // Returns 90
```

#### isEmpty
**Determines if the given objects are "empty".**   
That is, if *obj !== null && obj !== undefined && obj !== ''*. **So zero (0) isn't empty.**   
For collections, it will assert that the object has a length of more than zero.    

If used in the static context, it will return true if and only if all arguments are empty.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isEmpty**() → *{Boolean}* |
| static   | **isEmpty**(*{...\*}* **objs**) → *{Boolean}* |

```js
[]._.isEmpty()                // true
{}._.isEmpty()                // true
[1]._.isEmpty()               // false
{ foo: 1, bar: 2}._.isEmpty() // false
(0)._.isEmpty()               // false
''._.isEmpty()                // true
'hello world'._.isEmpty()     // false
function () {}._.isEmpty()    // false

/* Static Use */
lib.object.isEmpty(0, '', 1, []);    // false
lib.object.isEmpty([], {}, []);      // true
lib.object.isEmpty(null, undefined); // true
```

#### isArray
**Determines if the given objects are all arrays.**   
If used in the static context, it will return true if and only if all arguments are arrays.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isArray**() → *{Boolean}* |
| static   | **isArray**(*{...\*}* **objs**) → *{Boolean}* |

```js
[]._.isArray()                // true
{}._.isArray()                // false
[1]._.isArray()               // true
{ foo: 1, bar: 2}._.isArray() // false
'hello world'._.isArray()     // false
function () {}._.isArray()    // false

/* Static Use */
lib.object.isArray(0, [], [1, 2, 3]);               // false
lib.object.isArray([], [1, 2, 3], ['a', 'b', 'c']); // true
lib.object.isArray(null, []);                       // false
```

#### isPureObject
**Determines if the given objects are all objects, but not arrays.**   
If used in the static context, it will return true if and only if all arguments are "pure objects".

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isPureObject**() → *{Boolean}* |
| static   | **isPureObject**(*{...\*}* **objs**) → *{Boolean}* |

```js
[]._.isPureObject()                // false
{}._.isPureObject()                // true
[1]._.isPureObject()               // false
{ foo: 1, bar: 2}._.isPureObject() // true
'hello world'._.isPureObject()     // false
function () {}._.isPureObject()    // false

/* Static Use */
lib.object.isPureObject({}, {}, {}); // true
lib.object.isPureObject([], {});     // false
lib.object.isPureObject(null, {});   // false
```

#### isString
**Determines if the given objects are all strings.**   
If used in the static context, it will return true if and only if all arguments are strings.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isString**() → *{Boolean}* |
| static   | **isString**(*{...\*}* **objs**) → *{Boolean}* |

#### isBoolean
**Determines if the given objects are all booleans.**
If used in the static context, it will return true if and only if all arguments are booleans.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isBoolean**() → *{Boolean}* |
| static   | **isBoolean**(*{...\*}* **objs**) → *{Boolean}* |

#### isFunction
**Determines if the given objects are all functions.**   
If used in the static context, it will return true if and only if all arguments are functions.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isFunction**() → *{Boolean}* |
| static   | **isFunction**(*{...\*}* **objs**) → *{Boolean}* |

#### isNull
**Determines if the given objects are all null.**   
If used in the static context, it will return true if and only if all arguments are null.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isNull**() → *{Boolean}* |
| static   | **isNull**(*{...\*}* **objs**) → *{Boolean}* |

#### isUndefined
**Determines if the given objects are all undefined.**   
If used in the static context, it will return true if and only if all arguments are undefined.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isUndefined**() → *{Boolean}* |
| static   | **isUndefined**(*{...\*}* **objs**) → *{Boolean}* |

#### isArguments
**Determines if the given objects are all arguments objects.**   
If used in the static context, it will return true if and only if all arguments are Arguments instances.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isArguments**() → *{Boolean}* |
| static   | **isArguments**(*{...\*}* **objs**) → *{Boolean}* |

```js
[]._.isArguments()                // false
{}._.isArguments()                // false
[1]._.isArguments()               // false
{ foo: 1, bar: 2}._.isArguments() // false
'hello world'._.isArguments()     // false
function () {}._.isArguments()    // false

(function () {
    arguments._.isArguments()     // true
}());

/* Static Use */

(function () {
    lib.object.isArguments(arguments); // true
}());

lib.object.isArguments([]);            // false
```

#### toNumber   
*Alias for [getNumeric](#getnumeric)*

#### toInt
**Get's the object's integer equivalent.**   
Returns the integer value represented by the given value(s), or *NaN*.
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **toInt**() |
| static   | **toInt**(*{...\*}* **objs**) |

```js
[]._.toInt();               // NaN
{}._.toInt();               // NaN

'string'._.toInt();         // NaN
'1234.12'._.toInt();        // 1234
'-1234.000112'._.toInt();   // -1234
'1e7'._.toInt();            // 10000000
'0xFF'._.toInt();           // 255

(1234.789)._.toInt();       // 1234
(-1234.00012)._.toInt();    // -1234
(1e7)._.toInt();            // 10000000
(0x64)._.toInt();           // 100

(function () {})._.toInt();  // NaN

/* Static Use */
lib.object.toInt('1', '0xFF', 'hello world', 7); // Returns [1, 255, NaN, 7]
```

#### random
**Returns a random item from an array or object, a random digit from a number, or a random character from a string.**   
Functions are cast to strings with *Function.toString*

| Context  | Signature        |
| :------- | :--------------- |
| instance | **random**() → *{\*\}* |
| static   | **random**(*{\*}* **obj**) → *{\*\}* |

```js
[1, 2, 3, 4].random()._.random();         // Could be any of: 1, 2, 3, or 4
{ foo: 'a', bar: 'b', baz: 0 }._.random() // Could be any of: 'a', 'b', 0,
'string'._.random()                       // Could be any of: 's', 't', 'r', 'i', 'n', 'g'

/* Static Use */
lib.object.random([[1, 2, 3], ['a', 'b', 'c'], 9]);
// Returns either one of the arrays or 9
```

#### each
**Invokes the provided callback for "each" item in the collection.**   
For each item in the collection, a callback (*onIteration*) is invoked with the following arguments:
*this* refers to the object being iterated over within the body of *onIteration*.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **each**(*{Number=}* [**startRange**=0], *{Number=}* [**endRange**=obj.length - 1], *{Function}* **onInteration**) → *{\*\|null}* |
| static   | **each**(*{\*}* **obj**, *{Number=}* [**startRange**=0], *{Number=}* [**endRange**=obj.length - 1], *{Function}* **onInteration**)) → *{\*\|null}* |

**Note:** All ranges are inclusive. If *startRange* is greater than *endRange* it will perform a decrementing loop.
```js
var total = 0, keyTotal = 0;
[1, 2, 3, 4, 5]._.each((val, key) => {
    total    += val;
    keyTotal += key.toString();
});
// total    = 15
// keyTotal = '01234'

{ hello: 1, world: 'foo', array: [1, 2, 3] }._.each((val, key, i, exit) => {
    console.log(val + ',' + key + ',' + i);
});
// Logged on 0th iteration: 1, 'hello', 0
// Logged on 1st iteration: 'foo', 'world', 1
// Logged on 2nd iteration: 1,2,3, 'array', 2

var truncated = '';
var result = 'hello world!'._.each((val, key, i, exit) => {
    if(val === ' ') return exit(val);
    truncated += val;
});
// truncated = 'hello'
// result    = ' '

/* Using Ranges */
/* All ranges are inclusive */

var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
arr._.each(0, 3, function (val, key, i, exit) {
    this[key] *= 7;
});
// arr = [7, 14, 21, 28, 5, 6, 7, 8, 9, 10]

arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
arr._.each(4, 3, function (val, key, i, exit, parent) {
    parent[key] *= 7;
});
// arr = [1, 2, 3, 28, 35, 6, 7, 8, 9, 10]

// If rangeA > rangeB, a decrementing loop will be performed!
arr = ['d', 'l', 'r', 'o', 'w', ' ', 'o', 'l', 'l', 'e', 'h'],
str = '';
arr._.each(10000, 0, function (val, key, i, exit) {
    str += val;
});
// str = 'hello world'

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.each(myArray, 0, 1 onInteration);
// Iterates through 'a' and 'b', but not 'c'.
```

#### every
**Invokes the provided callback for "every" item in the collection.**   
Loops through each item in the object and calls *onIteration*. If *false* is returned, the loop will break and return *false*, otherwise it will return *true*. This is similar to *Array.every* except that it works for all objects, and will break only on *false* and not a *falsy* return (null, undefined, 0, etc.).
*this* refers to the object being iterated over within the body of *onIteration*.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **every**(*{Function}* **onInteration**) → *{Boolean}* |
| static   | **every**(*{\*}* **obj**, *{Function}* **onInteration**)) → *{Boolean}* |

```js
var obj = { a: 1, b: 2, c: 3 },
    keys = [],
    vals = [];

obj._.every((val, key) => {
    vals.push(val);
    keys.push(key);
});
// vals = [1, 2, 3], keys = ['a', 'b', 'c']

var didLoopThroughAllItems = obj._.every(val => {
    if(val === 3) return false;
});
// didLoopThroughAllItems = false

didLoopThroughAllItems = obj._.every(val => {
    if(val === 999) return false;
});
// didLoopThroughAllItems = true

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.every(myArray, onInteration);
```

#### any
**Invokes the provided callback for every item in the collection and breaks when any value (other than undefined) is returned.**   
Loops through each item in the object and calls *onIteration*. If a "non-undefined" value is returned, the loop will break and return that value.

| Argument               | Definition       |
| :--------------------- | :--------------- |
| {\*} **value**         | The value of the current item being iterated over |
| {String} **key**       | The key of the current item |
| {Number} **iteration** | The current iteration count.<br/>For arrays *key* and *iteration* will be the same. |
| {Function} **exit**    | A function that, when called will break the loop and return the arguments passed to it as an array (or if a single value is passed, the value itself) |
| {\*} **parent**        | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **any**(*{Function}* **onInteration**) → *{\*\|undefined}* |
| static   | **any**(*{\*}* **obj**, *{Function}* **onInteration**)) → *{\*\|undefined}* |

```js
var obj = { a: 1, b: 2, c: 3 },
    keys = [],
    vals = [];

obj._.any((val, key) => {
    vals.push(val);
    keys.push(key);
});
// vals = [1, 2, 3], keys = ['a', 'b', 'c']

var result = obj._.any(val => {
    if(val === 3) return val;
});
// result = 3

result = obj._.any(val => {
    if(val === 999) return val;
});
// result = undefined

result = 'hello world'._.any(function (val, key) {
    if(key == 4) return 'got the letter o';
});
// result = 'got the letter o'

/* Static Use */
var myArray = ['a', 'b', 'c'],
    onInteration = () => { /* Do something... */ }

lib.object.any(myArray, onInteration);
```

#### toArray
**Converts an object to an array**   
Useful for converting *arguments* objects to arrays.
If an array is passed, a shallow copy of the array will be returned.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **toArray**() → *{Array<\*>}* |
| static   | **toArray**(*{\*}* **obj**) → *{Array<\*>}* |

```js
var string = 'a string',
    chars  = string._.toArray(); // chars = ['a', ' ', 's', 't', 'r', 'i', 'n', 'g']

var obj = { foo: 1, bar: 2 },
    arr = obj._.toArray(); // arr = [1, 2]

(function () {
    var args = arguments._.toArray();
    // args = [1, 2, 3, 4]
}(1, 2, 3, 4));

/* Static Use */
var converted = lib.object.toArray({ a: [1, 2], b: { foo: 'bar' }});
// converted = [[1, 2], { foo: 'bar' }]
```

#### first
**Returns the first n items of an object**   
If *n* is 1, the first item will be returned. If *n* is more than 1, an array/object of the first *n* items will be returned.
IF a string is passed, a single string will always be returned... in this way it works like *String.slice*.
Strings, numbers and functions will be cast to string using *toString*.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **first**(*{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |
| static   | **first**(*{\*}* **obj**, *{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |

```js
var string = 'a string',

    first = string._.first(),
    // first = 'a'
    firstFour = string._.first(4);
    // firstTwo = 'a st'

var array = [1, 2, 3, 4],

    arrayFirst = array._.first(),
    // arrayFirst = 1

    arrayFirstThree = array._.first(3);
    // arrayFirstThree = [1, 2, 3]

var object = { foo: 'bar', hello: 'world' },

    objectFirst = object._.first(),
    // objectFirst = 'bar'

    objectFirstThree = object._.first(3);
    // objectFirstThree = { foo: 'bar', hello: 'world' }

/* Static Use */
var staticFirst = lib.object.first([1, 2, 3]);
// staticFirst = 1
```

#### last
**Returns the last n items of an object**   
Works similar to *first*, except it returns the last *n* items, rather than the first *n*,

| Context  | Signature        |
| :------- | :--------------- |
| instance | **last**(*{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |
| static   | **last**(*{\*}* **obj**, *{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |

#### getCallback
**Always returns a callback**   
If the last item in the object is a function, it will be returned, otherwise an "empty" function is returned. This is useful for ensuring that you always have a valid callback when used against an *arguments* object.

This method is useless against strings, numbers, and functions. It will however, return an "empty" function if called on one.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **getCallback**() → *{Function}* |
| static   | **getCallback**(*{\*}* **obj**) → *{Function}* |

```js
// For this example EMPTY_CALLBACK_REPLACEMENT is a "blank" function.
// EMPTY_CALLBACK_REPLACEMENT === function () {}

var cb = [1, 2, 3, 4].getCallback();         // cb === EMPTY_CALLBACK_REPLACEMENT

cb = [1, 2, 3, function someFunction () {}]; // cb === someFunction
cb = { foo: 'bar', hello: 'world' };         // cb === EMPTY_CALLBACK_REPLACEMENT
cb = { foo: 'bar', hello: () => {} };        // cb === anonymous arrow function

(function (argA, argB, argC) {
    cb = arguments.getCallback();
    // cb === argC === exampleCallbackFunction
}('argA', 'argB', function exampleCallbackFunction () {}));

(function (argA, argB, argC, argD, argE) {
    cb = arguments.getCallback();
    // cb === EMPTY_CALLBACK_REPLACEMENT
    // Since exampleCallbackFunction wasn't the *last* argument,
    // the empty function was assigned to cb.
}('argA', 'argB', function exampleCallbackFunction () {}, 'argD', 'argE'));

/* Static Use */
var staticFirst = lib.object.getCallback(someObject);
```

#### findChildAtPath
**Finds the child of an object specified by the given string path**   
Finds the child specified by the given string "path" and delimiter (default '.') by walking the objects keys.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **findChildAtPath**(*{String}* **path**, *{String=}* [**delimiter**='.'], *{Function=}* **done**) → *{\*\|null}* |
| static   | **findChildAtPath**(*{\*}* **obj**, *{String}* **path**, *{String=}* [**delimiter**='.'], *{Function=}* **done**) → *{\*\|null}* |

```js
var someObject = {
    a: {
        aa: {
            aaa: 1,
            aab: 'hello'
        },
        ab: {
            aba: 2,
            abb: 'world'
        }
    },
    b: {
        ba: {
            baa: 3,
            bab: 'foo'
        },
        bb: {
            bba: 4,
            bbb: 'bar'
        }
    },
    c: [
        100,
        200,
        {
            example: 'value'
        }
    ]
}

var aa = someObject._.findChildAtPath('a.aa'),
    // Returns the object labeled by 'aa'

    aaa = someObject._.findChildAtPath('a.aa.aaa'),
    // Returns the value labeled by 'aaa' (1)

    bba = someObject._.findChildAtPath('a.bb.bba'),
    // Returns the value labeled by 'bba' (3)

    xxy = someObject._.findChildAtPath('a.bb.xxy'),
    // Returns null

    // Works on arrays too...
    c1 = someObject._.findChildAtPath('c.1'),
    // Returns 200

    c1 = someObject._.findChildAtPath('c.2.example'),
    // Returns 'value'

    d = someObject._.findChildAtPath('d'),
    // Returns null

    xxx = someObject._.findChildAtPath('');
    // Returns someObject

// If a function is passed for parameter *done*, it will be invoked
// with the item at the path, the parent of the item, and the item's key
aa = someObject._.findChildAtPath('a.aa', function (value, parent, key) {
    // this   = someObject
    // value  = { aaa: 1, aab: 'hello' }
    // parent = the object labeled by 'a' above.
    // key    = 'aa'
});

aaa = someObject._.findChildAtPath('a.aa.aaa', function (value, parent, key) {
    // this   = someObject
    // value  = 1
    // parent = the object labeled by 'a.aa' above.
    // key    = 'aaa'
});

/* Static Use */
var child = lib.object.findChildAtPath(someObject, 'somePath');
```

#### clone
**Clones an object using *JSON.stringify* and *JSON.parse***   
Throws an error if the object is circular.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **clone**() → *{\*}* |
| static   | **clone**(*{\*}* **obj**) → *{\*}* |

```js
var foo, bar;

foo = { a: 1, b: 2, c: 3 };
bar = foo._.clone(); // bar = { a: 1, b: 2, c: 3 }

foo = [1, 2, 3, 4, { a: 1, b: 2}];
bar = foo._.clone(); // bar = [1, 2, 3, 4, { a: 1, b: 2}]

/* Static Use */
lib.object.clone(myObject);
```

#### only
**Returns a new object with only the given types**   
Filters an object by the specified list of types ('string', 'number', 'object', 'array', 'function', 'object object'). Any *typeof* type can be used, and multiple arguments can be specified. *object* will return both arrays and objects, *object object* will return only objects, and *array* will filter only arrays.

Plural forms of the types can be used as well.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **only**(*{...String}* **types**) → *{\*}* |
| static   | **only**(*{\*}* **obj**, *{...String}* **types**) → *{\*}* |

```js
var foo, bar;
foo = [1, 2, 3, 'a', 'b', 'c', 4, 5, 6];

bar = foo._.only('numbers');            // bar = [1, 2, 3, 4, 5, 6]
bar = foo._.only('strings');            // bar = ['a', 'b', 'c']
bar = foo._.only('numbers', 'strings'); // bar = [1, 2, 3, 'a', 'b', 'c', 4, 5, 6]

foo = {
    a: [1, 2, 3],
    b: 'a string',
    c: function () {},
    d: null,
    e: { z: 9, y: 8 }
};

bar = foo._.only('object');         // bar = { a: [1, 2, 3], d: null, e: { z: 9, y: 8 } }
bar = foo._.only('array');          // bar = { a: [1, 2, 3] }
bar = foo._.only('object object');  // bar = { d: null, e: { z: 9, y: 8 } }
bar = foo._.only('function');       // bar = { c: function () {} }

// Useless on strings, numbers, and functions...
bar = (5)._.only('string')              // bar = 5
bar = ('hello world')._.only('string')  // bar = 'hello world'
bar = (function () {})._.only('string') // bar = function () {}

/* Static Use */
lib.object.only(myObject, 'typeA', 'typeB', 'typeC'...);
```

#### where
**Returns a new object, filtering by a predicate function**   
Filters an object by using a predicate function. If the predicate returns *true* the item is included in the results. The predicate function will be invoked for each item within the object with the following signature: **onItem** (*{\*}* **item**, *{String}* **key**).

| Context  | Signature        |
| :------- | :--------------- |
| instance | **where**(*{Function}* **predicate**) → *{\*}* |
| static   | **where**(*{\*}* **obj**, *{Function}* **predicate**) → *{\*}* |

```js
var foo, bar;
foo = [1, 2, 3, 4];

bar = foo._.where(item => item > 2); // bar = [3, 4]
bar = foo._.where(item => true);     // bar = [1, 2, 3, 4]

foo = {
    a: [1, 2, 3],
    b: 'a string',
    c: function () {},
    d: null,
    e: { z: 9, y: 8 }
};

bar = foo._.where((item, key) => key === 'a');      // bar = { a: [1, 2, 3] }
bar = foo._.where(function (item, key) {            // bar = { b: 'a string' }
    return typeof item !== 'object' && key !== 'c';
});

/* Static Use */
lib.object.where(myObject, predicateFunction);
```

#### whereKeys
**Returns a new object, filtering an object's keys by a predicate function**   
The same as *where*, except that the predicate function is invoked with the signature: **onItem** (*{String}* **key**, *{\*}* **item**).

| Context  | Signature        |
| :------- | :--------------- |
| instance | **whereKeys**(*{Function}* **predicate**) → *{\*}* |
| static   | **whereKeys**(*{\*}* **obj**, *{Function}* **predicate**) → *{\*}* |

#### invert
**Inverts an object's keys and values.**     
For numbers it computes the mathematical inverse (x<sup>-1</sup>).
For strings, it reverses the string.
For functions, invert returns a new function that wraps the given function and inverts it's result.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **invert**() → *{\*}* |
| static   | **invert**(*{\*}* **obj**) → *{\*}* |

```js
(1)._.invert()     // -> 1
(0)._.invert()     // -> Infinity
(789)._.invert()   // -> ~0.00126742712

[6, 7, 8]._.invert() // -> { 6: 0, 7: 1, 8: 2 }
{ a: 'foo', b: 5 }   // -> { foo: 'a', 5: b }
'string'._.invert()  // -> 'gnirts'
true._.invert()      // -> false

// For functions, invert returns a new function that wraps the
// given function and inverts it's result.
function alwaysTrue = () {
    return true;
}

var alwaysFalse = alwaysTrue._.invert();
alwaysFalse() // -> false

// Under the hood alwaysFalse was turned into something like this...
function () {
    return alwaysTrue.apply(alwaysTrue, arguments)._.invert();
}

/* Static Use */
lib.object.invert(myObject);
```

#### max
**Get's the highest value from an object**   
For numbers, strings, functions, and booleans, the object is simply returned.
An optional predicate function is available to determine the max for objects. The predicate is called with the current value in the collection, whatever is returned from the predicate is used in the evaluation to determine the if the value is the max.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **max**(*{Function=}* **predicate**) → *{\*}* |
| static   | **max**(*{\*}* **obj**, *{Function=}* **predicate**) → *{\*}* |

```js
[1, 4, 7, 5, 99, 1, 2]._.max()          // -> 99
['a', 'e', 'i', 'q', 'b', 'z']._.max()  // -> 'z'
[1, 'a', 4, 'r', 999]._.max()           // -> 999, since 999 > 'r' char code
{ a: 43, b: 123, c: 0 }._.max()         // -> 123

// Predicate example
var data = [
    {
        name: 'foo',
        value: 1
    },
    {
        name: 'bar',
        value: 2
    },
    {
        name: 'baz',
        value: 3
    }
];

var max = data._.max(function (item) {
    return item.value;
});

// max = { name: 'baz', value: 3 }

/* Static Use */
lib.object.max(myObject);
```
#### min
**Get's the lowest value from an object**   
Same as [max](#max), except it returns the minimum value.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **min**(*{Function=}* **predicate**) → *{\*}* |
| static   | **min**(*{\*}* **obj**, *{Function=}* **predicate**) → *{\*}* |

#### implements
**Determines if an object has the given properties, and those properties are methods**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **implements**(*{String}* **method**) → *{\*}* |
| static   | **implements**(*{\*}* **obj**, *{String}* **method**) → *{\*}* |

```js
var MyClass = function () {
    this.foo = function () {};
    this.bar = 5;
    this.baz = function () {};
};

var x = new MyClass();
x._.implements('foo', 'baz'); // -> true
x._.implements('bar', 'baz'); // -> false, baz is not a method

var y = {
    orange: function () {},
    apple: false
};

y._.implements('orange'); // -> true
y._.implements('apple'); // -> false, apple is not a method

/* Static Use */
lib.object.max(myObject);
```

#### implementsOwn
**Determines if an object has the given properties, and those properties are methods which belongs to the object**   
Same as [implements](#implements), except with added *hasOwnProperty* check.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **implementsOwn**(*{String}* **method**) → *{\*}* |
| static   | **implementsOwn**(*{\*}* **obj**, *{String}* **method**) → *{\*}* |

#### uniqueId
**Returns a unique id for non-literals**   
Returns a unique hex string for objects and functions. *Throws on numbers and strings*. The id is generated on a *as requested* basis, so the first time it's called 0x0 is returned, then 0x1, etc. etc. However, once assigned to the object, the same id will *always* be returned for that object.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **uniqueId**() → *{String}* |
| static   | **uniqueId**(*{\*}* **obj**) → *{String}* |

```js
var obj = { foo: 1, bar: 2 },
    id  = obj._.uniqueId();  // -> '0xN', where N is some base 16 number

var arr = [1, 2, 3],
    id  = arr._.uniqueId();  // -> '0xN', where N is some base 16 number

var func = function () {},
    id  = func._.uniqueId(); // -> '0xN', where N is some base 16 number

(5).uniqueId();              // Throws an Error
('a string').uniqueId();     // Throws an Error

/* Static Use */
lib.object.uniqueId(myObject);
```

### Strings

#### camelize
**Converts a string to camel case.**   
Replaces */[^a-z0-9$]/g* and makes the first letter of each word uppercase (except the first, of course).

| Context  | Signature        |
| :------- | :--------------- |
| instance | **camelize**() → *{String}* |
| static   | **camelize**(*{String}* **myString**) → *{String}* |

```js
var myString = 'hello world!';
myString._.camelize(); // -> 'helloWorld'

"we_don't_like_underscores_in_javascript"._.camelize();
// -> 'weDontLikeUnderscoresInJavascript'
```

#### decamelize
**Converts a camel case string to "somewhat" sentence form.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **decamelize**() → *{String}* |
| static   | **decamelize**(*{String}* **myString**) → *{String}* |

```js
var myString = 'thisIsCamelCased';
myString._.decamelize(); // -> 'this is camel cased'

'interestingBehavior'._.decamelize();
// -> 'interesting behavior'

'interestingBEHAVIOR'._.decamelize();
// -> 'interesting b e h a v i o r'
```
#### repeat
**Repeats a string *n* times.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **repeat**() → *{String}* |
| static   | **repeat**(*{String}* **myString**) → *{String}* |

```js
var myString = 'repeat me ';
myString._.repeat(3); // -> 'repeat me repeat me repeat me '

'*'._.repeat(10);     // -> '**********'
'Racecar'._.repeat(3) // -> 'RacecarRacecarRacecar'

/* Static Use */
lib.string.repeat(myString);
```

#### ltrim
**Left trims whitespace from a string.**   
Functions just like *String.trim*, except only on the left side of the string.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **ltrim**() → *{String}* |
| static   | **ltrim**(*{String}* **myString**) → *{String}* |

#### rtrim
**Right trims whitespace from a string.**   
Functions just like *String.trim*, except only on the right side of the string.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **rtrim**() → *{String}* |
| static   | **rtrim**(*{String}* **myString**) → *{String}* |

#### htmlEncode
**Escapes HTML special characters.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **htmlEncode**() → *{String}* |
| static   | **htmlEncode**(*{String}* **myString**) → *{String}* |

```js
var myString = '5 is > 7, but 7 < 9';
myString._.htmlEncode(); // -> '5 is &gt; 7, but 7 is &lt; 9'

/* Static Use */
lib.string.htmlEncode(myString);
```

#### htmlDecode
**Unescapes HTML special characters.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **htmlDecode**() → *{String}* |
| static   | **htmlDecode**(*{String}* **myString**) → *{String}* |

```js
var myString = '5 is &gt; 7, but 7 is &lt; 9';
myString._.htmlDecode(); // -> '5 is > 7, but 7 < 9'

/* Static Use */
lib.string.htmlDecode(myString);
```

#### addSlashes
**Creates an 'eval' safe string, by adding slashes to ", ', \t, \n, \f, \r, and the NULL byte.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **addSlashes**() → *{String}* |
| static   | **addSlashes**(*{String}* **myString**) → *{String}* |

```js
var myString = 'function () { return "hello world!"};';
myString._.addSlashes(); // -> 'function () { return \"hello world!\"};'

/* Static Use */
lib.string.addSlashes(myString);
```

#### ucFirst
**Returns the string with the first letter capitalized.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **ucFirst**() → *{String}* |
| static   | **ucFirst**(*{String}* **myString**) → *{String}* |

```js
var myString = 'hello world!';
myString._.ucFirst(); // -> 'Hello world!'

/* Static Use */
lib.string.ucFirst(myString);
```

#### lcFirst
**Returns the string with the first letter lowercased.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **lcFirst**() → *{String}* |
| static   | **lcFirst**(*{String}* **myString**) → *{String}* |

```js
var myString = 'Hello world!';
myString._.lcFirst(); // -> 'hello world!'

/* Static Use */
lib.string.lcFirst(myString);
```

#### titleCase
**Returns the string in title case.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **titleCase**() → *{String}* |
| static   | **titleCase**(*{String}* **myString**) → *{String}* |

```js
var myString   = 'the quick red fox jumped over the lazy brown dog!',
    titleCased = myString._.titleCase();

// titleCased = 'The Quick Red Fox Jumped Over The Lazy Brown Dog!'

/* Static Use */
lib.string.titleCase(myString);
```

#### splice
**Splices a string, like *Array.splice*.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **splice**(*{Number}* **index**, *{Number}* **delete**, *{String=}* **append**) → *{String}* |
| static   | **splice**(*{String}* **myString**, *{Number}* **index**, *{Number}* **delete**, *{String=}* **append**) → *{String}* |

```js
var myString = 'the quick red fox jumped over the lazy brown dog!';
myString = myString._.splice(4, 5, 'slow');

// myString = 'the slow red fox jumped over the lazy brown dog!'

var helloWorld = 'hello world';
helloWorld._.splice(0, 6); // -> 'world'
helloWorld._.splice(5, 6); // -> 'hello'

/* Static Use */
lib.string.splice(myString, index, deleteCount, stringToAppendAtIndex);
```

#### ellipses
**Truncates a string, adding ellipses if the string is longer than *length***   
Truncates the given string to length. If the string is longer than length, ellipses will be added to the end of the string.

- If the optional *place* argument is set to 'front', the ellipses is prepended to the string, rather than appended.
- The optional *ellipses* argument allows '...' to be replaces with any string value.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **ellipses**(*{Number}* **length**, *{String=}* [**place**='back'], *{String=}* **ellipses**) → *{String}* |
| static   | **ellipses**(*{String}* **myString**, *{Number}* **length**, *{String=}* **place**, *{String=}* **ellipses**) → *{String}* |

```js
var myString = 'the quick red fox jumped over the lazy brown dog!';

myString._.ellipses(10); // -> 'the qui...'
myString._.ellipses(20); // -> 'the quick red fox...'

myString._.ellipses(20, 'front');          // -> '...the quick red fox'
myString._.ellipses(20, 'front', '•••');   // -> '•••the quick red fox'
myString._.ellipses(20, 'back', '??????'); // -> 'the quick red ??????'

/* Static Use */
lib.string.splice(myString, index, deleteCount, stringToAppendAtIndex);
```

#### shuffle
**Shuffles a string.**   
If the optional *splitter* argument is passed, it will be tokenized by the value of *splitter* before being shuffled. Otherwise the strings characters will be moved around.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **shuffle**(*{String=}* **splitter**) → *{String}* |
| static   | **shuffle**(*{String}* **myString**, *{String=}* **splitter**) → *{String}* |

```js
var aString = 'hello world';
aString._.shuffle() // -> 'lweol rhold' (this is one possibility)

'hello world'._.shuffle('hello ');
// Possibilities are...
// 'hello world', and 'worldhello '

'hello world'._.shuffle(' ');
// Possibilities are...
// 'hello world', 'world hello', 'worldhello ', ' helloworld'
// ' worldhello', and 'helloworld '

/* Static Use */
lib.string.shuffle(myString, splitter);
```

#### reverse
**Reverses a string.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **reverse**() → *{String}* |
| static   | **reverse**(*{String}* **myString**) → *{String}* |

```js
var myString = 'hello world';
myString._.reverse()  // -> 'dlrow olleh';
'racecar'._.reverse() // -> 'racecar'

/* Static Use */
lib.string.reverse(myString);
```

#### withoutTrailingSlash
**Removes a trailing slash from a string (or path).**   
*On Node.js withoutTrailingSlash uses path.sep for a platform agnostic replacement.*

| Context  | Signature        |
| :------- | :--------------- |
| instance | **withoutTrailingSlash**() → *{String}* |
| static   | **withoutTrailingSlash**(*{String}* **myString**) → *{String}* |

```js
var path = 'path/to/some/directory/';
path._.withoutTrailingSlash() // -> 'path/to/some/directory'

path = 'path/to/some/directory/////';
path._.withoutTrailingSlash() // -> 'path/to/some/directory'

path = '/';
path._.withoutTrailingSlash() // -> ''

// If Node.js and Windows...
path = 'path\\to\\some\\directory\\';
path._.withoutTrailingSlash() // -> 'path\\to\\some\\directory'

/* Static Use */
lib.string.withoutTrailingSlash(myString);
```

#### withTrailingSlash
**Removes a trailing slash from a string (or path).**   
*On Node.js withoutTrailingSlash uses path.sep for a platform agnostic replacement.*

| Context  | Signature        |
| :------- | :--------------- |
| instance | **withTrailingSlash**() → *{String}* |
| static   | **withTrailingSlash**(*{String}* **myString**) → *{String}* |

```js
var path = 'path/to/some/directory';
path._.withTrailingSlash() // -> 'path/to/some/directory/'

// If Node.js and Windows...
path = 'path\\to\\some\\directory';
path._.withoutTrailingSlash() // -> 'path\\to\\some\\directory\\'

/* Static Use */
lib.string.withTrailingSlash(myString);
```

#### regexpSafe
**Returns a regular expression safe string.**   
Prepends slashes to ```/[-\/\\^$*+?.()|[\]{}]/g```

| Context  | Signature        |
| :------- | :--------------- |
| instance | **regexpSafe**() → *{String}* |
| static   | **regexpSafe**(*{String}* **myString**) → *{String}* |

```js
var money  = '$1,000.00',
    badRegExp, safeRegexp, result;

badRegexp = new Regexp(money, 'gi');
result = '$1,000.00 dollars would be nice.'._.replace(badRegexp, 'One thousand dollars');
// -> Throws 'invalid regular expression'

safeRegexp = new Regexp(money._.regexpSafe(), 'gi');
result = '$1,000.00 dollars would be nice.'._.replace(badRegexp, 'One thousand dollars');
// -> 'One thousand dollars would be nice.'

/* Static Use */
lib.string.regexpSafe(myString);
```

#### pad
**Pads a string (or truncates it) to the given length.**   
Prepends slashes to ```/[-\/\\^$*+?.()|[\]{}]/g```

| Context  | Signature        |
| :------- | :--------------- |
| instance | **regexpSafe**(*{String}* **length**, *{String=}* [**delimiter**= ' '], *{Boolean=}* **pre**) → *{String}* |
| static   | **regexpSafe**(*{String}* **myString**, *{String}* **length**, *{String=}* **delimiter**, *{Boolean=}* **pre**) → *{String}* |

```js
'hello world!'._.pad(3);  // -> 'hel'
'hello world!'._.pad(20); // -> 'hello world!        '

// Custom pad string
'hello world!'._.pad(3, '-');  // -> 'hel'
'hello world!'._.pad(20, '-'); // -> 'hello world!--------'

// If *pre* parameter is passed true...
'hello world!'._.pad(3, '-', true);  // -> 'ld!'
'hello world!'._.pad(20, '-', true); // -> '--------hello world!'

/* Static Use */
lib.string.pad(myString, length, delimiter, pre);
```

#### newlineToBreak
**Replaces newlines with \<br\> tags.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **newlineToBreak**() → *{String}* |
| static   | **newlineToBreak**(*{String}* **myString**) → *{String}* |

```js
'line 1\nline 2\nline 3'._.newlineToBreak();
// -> 'line 1<br>line 2<br>line 3'

/* Static Use */
lib.string.newlineToBreak(myString);
```

#### tabsToSpan
**Replaces tab characters with <span class="tab"></span> tags.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **tabsToSpan**() → *{String}* |
| static   | **tabsToSpan**(*{String}* **myString**) → *{String}* |

```js
'line 1\tline 2\tline 3'._.tabsToSpan();
// -> 'line 1<span class="tab"></span>line 2<span class="tab"></span>line 3'

/* Static Use */
lib.string.tabsToSpan(myString);
```

### Numbers

#### randomIntInRange
**Get a random integer in the range [min, max] (inclusive)**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | *N/A* |
| static   | **randomNumberInRange**(*{Number}* [**a**=0], *{Number}* [**b**=*Number.MAX_VALUE*]) → *{Number}* |

```js
lib.number.randomIntInRange(0, 100);    //-> Some integer between 0 and 100
lib.number.randomIntInRange(-100, 100); //-> Some integer between -100 and 100
```

#### randomNumberInRange
**Get a random float in the range [min, max] (inclusive)**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | *N/A* |
| static   | **randomNumberInRange**(*{Number}* [**a**=0], *{Number}* [**b**=*Number.MAX_VALUE*]) → *{Number}* |

```js
lib.number.randomNumberInRange(0.123, 100.784);    //-> Some integer between 0.123 and 100.784
lib.number.randomNumberInRange(-100.1, 5); //-> Some integer between -100.1 and 5
```

#### to   
**Gets a random integer/float using the number as the lower range and *n* as the upper range (both inclusive)**   
If *n* is omitted, *Number.MAX_VALUE* will be used. If the number is an integer, an integer will be returned; same for floats.   

| Context  | Signature            |
| :------- | :------------------- |
| instance | **to**() → *{Number}*|
| static   | *N/A                 |

```js
(5)._.to(100);      // -> Some integer between 5 and 100
(5.1)._.to(100);    // -> Some float between 5.1 and 100
(-1)._.to(1)        // -> -1, 0, or 1
(-1.000001)._.to(1) // -> Some float value between -1.000001 to 1
```

#### factorial
**Returns the factorial value of a number.**   
Any number greater than 170 returns Infinity (as the factorial of 171 > Number.MAX_VALUE). All negative numbers return NaN.   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **factorial**() → *{Number|Infinity}* |
| static   | **factorial**(*{\*}* **myNumber**) → *{Number|Infinity}* |

```js
(3)._.factorial();   // -> 6
(0)._.factorial();   // -> 1
(100)._.factorial(); // -> ~9.332622e+157

(-1)._.factorial();  // -> NaN

/* Static Use */
lib.number.factorial(myNumber);
```

#### choose
**Computes the number of combinations between n and k.**   

| Context  | Signature        |
| :------- | :--------------- |
| instance | **choose**() → *{Number|Infinity}* |
| static   | **choose**(*{Number}* **n**, *{Number}* **k**) → *{Number|Infinity}* |

```js
(3)._.choose(2);            // -> 3
(10000)._.choose(1);        // -> 1000
(10000)._.choose(10000);    // -> 1
(1000)._.choose(170);       // -> ~3.27184e+196

/* Static Use */
lib.number.choose(n, k);
```

#### isInt
**True if all arguments are integers, false otherwise.**   
This method checks for a '.' using *Number.toString*, so any number with a period is considered a "float".

| Context  | Signature        |
| :------- | :--------------- |
| instance | **isInt**() → *{Boolean}* |
| static   | **isInt**(*{...Number}* **n**) → *{Boolean}* |

```js
(5)._.isInt()       // -> true
(5.123)._.isInt()   // -> false
(0)._.isInt()       // -> true
(5.0)._.isInt()     // -> false
(-1.2)._.isInt()    // -> false

/* Static Use */
lib.number.isInt(a, b, c, d, e...);
```

#### pad
**Pads a number with leading zeros.**    
Returns a string representation of a number padded with leading or trailing zeros.

| Context  | Signature        |
| :------- | :--------------- |
| instance | **pad**(*{Number}* **length**) → *{String}* |
| static   | **pad**(*{Number}* **n**, *{Number}* **length**) → *{String}* |

```js
(5)._.isInt()       // -> true
(5.123)._.isInt()   // -> false
(0)._.isInt()       // -> true
(5.0)._.isInt()     // -> false
(-1.2)._.isInt()    // -> false

/* Static Use */
lib.number.pad(n, length);
```

#### daysFrom
**Gets a date that occurs *n* days from the given date.**    

| Context  | Signature        |
| :------- | :--------------- |
| instance | **pad**() → *{Date}* |
| static   | **pad**(*{Number}* **n**) → *{Date}* |

```js
(5)._.isInt()       // -> true
(5.123)._.isInt()   // -> false
(0)._.isInt()       // -> true
(5.0)._.isInt()     // -> false
(-1.2)._.isInt()    // -> false

/* Static Use */
lib.number.daysFrom(n, length);
```

## Extending ProtoLib
---

### Adding Methods
**You can add your own utility methods to a ProtoLib instance by using *ProtoLib#extend*...**   

#### ProtoLib#extend(*{Function=}* [**constructor**=*Object*], *{String}* **name**, *{String=}* **staticNamepace**, *{Function}* **method**) → *{Boolean}*
**Adds a method to the given constructor and all inheritors of the constructor.**   
Returns true if successful, false otherwise.    

The new method will be available both statically and as a member on instance libraries. **You should write your methods statically.** That is, you should include the object as the *first* argument to the method. Objects calling the instance version of the method will adjust for this automagically, and use the arguments *1-n* provided in the method callback; that is: with the first argument omitted.

**Example: Adding a method to all Array objects...**

```js
var lib = ProtoLib.get('_');

// Example: write a method to remove all objects from an array,
// except for the first n.

var wasExtended = lib.extend(Array, 'empty', function (array, leaveFirstN) {
    leaveFirstN = typeof leaveFirstN === 'number' ? leaveFirstN : 0;
    // this refers to object being operated on when using ProtoLib#extend
    // So, this === array
    for(var i = leaveFirstN; i < this.length; i++) {
        this.splice(i, 1);
        // We have to adjust our array pointer here,
        // since splice modifies the array internally.
        i--;
    }
    return this;
});

var [1, 2, 3]._.empty();  // -> []
var [1, 2, 3]._.empty(2); // -> [1, 2]

// For the record, it's typically faster to assign an array
// to a new array, than empty it.
```

##### Extended Static Versions
The static version of an extended method will be added to *lib[staticNamespace]* and *lib.my* where *lib* is the reference to a ProtoLib instance and *staticNamespace* is the 3rd argument of *Protolib#extend*. So calling Protolib#extend with:

```js
lib.extend(MyClass, 'methodName', 'MyClass', someFunction);
```
Will result in the following static methods...
```js
lib.MyClass.methodName
lib.my.methodName
```

If staticNamespace is omitted... ProtoLib will add the method to the *my* static namespace, and if the constructor function has a name, it will use the constructor name. **Note, Internet Explorer doesn't support *Function.name*, so for IE the following is not true.**   

```js
var MyClass = function myClassConstructor () { ... }
lib.extend(MyClass, 'example', someFunction);

lib.myClassConstructor.example
lib.my.example

// In IE only lib.my.example is available...
```

If the constructor is a built-in type (i.e. *Object*, *Array*, *Date*, *Number*, *String*, *Error*, *Function*, *RegExp*, etc.), **the *staticNamepace* argument will be ignored** and the lowercased version of the constructor name will be used. For example:

```js

var MyClass = function myClassConstructor () { ... }
lib.extend(Array, 'example', 'myStaticNamepace' someFunction);

// 'example' function will be added to the following static namespaces...
lib.array.example
lib.my.example

// It will *not* be added to:
lib.myStaticNamepace.example

```

### Deleting Methods
**You can delete utility methods from a ProtoLib instance by using *ProtoLib#delete*...**   

#### ProtoLib#delete(*{Function}* **constructor**, *{String}* **name**) → *{Boolean}*
**Deletes a library method from the ProtoLib instance for the given constructor.**   
Returns true if successful, false otherwise.    

```js
var lib = ProtoLib.get('_');
var MyClass = function () {};

// Add a new library method...
lib.extend(MyClass, 'example', myObject => {
    console.log('Example called!');
});

var myClassObject = new MyClass();
myClassObject._.example(); // Logs 'Example called!'

// Delete the library method...
var wasDeleted = lib.delete(MyClass, 'example');
myClassObject._.example(); // TypeError: myClassObject._.example is not a function
```

## Advanced
---
**This section is basically informational.**   
You probably won't ever use it, but it's here just in case.

### Instance Methods

#### ProtoLib#load → *{ProtoLib}*
**Adds the library (handle) object to all objects.**    
Returns a reference to the current *ProtoLib* instance.

#### ProtoLib#unload → *{ProtoLib}*
**Removes the handle object from all objects.**    
Returns a reference to the current *ProtoLib* instance.

#### ProtoLib#killCache(*{Function=}* constr) → *{ProtoLib}*
**Kills the library cache, forcing handle objects to be recreated on the next call.**    
If a Function is passed in for parameter *constr*, only the given constructor's cache will be deleted.
Returns a reference to the current *ProtoLib* instance.

#### ProtoLib#setHandle() → *{ProtoLib}*
**Resets the handle, for accessing the library.**    
Returns a reference to the current *ProtoLib* instance.

```js
var lib = ProtoLib.get('_');

'example'._.reverse();  // -> 'elpmaxe'

lib.setHandle('pl');

'example'._.reverse();  // TypeError: 'example'._.reverse is not a function
'example'.pl.reverse(); // -> 'elpmaxe'
```
#### ProtoLib#extend(*{Function=}* [**constructor**=*Object*], *{String}* **name**, *{String=}* **staticNamepace**, *{Function}* **method**) → *{Boolean}*
**See [Adding Methods](#adding-methods)**    

#### ProtoLib#delete(*{Function}* **constructor**, *{String}* **name**) → *{Boolean}*
**See [Deleting Methods](#deleting-methods)**    

### Static Methods

#### ProtoLib.get(*{String}* **handle**) → *{ProtoLib}* **instance**
**Retrieves the ProtoLib instance with the given handle, or creates a new one.**    

#### ProtoLib.killCache(*{String=}* **handle**) → *{Function}* **ProtoLib**
**Kills the cache for the ProtoLib instance with the given handle**
If no handle is specified, all ProtoLib instances will have their cache cleared.  

#### ProtoLib.killCacheForConstructor(*{String=}* **constr**) → *{Function}* **ProtoLib**
**Kills the cache for the given constructor for all ProtoLib instances.**
If no constructor is specified, or if *constr* isn't a function, no action will be taken. 

#### ProtoLib.destroy(*{String}* **handle**) → *{Function}* **ProtoLib**
**Destroys a ProtoLib instance, and removes it's library methods from all objects**    
This also frees up the ProtoLib instance with the given handle to be garbage collected, if not referenced elsewhere.
