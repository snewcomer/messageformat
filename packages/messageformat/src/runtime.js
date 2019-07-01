import { funcname, propname } from './utils';

/** A set of utility functions that are called by the compiled Javascript
 *  functions, these are included locally in the output of {@link
 *  MessageFormat#compile compile()}.
 *
 * @class Runtime
 * @private
 * @param {MessageFormat} mf - A MessageFormat instance
 */
export default class Runtime {
  /** Utility function for `#` in plural rules
   *
   *  Will throw an Error if `value` has a non-numeric value and `offset` is
   *  non-zero or the `strictNumberSign` option is set.
   *
   * @function Runtime#number
   * @param {number} value - The value to operate on
   * @param {string} name - The name of the argument, used for error reporting
   * @param {number} [offset=0] - An optional offset, set by the surrounding context
   * @returns {number|string} The result of applying the offset to the input value
   */
  static defaultNumber = function(value, name, offset) {
    if (!offset) return value;
    if (isNaN(value))
      throw new Error(
        "Can't apply offset:" +
          offset +
          ' to argument `' +
          name +
          '` with non-numerical value ' +
          JSON.stringify(value) +
          '.'
      );
    return value - offset;
  };

  /** @private */
  static strictNumber = function(value, name, offset) {
    if (isNaN(value))
      throw new Error(
        'Argument `' +
          name +
          '` has non-numerical value ' +
          JSON.stringify(value) +
          '.'
      );
    return value - (offset || 0);
  };

  constructor({ strictNumberSign }, compiler, pluralFuncs) {
    this.number = strictNumberSign
      ? Runtime.strictNumber
      : Runtime.defaultNumber;
    this.compiler = compiler;
    this.pluralFuncs = pluralFuncs;
  }

  /** Utility function for `{N, plural|selectordinal, ...}`
   *
   * @param {number} value - The key to use to find a pluralization rule
   * @param {number} offset - An offset to apply to `value`
   * @param {function} lcfunc - A locale function from `pluralFuncs`
   * @param {Object.<string,string>} data - The object from which results are looked up
   * @param {?boolean} isOrdinal - If true, use ordinal rather than cardinal rules
   * @returns {string} The result of the pluralization
   */
  plural = function(value, offset, lcfunc, data, isOrdinal) {
    if ({}.hasOwnProperty.call(data, value)) return data[value];
    if (offset) value -= offset;
    var key = lcfunc(value, isOrdinal);
    return key in data ? data[key] : data.other;
  };

  /** Utility function for `{N, select, ...}`
   *
   * @param {number} value - The key to use to find a selection
   * @param {Object.<string,string>} data - The object from which results are looked up
   * @returns {string} The result of the select statement
   */
  select = function(value, data) {
    return {}.hasOwnProperty.call(data, value) ? data[value] : data.other;
  };

  /** @private */
  toString() {
    function _stringify(o, level) {
      if (typeof o != 'object') {
        const funcStr = o.toString().replace(/^(function )\w*/, '$1');
        const funcIndent = /([ \t]*)\S.*$/.exec(funcStr);
        return funcIndent
          ? funcStr.replace(new RegExp('^' + funcIndent[1], 'mg'), '')
          : funcStr;
      }
      const s = [];
      for (let i in o) {
        const v = _stringify(o[i], level + 1);
        s.push(level === 0 ? `var ${i} = ${v};\n` : `${propname(i)}: ${v}`);
      }
      if (level === 0) return s.join('');
      if (s.length === 0) return '{}';
      let indent = '  ';
      while (--level) indent += '  ';
      const oc = s.join(',\n').replace(/^/gm, indent);
      return `{\n${oc}\n}`;
    }

    const obj = {};
    const lcKeys = Object.keys(this.compiler.locales);
    for (let i = 0; i < lcKeys.length; ++i) {
      const lc = lcKeys[i];
      obj[funcname(lc)] = this.pluralFuncs[lc];
    }
    const rtKeys = Object.keys(this.compiler.runtime);
    for (let i = 0; i < rtKeys.length; ++i) {
      const fn = rtKeys[i];
      obj[fn] = this[fn];
    }
    if (Object.keys(this.compiler.formatters).length > 0) {
      obj.fmt = this.compiler.formatters;
    }
    return _stringify(obj, 0);
  }
}
