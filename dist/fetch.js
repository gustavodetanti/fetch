(function () {
  'use strict';

  /**
   * @module utils
   * @license MIT
   * @version 2017/11/28
   */

  var toString = Object.prototype.toString;

  /**
   * @function typeOf
   * @param {any} value
   * @returns {string}
   */
  function typeOf(value) {
    return toString
      .call(value)
      .replace(/\[object (\w+)\]/, '$1')
      .toLowerCase();
  }

  /**
   * @function bindEvents
   * @param {XMLHttpRequest|XDomainRequest} xhr
   */
  function bindEvents(xhr) {
    var events = {};

    ['load', 'error', 'timeout'].forEach(function(method) {
      xhr['on' + method] = function() {
        if (events[method]) {
          events[method](xhr);
        }
      };
    });

    xhr.on = function(type, fn) {
      events[type] = fn;
    };

    xhr.onabort = function() {
      events = {};
    };
  }

  /**
   * @function Blank
   * @description Use a blank constructor save memory for extend function.
   */
  function Blank() {}

  var objectCreate = Object.create;
  var setPrototypeOf = Object.setPrototypeOf;

  /**
   * @function extend
   * @param {Function} superclass
   * @param {Function} subclass
   */
  function extend(superclass, subclass) {
    var superPrototype = superclass.prototype;

    if (setPrototypeOf) {
      setPrototypeOf(subclass.prototype, superPrototype);
    } else if (objectCreate) {
      subclass.prototype = objectCreate(superPrototype);
    } else {
      Blank.prototype = superPrototype;

      subclass.prototype = new Blank();
    }

    subclass.prototype.constructor = subclass;
  }

  var FPToString = Function.prototype.toString;

  // Native function RegExp
  // @see https://github.com/kgryte/regex-native-function/blob/master/lib/index.js
  var NATIVE_RE = '';

  // Use a native function as a template...
  NATIVE_RE += FPToString.call(Function);
  // Escape special RegExp characters...
  NATIVE_RE = NATIVE_RE.replace(/([.*+?^=!:$(){}|[\]\/\\])/g, '\\$1');
  // Replace any mentions of `Function` to make template generic.
  // Replace `for ...` and additional info provided in other environments, such as Rhino (see lodash).
  NATIVE_RE = NATIVE_RE.replace(/Function|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?');
  // Bracket the regex:
  NATIVE_RE = '^' + NATIVE_RE + '$';

  // Get RegExp
  NATIVE_RE = new RegExp(NATIVE_RE);

  /**
   * @function isNativeMethod
   * @param {any} value
   * @returns {boolean}
   */
  function isNativeMethod(value) {
    if (typeOf(value) !== 'function') {
      return false;
    }

    return NATIVE_RE.test(FPToString.call(value));
  }

  /**
   * @module support
   * @license MIT
   * @version 2017/11/29
   */

  var supportFetch = isNativeMethod(window.fetch);
  var supportHeaders = isNativeMethod(window.Headers);
  var supportRequest = isNativeMethod(window.Request);
  var supportResponse = isNativeMethod(window.Response);
  var supportFormData = isNativeMethod(window.FormData);
  var supportArrayBuffer = isNativeMethod(window.ArrayBuffer);
  var supportSearchParams = isNativeMethod(window.URLSearchParams);
  var supportXDomainRequest = isNativeMethod(window.XDomainRequest);
  var supportBlob = isNativeMethod(window.FileReader) && isNativeMethod(window.Blob);
  var supportIterable = isNativeMethod(window.Symbol) && 'iterator' in window.Symbol;

  /**
   * @module headers
   * @license MIT
   * @version 2017/11/28
   */

  function normalizeName(name) {
    if (typeOf(name) !== 'string') {
      name = String(name);
    }

    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name');
    }

    return name.toLowerCase();
  }

  function normalizeValue(value) {
    if (typeOf(value) !== 'string') {
      value = String(value);
    }

    return value;
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var index = 0;
    var length = items.length;
    var iterator = {
      next: function() {
        var value = items[index++];

        return { done: index >= length, value: value };
      }
    };

    if (supportIterable) {
      iterator[Symbol.iterator] = function() {
        return iterator;
      };
    }

    return iterator;
  }

  /**
   * @class Headers
   * @param {Object} headers
   */
  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (headers) {
      for (var name in headers) {
        if (headers.hasOwnProperty(name)) {
          this.append(name, headers[name]);
        }
      }
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);

    var list = this.map[name];

    if (!list) {
      list = [];
      this.map[name] = list;
    }

    list.push(value);
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)];
    return values ? values[0] : null;
  };

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || [];
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name));
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)];
  };

  Headers.prototype.forEach = function(callback, context) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        this.map[name].forEach(function(value) {
          callback.call(context, value, name, this);
        }, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];

    this.forEach(function(value, name) {
      items.push(name);
    });

    return iteratorFor(items);
  };

  Headers.prototype.values = function() {
    var items = [];

    this.forEach(function(value) {
      items.push(value);
    });

    return iteratorFor(items);
  };

  Headers.prototype.entries = function() {
    var items = [];

    this.forEach(function(value, name) {
      items.push([name, value]);
    });

    return iteratorFor(items);
  };

  if (supportIterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  if (!supportHeaders) {
    window.Headers = Headers;
  }

  var Headers$1 = window.Headers;

  /**
   * @module body
   * @license MIT
   * @version 2017/11/28
   */

  if (supportArrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj);
    };

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
      };
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'));
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };

      reader.onerror = function() {
        reject(reader.error);
      };
    });
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);

    reader.readAsArrayBuffer(blob);

    return promise;
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);

    reader.readAsText(blob);

    return promise;
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }

    return chars.join('');
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0);
    } else {
      var view = new Uint8Array(buf.byteLength);

      view.set(new Uint8Array(buf));

      return view.buffer;
    }
  }

  function decode(body) {
    var form = new FormData();

    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });

    return form;
  }

  /**
   * @class Body
   */
  function Body() {
    this.bodyUsed = false;
  }

  Body.prototype._initBody = function(body) {
    this._bodyInit = body;

    if (!body) {
      this._bodyText = '';
    } else if (typeOf(body) === 'string') {
      this._bodyText = body;
    } else if (supportBlob && Blob.prototype.isPrototypeOf(body)) {
      this._bodyBlob = body;
    } else if (supportFormData && FormData.prototype.isPrototypeOf(body)) {
      this._bodyFormData = body;
    } else if (supportSearchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
      this._bodyText = body.toString();
    } else if (supportArrayBuffer && supportBlob && isDataView(body)) {
      this._bodyArrayBuffer = bufferClone(body.buffer);
      // IE 10-11 can't handle a DataView body.
      this._bodyInit = new Blob([this._bodyArrayBuffer]);
    } else if (supportArrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
      this._bodyArrayBuffer = bufferClone(body);
    } else {
      throw new Error('Unsupported BodyInit type');
    }

    if (!this.headers.get('content-type')) {
      if (typeOf(body) === 'string') {
        this.headers.set('content-type', 'text/plain;charset=UTF-8');
      } else if (this._bodyBlob && this._bodyBlob.type) {
        this.headers.set('content-type', this._bodyBlob.type);
      } else if (supportSearchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      }
    }
  };

  if (supportBlob) {
    Body.prototype.blob = function() {
      var rejected = consumed(this);

      if (rejected) {
        return rejected;
      }

      if (this._bodyBlob) {
        return Promise.resolve(this._bodyBlob);
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(new Blob([this._bodyArrayBuffer]));
      } else if (this._bodyFormData) {
        throw new Error('Could not read FormData body as blob');
      } else {
        return Promise.resolve(new Blob([this._bodyText]));
      }
    };

    Body.prototype.arrayBuffer = function() {
      if (this._bodyArrayBuffer) {
        return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
      } else {
        return this.blob().then(readBlobAsArrayBuffer);
      }
    };
  }

  Body.prototype.text = function() {
    var rejected = consumed(this);
    if (rejected) {
      return rejected;
    }

    if (this._bodyBlob) {
      return readBlobAsText(this._bodyBlob);
    } else if (this._bodyArrayBuffer) {
      return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
    } else if (this._bodyFormData) {
      throw new Error('could not read FormData body as text');
    } else {
      return Promise.resolve(this._bodyText);
    }
  };

  if (supportFormData) {
    Body.prototype.formData = function() {
      return this.text().then(decode);
    };
  }

  Body.prototype.json = function() {
    return this.text().then(JSON.parse);
  };

  /**
   * @module request
   * @license MIT
   * @version 2017/11/28
   */

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method;
  }

  /**
   * @class Request
   * @param {Request|string} input
   * @param {Object} options
   */
  function Request(input, options) {
    options = options || {};

    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read');
      }

      this.url = input.url;
      this.credentials = input.credentials;

      if (!options.headers) {
        this.headers = new Headers$1(input.headers);
      }

      this.method = input.method;
      this.mode = input.mode;

      if (!body && input._bodyInit !== null) {
        body = input._body;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'omit';

    if (options.headers || !this.headers) {
      this.headers = new Headers$1(options.headers);
    }

    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests');
    }

    this._initBody(body);
  }

  extend(Body, Request);

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit });
  };

  if (!supportRequest) {
    window.Request = Request;
  }

  var Request$1 = window.Request;

  /**
   * @module response
   * @license MIT
   * @version 2017/11/28
   */

  /**
   * @class Response
   * @param {any} body
   * @param {Object} options
   */
  function Response(body, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;

    // @see https://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
    if (this.status === 1223) {
      this.status = 204;
    }

    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = options.headers instanceof Headers$1 ? options.headers : new Headers$1(options.headers);
    this.url = options.url || '';

    this._initBody(body);
  }

  extend(Body, Response);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers$1(this.headers),
      url: this.url
    });
  };

  Response.error = function() {
    var response = new Response(null, { status: 0, statusText: '' });

    response.type = 'error';

    return response;
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code');
    }

    return new Response(null, { status: status, headers: { location: url } });
  };

  if (!supportResponse) {
    window.Response = Response;
  }

  var Response$1 = window.Response;

  /**
   * @module xdr
   * @license MIT
   * @version 2017/11/28
   */

  /**
   * @function XDR
   * @param {Request} request
   * @returns {XDomainRequest}
   * @see https://msdn.microsoft.com/en-us/library/cc288060(v=VS.85).aspx
   */
  function XDR(request) {
    var xdr = new XDomainRequest();

    bindEvents(xdr);

    if (typeOf(request.timeout) === 'number') {
      xdr.timeout = request.timeout;
    }

    return xdr;
  }

  /**
   * @module xhr
   * @license MIT
   * @version 2017/11/28
   */

  /**
   * @function XDR
   * @param {Request} request
   * @returns {XMLHttpRequest}
   */
  function XHR(request) {
    var xhr = new XMLHttpRequest();

    bindEvents(xhr);

    if (request.credentials === 'include') {
      xhr.withCredentials = true;
    } else if (request.credentials === 'omit') {
      xhr.withCredentials = false;
    }

    if ('responseType' in xhr && supportBlob) {
      xhr.responseType = 'blob';
    }

    return xhr;
  }

  /**
   * @module fetch
   * @license MIT
   * @version 2017/11/28
   */

  function parseHeaders(xhr) {
    var headers = new Headers$1();

    if (xhr.getAllResponseHeaders) {
      // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
      // https://tools.ietf.org/html/rfc7230#section-3.2
      var rawHeaders = xhr.getAllResponseHeaders() || '';
      var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');

      preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
    }

    return headers;
  }

  function responseURL(xhr) {
    if ('responseURL' in xhr) {
      return xhr.responseURL;
    }

    // Avoid security warnings on getResponseHeader when not allowed by CORS
    if (xhr.getResponseHeader && /^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
      return xhr.getResponseHeader('X-Request-URL');
    }
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request;

      if (!init && init instanceof Request$1) {
        request = input;
      } else {
        request = new Request$1(input, init);
      }

      var xhr = supportSearchParams ? new XDR(request) : new XHR(request);

      xhr.on('load', function(xhr) {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr),
          url: responseURL(xhr)
        };

        var body = 'response' in xhr ? xhr.response : xhr.responseText;

        resolve(new Response$1(body, options));
      });

      xhr.on('error', function() {
        reject(new TypeError('Network request failed'));
      });

      xhr.on('timeout', function() {
        reject(new TypeError('Network request timeout'));
      });

      xhr.open(request.method, request.url, true);

      if (xhr.setRequestHeader) {
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
      }

      xhr.send(request._body === undefined ? null : request._body);
    });
  }

  fetch.polyfill = true;

  if (!supportFetch) {
    window.fetch = fetch;
  }

}());
