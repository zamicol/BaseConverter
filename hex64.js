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
 * @param   {string} Hex         String. Hexrepresentation
 * @returns {ArrayBuffer}        ArrayBuffer. 
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
 * ArrayBufferToHex accepts an array buffer and returns a string of hex.
 * Taken from https://stackoverflow.com/a/50767210/1923095
 * 
 * @param {ArrayBuffer} buffer       str that is being converted to UTF8
 * @returns {string} hex             String with hex.  
 */
async function ArrayBufferToHex(buffer) {
	return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join('').toUpperCase();

	// Alternatively:
	// let hashArray = Array.from(new Uint8Array(digest)); // convert buffer to byte array
	// let hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// String to ASCII (utf-8) binary HEX string
function SToHex(input) {
	// console.debug(input);
	if (typeof input != 'string') {
		throw new TypeError('Input is not a string. Given type: ' + typeof input);
	}
	return input.split("").reduce((hex, c) => hex += c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"), "");
}

// ASCII (utf-8) binary HEX string to string
function HexToS(input) {
	if (typeof input != 'string') {
		throw new TypeError('input is not a string');
	}
	if (isEmpty(input)) {
		return ""; // empty is a valid input.
	}
	return input.match(/.{1,2}/g).reduce((acc, char) => acc + String.fromCharCode(parseInt(char, 16)), "");
}

/**
 * HexPadded accepts input, input alphabet, and alg and returns Hex.  Alg is
 * used to enforce padding. 
 * @param    {String} input       String. Number being converted.
 * @param    {String} inputBase   String. Input alphabet for input.
 * @param    {String} alg         String. Alg for specifying length of pad.
 * @returns  {String}             Base16 padded to alg's specified length.
 * @throws   {error}              Returns error on unsupported algs.
 */
function HexPadded(input, inputBase, alg) {
	let hex = BaseConvert(input, inputBase, Base16);
	switch (alg) {
		case 'ES256':
			return hex.padStart(64, "0");
		case "ES384":
			return hex.padStart(96, "0");
		case "ES512":
			return hex.padStart(128, "0");
		default:
			throw new Error("base_convert.HexPadded: unsupported alg");
	}
};


////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////
// RFC 4648 "base64"s
////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////

/**
 * ArrayBufferTo64ut Array buffer to b64ut.
 * 
 * @param   {ArrayBuffer}  buffer 
 * @returns {string}       String. base64ut.
 */
function ArrayBufferTo64ut(buffer) {
	var string = String.fromCharCode.apply(null, new Uint8Array(buffer));
	return base64t(URIUnsafeToSafe(btoa(string)));
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
 * @param   {string} hex    String. Hex representation.
 * @returns {string}        String. b64ut RFC 4648 URI safe truncated.
 */
async function HexTob64ut(hex) {
	let ab = await HexToArrayBuffer(hex);
	return await ArrayBufferTo64ut(ab);
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
 * B64utToS takes a b64ut string and decodes it back into a string.
 * "base64 uri truncated to string"
 * 
 * @param   {string} string 
 * @returns {string}
 */
function B64utToS(string) {
	// atob doesn't care about the padding character '='
	return atob(string.replace(/-/g, '+').replace(/_/g, '/'));
};

/**
 * SToUB64p takes a string and encodes it into a unsafe Base64 string.
 * "String to Unsafe Base64"
 * 
 * @param   {string}  string string
 * @returns {string}  Unsafe Base64 string
 */
function SToUB64p(string) {
	return btoa(string);
};

/**
 * UB64pToS takes an unsafe base64 string and decodes it back into a string.
 * "Unsafe base64 padded to String"
 * 
 * @param   {string} string Unsafe base64 padded string
 * @returns {string}
 */
function UB64pToS(string) {
	return atob(string);
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
 * URISafeToUnsafe converts any URI safe string to URI unsafe.  
 * 
 * @param   {string} b64ut 
 * @returns {string} ub64t
 */
function URISafeToUnsafe(ub64) {
	return ub64.replace(/-/g, '+').replace(/_/g, '/');
};

/**
 * base64t removes base64 padding if applicable.
 * @param   {string} base64 
 * @returns {string} base64t
 */
function base64t(base64) {
	return base64.replace(/=/g, '');
}

/**
 * TToP (truncated to padded) takes any base64 truncated string and adds padding
 * if appropriate.  
 * 
 * @param   {string} base64t 
 * @returns {string} base64p
 */
function TToP(base64) {
	var padding = base64.length % 4;
	switch (padding) {
		case 0:
			return base64;
		case 1:
			// malformed input, can only 0, 2, 3, or 4 characters, never 1.  
			console.error("input is invalid base64.");
			return;
		case 2:
			return base64 + "==";
		case 3:
			return base64 + "=";
	}
}