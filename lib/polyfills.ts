/**
 * Polyfills for cross-browser compatibility
 *
 * This file provides polyfills for older browsers that don't support
 * modern JavaScript features. Import this at the top of your app
 * if you need to support older browsers like IE11.
 *
 * Note: With Next.js 14+ and the browserslist configuration,
 * most polyfills are handled automatically. This file provides
 * additional safety for edge cases.
 */

// Core-js provides polyfills for ES features
import 'core-js/stable';

// Polyfill for fetch API (for very old browsers)
// Next.js handles this automatically, but kept here for reference
if (typeof window !== 'undefined' && !window.fetch) {
  console.warn('Fetch API not available, using polyfill');
}

// Polyfill for requestAnimationFrame
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame ||
    function(callback: FrameRequestCallback): number {
      return window.setTimeout(callback, 1000 / 60);
    };

  window.cancelAnimationFrame = window.cancelAnimationFrame ||
    function(id: number): void {
      window.clearTimeout(id);
    };
}

// Polyfill for Element.closest (IE11)
if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  Element.prototype.closest = function(selector: string): Element | null {
    let el: Element | null = this;
    while (el) {
      if (el.matches(selector)) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  };
}

// Polyfill for Element.matches (IE11)
if (typeof Element !== 'undefined' && !Element.prototype.matches) {
  Element.prototype.matches =
    (Element.prototype as any).msMatchesSelector ||
    (Element.prototype as any).webkitMatchesSelector;
}

// Polyfill for NodeList.forEach (IE11)
if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach as any;
}

// Polyfill for String.prototype.startsWith
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(search: string, pos?: number): boolean {
    const position = pos || 0;
    return this.substring(position, position + search.length) === search;
  };
}

// Polyfill for String.prototype.endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search: string, length?: number): boolean {
    const len = length === undefined ? this.length : length;
    return this.substring(len - search.length, len) === search;
  };
}

// Polyfill for String.prototype.includes
if (!String.prototype.includes) {
  String.prototype.includes = function(search: string, start?: number): boolean {
    return this.indexOf(search, start) !== -1;
  };
}

// Polyfill for Array.prototype.includes
if (!Array.prototype.includes) {
  Array.prototype.includes = function<T>(searchElement: T, fromIndex?: number): boolean {
    return this.indexOf(searchElement, fromIndex) !== -1;
  };
}

// Polyfill for Array.prototype.find
if (!Array.prototype.find) {
  Array.prototype.find = function<T>(
    predicate: (value: T, index: number, obj: T[]) => boolean,
    thisArg?: any
  ): T | undefined {
    for (let i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}

// Polyfill for Object.assign
if (typeof Object.assign !== 'function') {
  Object.assign = function(target: any, ...sources: any[]): any {
    if (target === null || target === undefined) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    const to = Object(target);
    for (const source of sources) {
      if (source !== null && source !== undefined) {
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            to[key] = source[key];
          }
        }
      }
    }
    return to;
  };
}

// Polyfill for Object.entries
if (!Object.entries) {
  Object.entries = function<T>(obj: { [key: string]: T }): [string, T][] {
    const entries: [string, T][] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        entries.push([key, obj[key]]);
      }
    }
    return entries;
  };
}

// Polyfill for Object.values
if (!Object.values) {
  Object.values = function<T>(obj: { [key: string]: T }): T[] {
    const values: T[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        values.push(obj[key]);
      }
    }
    return values;
  };
}

export {};
