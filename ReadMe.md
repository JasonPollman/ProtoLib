# ProtoLib
------
**The namespace friendly prototype library**   
*There's nothing wrong with modifying primitive prototypes, as long as you do it right.*   

------
ProtoLib is a fast, node and browser friendly JavaScript library. It "tucks" library methods inside a single, customizable property attached to *Object.prototype*.

It works in Node.js, Chrome, Firefox, and Safari.
**Untested in IE**

Basically, I got sick of writing library methods over and over, dealing with static methods, and colliding libraries... enter: ProtoLib.

## Features
---
- **Over 100 library methods**
    - [See the list below...](#available-methods)
- **Collision Free**
    - You define the property attached to *Object.prototype*
    - The default is *_* (underscore), but this can be set to any string.
- **Extensible**
    - ProtoLib allows you to extend that library for any prototype.
    - Extend both custom objects and primitives.
- **Switch the library on and off, on the fly**

## Install
---
```bash
$ npm install protolib --save
```

## Table of Contents
---
1. [Install](#install)
2. [Getting Started](#getting-started)
    - [Browser Use](#browser-use)
3. [Available Methods](#available-methods)
    - [Objects](#objects)
        - [histogram](#histogram)
        - [copy](#copy)
        - [occurrencesOf](#occurrencesof)
        - [keys](#keys)
        - [size](#size)
        - [isNumeric](#isnumeric)
        - [getNumeric](#getnumeric)
        - [isEmpty](#isempty)
        - [isArray](#isarray)
        - [isString](#isstring)
        - [isBoolean](#isboolean)
        - [isFunction](#isfunction)
        - [isNull](#isnull)
        - [isUndefined](#isundefined)
        - [isArguments](#isarguments)
        - [toNumber](#tonumber)
        - [toInt](#toint)
        - [random](#random)
        - [each](#each)
        - [every](#every)
        - [any](#any)
        - [toArray](#toarray)
        - [first](#first)
        - [last](#last)
        - [getCallback](#getcallback)
        - [findChildAtPath](#findchildatpath)
        - [clone](#clone)
        - [only](#only)
        - [where](#where)
        - [whereKeys](#wherekeys)
        - [invert](#invert)
        - [max](#max)
        - [min](#min)
        - [implements](#implements)
        - [implementsOwn](#implementsown)
    - [Strings](#strings)
        - [camelize](#camelize)
        - [decamelize](#decamelize)
        - [differenceFromString](#differencefromstring)
        - [intersectString](#intersectstring)
        - [repeat](#repeat)
        - [rtrim](#rtrim)
        - [ltrim](#ltrim)
        - [htmlEncode](#htmlencode)
        - [htmlDecode](#htmldecode)
        - [addSlashes](#addslashes)
        - [ucFirst](#ucfirst)
        - [lcFirst](#lcfirst)
        - [titleCase](#titlecase)
        - [splice](#splice)
        - [ellipses](#ellipses)
        - [shuffle](#shuffle)
        - [reverse](#reverse)
        - [withoutTrailingSlash](#withouttrailingslash)
        - [withTrailingSlash](#withtrailingslash)
        - [regexpSafe](#regexpsafe)
        - [pad](#pad)
        - [newlineToBreak](#newlinetobreak)
        - [tabsToSpan](#tabstospan)
        - [wordWrapToLength](#wordwraptolength)
    - [Arrays](#arrays)
        - [shuffle](#shuffle)
        - [union](#union)
        - [difference](#difference)
        - [intersect](#intersect)
        - [without](#without)
        - [rotate](#rotate)
        - [rotateLeft](#rotateleft)
        - [rotateRight](#rotateright)
        - [makeUnique](#makeUnique)
        - [unique](#unique)
        - [ascending](#ascending)
        - [descending](#descending)
    - [Functions](#functions)
        - [inherits](#inherits)
    - [Numbers](#numbers)
        - [factorial](#factorial)
        - [choose](#choose)
        - [pad](#pad)
        - [daysFrom](#daysfrom)
        - [daysFromNow](#daysfromnow)
        - [secondsFrom](#secondsfrom)
        - [secondsFromNow](#secondsfromnow)
        - [yearsFrom](#yearsfrom)
        - [yearsFromNow](#yearsfromnow)
        - [monthsFrom](#monthsfrom)
        - [monthsFromNow](#monthsfromnow)
        - [hoursFrom](#hoursfrom)
        - [hoursFromNow](#hoursfromnow)
        - [minutesFrom](#minutesfrom)
        - [minutesFromNow](#minutesfromnow)
        - [monthsAgo](#monthsago)
        - [daysAgo](#daysago)
        - [secondsAgo](#secondsago)
        - [minutesAgo](#minutesago)
        - [yearsAgo](#yearsago)
        - [clockTime](#clocktime)
    - [Date Objects](#date-objects)
        - [advanceDays](#advancedays)
        - [advanceMonths](#advancemonths)
        - [advanceYears](#advanceyears)
        - [yyyymmdd](#yyyymmdd)
        - [clockTime](#clocktime)


## Getting Started
---
```js
// Require the protolib library.
var ProtoLib = require('protolib');

// Create a new instance, specifying the accessor property (e.g. "handle"). This will default to '_' if unspecified.
var lib = new ProtoLib('_');

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

// Just instantiate ProtoLib with a different handle.
var lib = new ProtoLib('lib'),
    obj = { foo: 'hello', bar: 'world' };

obj.lib.invert()        // -> { hello: 'foo', world: 'bar' }
   .lib.histogram()     // -> { 'foo': 1, 'bar': 1 }
   .lib.size()          // -> 2
```

### Browser Use
*my-html-file.hmtl*
```html
<script type="text/javascript" src="protolib.min.js"></script>
<script type="text/javascript" src="my-script.js"></script>
```
*my-script.js*
```js
var lib = new window.ProtoLib('_');
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

### Objects

#### histogram    
**Returns an object containing the frequencies for each value in the provided arguments.**
For objects (arrays and pure objects), it will count the frequency of values.
For strings, it will count character frequencies. Numbers and functions will be converted using *toString*, and thus treated like strings. Except, for numbers, the result will attempt to parse each value as a number.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **histogram**() → *{Object<Number>}* |
| static   | **histogram**(*{...\*}* items) → *{Object<Number>}* |

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
**Returns a shallow copy of *item***
For non-objects, the given value is simply returned. For objects, a shallow copy is made.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **copy**() → *{\*}* |
| static   | **copy**(*{\*}* item) → *{\*}* |

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
**Counts the number of occurrences of *what***
For non-objects, the character occurrences are counted; for objects, the occurrences of "what" are counted by reference for object, and value for non-obejcts.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **occurrencesOf**(*{\*}* what) → *{Number}* |
| static   | **occurrencesOf**(*{\*}* item, *{\*}* what) → *{Number}* |

```js
[1, 1, 1, 1, 3]._.occurrencesOf(1);
// Returns 4

[1, 1, 1, 1, 3]._.occurrencesOf('1');
// Returns 0

{ foo: 'bar', hello: 'world' }._.occurrencesOf('bar');
// Returns 1

'racecar'._.occurrencesOf('r');
// Returns 2

/* Static Use */
lib.object.occurrencesOf(haystack, needle);
```

#### keys    
**Returns the object's keys**
For numbers and functions, this will *always* return an empty array.

| Context  | Signature        |
| :--------| :--------------- |
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
For strings, it will return *the string's length*, for numbers: the *number of digits*, for objects: *Object.keys(obj).length*, for arrays: *Array.length*, and for functions: *1*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **size**() → *{Number}* |
| static   | **size**(*{\*}* item) → *{Number}* |

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
| :--------| :--------------- |
| instance | **isNumeric**() → *{Boolean}* |
| static   | **isNumeric**(*{...\*}* items) → *{Boolean}* |

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
**Get's the given value's number equivalent.**
Returns the number represented by the given value, or NaN.
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **getNumeric**() → *{Number|NaN}* |
| static   | **getNumeric**(*{...\*}* objs) → *{Number|NaN}* |

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
```

#### isEmpty
**Determines if the given objects are "empty".**
That is, if *obj !== null && obj !== undefined*. So zero (0) isn't empty.
For collections, it will assert that the object has a length of more than zero.   

If used in the static context, it will return true if and only if all arguments are empty.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isEmpty**() → *{Boolean}* |
| static   | **isEmpty**(*{...\*}* objs) → *{Boolean}* |

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
| :--------| :--------------- |
| instance | **isArray**() → *{Boolean}* |
| static   | **isArray**(*{...\*}* objs) → *{Boolean}* |

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
| :--------| :--------------- |
| instance | **isPureObject**() → *{Boolean}* |
| static   | **isPureObject**(*{...\*}* objs) → *{Boolean}* |

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
| :--------| :--------------- |
| instance | **isString**() → *{Boolean}* |
| static   | **isString**(*{...\*}* objs) → *{Boolean}* |

#### isBoolean
**Determines if the given objects are all booleans.**
If used in the static context, it will return true if and only if all arguments are booleans.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isBoolean**() → *{Boolean}* |
| static   | **isBoolean**(*{...\*}* objs) → *{Boolean}* |

#### isFunction
**Determines if the given objects are all functions.**
If used in the static context, it will return true if and only if all arguments are functions.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isFunction**() → *{Boolean}* |
| static   | **isFunction**(*{...\*}* objs) → *{Boolean}* |

#### isNull
**Determines if the given objects are all null.**
If used in the static context, it will return true if and only if all arguments are null.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isNull**() → *{Boolean}* |
| static   | **isNull**(*{...\*}* objs) → *{Boolean}* |

#### isUndefined
**Determines if the given objects are all undefined.**
If used in the static context, it will return true if and only if all arguments are undefined.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isUndefined**() → *{Boolean}* |
| static   | **isUndefined**(*{...\*}* objs) → *{Boolean}* |

#### isArguments
**Determines if the given objects are all arguments objects.**
If used in the static context, it will return true if and only if all arguments are Arguments instances.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **isArguments**() → *{Boolean}* |
| static   | **isArguments**(*{...\*}* objs) → *{Boolean}* |

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
**Get's the given value's integer equivalent.**
Returns the integer value represented by the given value(s), or NaN.
If used in the static context, it will return an array with the results for each argument *if more than one argument is supplied*.

| Context  | Signature        |
| :--------| :--------------- |
| instance | **toInt**() |
| static   | **toInt**(*{...\*}* objs) |

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
| :--------| :--------------- |
| instance | **random**() → *{\*\}* |
| static   | **random**(*{\*}* obj) → *{\*\}* |

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
| :--------| :--------------- |
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
| :--------| :--------------- |
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
| {*} **parent**         | The object being iterated over. Typically, *this* and *parent* will be equal, however *parent* exists in the event *onIteration* has been bound. If using an arrow function *this* will be lexically block scoped, so *parent* should be used to be safe. |

Functions and Numbers are cast to strings with *Function/Number.toString*.

| Context  | Signature        |
| :--------| :--------------- |
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
| :--------| :--------------- |
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
| :--------| :--------------- |
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
| :--------| :--------------- |
| instance | **last**(*{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |
| static   | **last**(*{\*}* **obj**, *{Number=}* [**n**=1]) → *{\*\|Array<\*>\|Object<\*>}* |

#### getCallback
**Always returns a callback**
If the last item in the object is a function, it will be returned, otherwise an "empty" function is returned. This is useful for ensuring that you always have a valid callback when used against an *arguments* object.

This method is useless against strings, numbers, and functions. It will however, return an "empty" function if called on one.

| Context  | Signature        |
| :--------| :--------------- |
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
| :--------| :--------------- |
| instance | **findChildAtPath**(*{String}* **path**, {String=} [**delimiter**='.'], {Function=} **done**) → *{\*\|null}* |
| static   | **findChildAtPath**(*{\*}* **obj**, *{String}* **path**, {String=} [**delimiter**='.'], {Function=} **done**) → *{\*\|null}* |

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
