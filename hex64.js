"use strict";

/** BaseToHex converts base to Hex.
 * @param  {string} input         Input string.
 * @param  {string} inAlph        Input alphabet (i.e. 0123456789ABCDEF)
 * @param  {Hex}
 */
function BaseToHex(input, inAlph) {
	if (input === null || input === "" || input.length === 0) {
		return ""
	}
	if (inAlph !== Base16) {
		input = BaseConvert(input, inAlph, Base16);
	}
	if (input.length % 2 === 1) {
		input = input.padStart(input.length + 1, "0");
	}
	return input; // Hex is always padded. 
}

/**
 * Taken from https://github.com/LinusU/hex-to-array-buffer  MIT license
 * 
 * @param {string} Hex         String. Hexrepresentation
 * @returns {ArrayBuffer}      ArrayBuffer. 
 */
async function HexToArrayBuffer(hex) {
	if (typeof hex !== 'string') {
		throw new TypeError('base_convert.HexToArrayBuffer: Expected input to be a string')
	}

	if ((hex.length % 2) !== 0) {
		throw new RangeError('base_convert.HexToArrayBuffer: Expected string to be an even number of characters')
	}

	var view = new Uint8Array(hex.length / 2)

	for (var i = 0; i < hex.length; i += 2) {
		view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
	}

	return view.buffer
};

/**
 * arrayBufferToHex accepts an array buffer and returns a string of hex.
 * Taken from https://stackoverflow.com/a/50767210/1923095
 * @param {ArrayBuffer} buffer       str that is being converted to UTF8
 * @returns {string} hex             String with hex.  
 */
async function arrayBufferToHex(buffer) {
	return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join('').toUpperCase();
};

// String to ASCII (utf-8) binary HEX string
function stringToHex(input) {
	// console.debug(input);
	if (typeof input != 'string') {
		throw new TypeError('Input is not a string. Given type: ' + typeof input);
	}
	return input.split("").reduce((hex, c) => hex += c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"), "");
}

// ASCII (utf-8) binary HEX string to string
function hexToString(input) {
	if (typeof input != 'string') {
		throw new TypeError('input is not a string');
	}
	if (isEmpty(input)) {
		return ""; // empty is a valid input.
	}
	return input.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////  Base 64  /////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * HexToUb64p is Hex to RFC ub64p.  
 * 
 * @param   {string} Hex    String. Hex representation.
 * @returns {string}        String. ub64 RFC 4648 URI unsafe base 64 padded.
 */
function HexToUb64p(Hex) {
	// console.debug(Hex);
	if (Hex.length == 0) {
		return "";
	}
	let bytes = Hex.match(/\w{2}/g).map(function (a) {
		return String.fromCharCode(parseInt(a, 16));
	}).join("");
	return btoa(bytes);
}

/**
 * HexTob64ut is hex to "RFC 4648 URI Safe Truncated".  
 * 
 * @param {string} hex    String. Hex representation.
 * @returns {string}      String. b64ut RFC 4648 URI safe truncated.
 */
async function HexTob64ut(hex) {
	let ab = await HexToArrayBuffer(hex);
	return await ArrayBufferTo64ut(ab);
};

/**
 * base64t removes base64 padding if applicable.   
 * 
 * @param   {string} base64 
 * @returns {string} base64t
 */
function base64t(base64) {
	return base64.replace(/=/g, '');
}


/**
 * ArrayBufferTo64ut Array buffer to b64ut.
 * 
 * @param   {ArrayBuffer} buffer 
 * @returns {string}      String. base64ut.
 */
function ArrayBufferTo64ut(buffer) {
	var string = String.fromCharCode.apply(null, new Uint8Array(buffer));
	return base64t(URIUnsafeToSafe(btoa(string)));
};


/**
 * SToB64ut encodes a string as base64 URI truncated string.
 * "String to base64 uri truncated"
 * 
 * @param   {string} string 
 * @returns {string}
 */
function SToB64ut(string) {
	return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * URIUnsafeToSafe converts any URI unsafe string to URI safe.  
 * 
 * @param   {string} ub64t 
 * @returns {string} b64ut 
 */
function URIUnsafeToSafe(ub64) {
	return ub64.replace(/\+/g, '-').replace(/\//g, '_');
};

/**
 * B64ToHex takes any RFC 4648 base64 to Hex.
 * 
 * @param    {string} b64        RFC 4648 any base64.
 * @returns  {string}            Hex representation.
 */
function B64ToHex(b64) {
	//  console.debug(b64);
	let ub64 = URISafeToUnsafe(b64);
	const raw = atob(ub64);
	let result = '';
	for (let i = 0; i < raw.length; i++) {
		const hex = raw.charCodeAt(i).toString(16).toUpperCase();
		result += (hex.length === 2 ? hex : '0' + hex);
	}
	return result;
};

/**
 * URISafeToUnsafe converts any URI safe string to URI unsafe.  
 * 
 * @param   {string} b64ut 
 * @returns {string} ub64t
 */
function URISafeToUnsafe(ub64) {
	return ub64.replace(/-/g, '+').replace(/_/g, '/');
};

/**
 * Ub64pToString will convert RFC base64 to arbitrary strings.
 *
 * @param   {Element} string     Input or Output string Element.
 * @param   {Element} alpha      Input or Output alphabet Element.
 * @returns {string}             String. ub64 RFC 4648 URI unsafe base 64 padded.
 */
function Ub64pToString(string, alpha) {
	return baseConvert(B64ToHex(string.value), Base16, alpha.value);
}

/**
 * SToUB64p is any string to RFC ub64p.  
 *
 * @param   {String} hex    String. Hex from Input or Output.
 * @param   {String} alpha  String. Input or Output alphabet Element.
 * @returns {string}        String. ub64 RFC 4648 URI unsafe base 64 padded.
 */
function SToUB64p(hex, alpha) {
	// console.log(hex, alpha);
	if (alpha.value != base16) {
		hex = baseConvert(hex, alpha, Base16);
	}
	if (isOdd(hex)) {
		hex = hex.padStart(hex.length + 1, "0");
	}
	return HexToUb64p(hex);
}