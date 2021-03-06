import { SeenKeys } from './types';

const toString = Function.call.bind<Function>(Object.prototype.toString);
const ownKeys = (o: any) =>
  typeof Reflect !== 'undefined' && Reflect.ownKeys
    ? Reflect.ownKeys(o)
    : typeof Object.getOwnPropertySymbols !== 'undefined'
    ? Object.getOwnPropertyNames(o).concat(
        Object.getOwnPropertySymbols(o) as any
      )
    : Object.getOwnPropertyNames(o);

export const arrayProtoOwnKeys = () => ownKeys(Object.getPrototypeOf([]));
export const objectProtoOwnKeys = () => ownKeys(Object.getPrototypeOf({}));

export const emptyFunction = () => {};
export const isObject = (o: any) => o ? (typeof o === 'object' || typeof o === 'function') : false // eslint-disable-line
export const hasSymbol = typeof Symbol !== 'undefined';
export const TRACKER: unique symbol = hasSymbol
  ? Symbol.for('tracker')
  : ('__tracker__' as any);
export const PATH_TRACKER: unique symbol = hasSymbol
  ? Symbol.for('path_tracker')
  : ('__path_tracker__' as any);

export const canIUseProxy = () => {
  try {
    new Proxy({}, {}) // eslint-disable-line
  } catch (err) {
    return false;
  }

  return true;
};

export const hasOwnProperty = (o: object, prop: PropertyKey) => o.hasOwnProperty(prop) // eslint-disable-line

export const isTrackable = (o: any) => { // eslint-disable-line
  return ['[object Object]', '[object Array]'].indexOf(toString(o)) !== -1;
};

export const isNumber = (obj: any) => toString(obj) === '[object Number]';
export const isString = (obj: any) => toString(obj) === '[object String]';
export const isBoolean = (obj: any) => toString(obj) === '[object Boolean]';
export const isMutable = (obj: any) => isObject(obj) || isArray(obj);
export const isPrimitive = (obj: any) =>
  isNumber(obj) || isString(obj) || isBoolean(obj);
export const isTypeEqual = (a: any, b: any) => toString(a) === toString(b);
export const isArray = (a: any) => Array.isArray(a);
export const isPlainObject = (a: any) => toString(a) === '[object Object]';
export const isFunction = (a: any) => toString(a) === '[object Function]';
type EachArray<T> = (index: number, entry: any, obj: T) => void;
type EachObject<T> = <K extends keyof T>(key: K, entry: T[K], obj: T) => number;

// type EachObject = Array<any> | { [key: string]: any }
type Iter<T extends Array<any> | { [key: string]: any }> = T extends Array<any>
  ? EachArray<T>
  : T extends { [key: string]: any }
  ? EachObject<T>
  : never;

export function each<T>(obj: T, iter: Iter<T>) {
  if (Array.isArray(obj)) {
    (obj as Array<any>).forEach((entry, index) =>
      (iter as EachArray<T>)(index, entry, obj)
    );
  } else if (isObject(obj)) {
    // @ts-ignore
    ownKeys(obj).forEach(key => (iter as EachObject<T>)(key, obj[key], obj));
  }
}

export const Type = {
  Object: 'object',
  Array: 'array',
};

export function shallowCopy(o: any) {
  if (Array.isArray(o)) return o.slice();
  const value = Object.create(Object.getPrototypeOf(o));
  ownKeys(o).forEach(key => {
    value[key] = o[key];
  });

  return value;
}

export const inherit = (
  subClass: {
    prototype: any;
    // __proto__: any;
  },
  superClass: {
    prototype: any;
  }
) => {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  // subClass.__proto__ = superClass // eslint-disable-line
};

export const createHiddenProperty = (
  target: object,
  prop: PropertyKey,
  value: any
) => {
  Object.defineProperty(target, prop, {
    value,
    enumerable: false,
    writable: true,
  });
};

export const hideProperty = (target: object, prop: PropertyKey) => {
  Object.defineProperty(target, prop, {
    enumerable: false,
    configurable: false,
  });
};

export const generateTrackerMapKey = (accessPath: Array<string>): string => {
  return accessPath.join(', ');
};

const seenKeys: SeenKeys = {};
const MULTIPLIER = Math.pow(2, 24) // eslint-disable-line

export const generateRandomKey = (prefix = '') => {
  let key;

  while (key === undefined || seenKeys.hasOwnProperty(key) || !isNaN(+key)) { // eslint-disable-line
    key = Math.floor(Math.random() * MULTIPLIER).toString(32);
  }

  const nextKey = `${prefix}${key}`;

  seenKeys[nextKey] = true;
  return nextKey;
};

export const generateRandomContextKey = () => generateRandomKey('__context_');
export const generateRandomFocusKey = () => generateRandomKey('__focus_');

/**
 * inlined Object.is polyfill to avoid requiring consumers ship their own
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
 */
function is(x: any, y: any) {
  // SameValue algorithm
  if (x === y) {
    // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    // Added the nonzero y check to make Flow happy, but it is redundant
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  }
  // Step 6.a: NaN == NaN
  return x !== x && y !== y; // eslint-disable-line
}

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
export function shallowEqual(objA: any, objB: any) {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}
