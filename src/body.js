/**
 * @module body
 * @license MIT
 * @version 2017/11/28
 */

import { typeOf } from './utils';
import { supportBlob, supportFormData, supportSearchParams, supportArrayBuffer } from './support';

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

  /**
   * @function isDataView
   * @param {Object} object
   */
  var isDataView = function(object) {
    return object && DataView.prototype.isPrototypeOf(object);
  };

  /**
   * @function isArrayBufferView
   * @param {Object} object
   */
  var isArrayBufferView =
    ArrayBuffer.isView ||
    function(object) {
      return object && viewClasses.indexOf(Object.prototype.toString.call(object)) > -1;
    };
}

/**
 * @function consumed
 * @param {Body} body
 */
function consumed(body) {
  if (body.bodyUsed) {
    return Promise.reject(new TypeError('Already read'));
  }

  body.bodyUsed = true;
}

/**
 * @function fileReaderReady
 * @param {FileReader} reader
 * @returns {Promise}
 */
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

/**
 * @function readBlobAsArrayBuffer
 * @param {Blob} blob
 * @returns {Promise}
 */
function readBlobAsArrayBuffer(blob) {
  var reader = new FileReader();
  var promise = fileReaderReady(reader);

  reader.readAsArrayBuffer(blob);

  return promise;
}

/**
 * @function readBlobAsText
 * @param {Blob} blob
 * @returns {Promise}
 */
function readBlobAsText(blob) {
  var reader = new FileReader();
  var promise = fileReaderReady(reader);

  reader.readAsText(blob);

  return promise;
}

/**
 * @function readArrayBufferAsText
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function readArrayBufferAsText(buffer) {
  var view = new Uint8Array(buffer);
  var chars = new Array(view.length);

  for (var i = 0; i < view.length; i++) {
    chars[i] = String.fromCharCode(view[i]);
  }

  return chars.join('');
}

/**
 * @function bufferClone
 * @param {ArrayBuffer} buffer
 * @returns {ArrayBuffer}
 */
function bufferClone(buffer) {
  if (buffer.slice) {
    return buffer.slice(0);
  } else {
    var view = new Uint8Array(buffer.byteLength);

    view.set(new Uint8Array(buffer));

    return view.buffer;
  }
}

/**
 * @function decode
 * @param {string} body
 * @returns {FormData}
 */
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
 * @constructor
 */
export default function Body() {
  this.bodyUsed = false;
}

/**
 * @method _initBody
 * @private
 * @param {any} body
 */
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

  if (!this.headers.get('Content-Type')) {
    if (typeOf(body) === 'string') {
      this.headers.set('Content-Type', 'text/plain;charset=UTF-8');
    } else if (this._bodyBlob && this._bodyBlob.type) {
      this.headers.set('Content-Type', this._bodyBlob.type);
    } else if (supportSearchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
      this.headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    }
  }
};

if (supportBlob) {
  /**
   * @method blob
   * @returns {Promise}
   */
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
      throw Promise.reject(new Error('Could not read FormData body as blob'));
    } else {
      return Promise.resolve(new Blob([this._bodyText]));
    }
  };

  /**
   * @method arrayBuffer
   * @returns {Promise}
   */
  Body.prototype.arrayBuffer = function() {
    if (this._bodyArrayBuffer) {
      return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
    } else {
      return this.blob().then(readBlobAsArrayBuffer);
    }
  };
}

/**
 * @method text
 * @returns {Promise}
 */
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
    throw Promise.reject(new Error('Could not read FormData body as text'));
  } else {
    return Promise.resolve(this._bodyText);
  }
};

if (supportFormData) {
  /**
   * @method formData
   * @returns {Promise}
   */
  Body.prototype.formData = function() {
    return this.text().then(decode);
  };
}

/**
 * @method json
 * @returns {Promise}
 */
Body.prototype.json = function() {
  return this.text().then(JSON.parse);
};
