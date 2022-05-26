"use strict";

// Returns the exploded byte array from ",".
function ExplodeBytes(input) {
	if (input.charAt(0) != "[" && input.charAt(0) != "{") {
		throw new SyntaxError("not in correct byte format: [255, ...]");
	}
	// Supports trailing comma (but returns it removed).
	if (input.charAt(input.length - 2) == ",") {
		return input.substring(1, input.length - 2).split(",");
	}
	return input.substring(1, input.length - 1).split(",");
}

/**
 * Convert from a Go Bytes representation, to string.
 * @param   {String}  input      String, Go Bytes representation as a string.
 * @returns {String}             String. 
 * @throws  {error}   error      Error.  Syntax error.
 */
function GoBytesToString(input) {
	let unicode = "";
	for (let c of ExplodeBytes(input)) {
		unicode += String.fromCodePoint(c);
	}
	return unicode;
}

/**
 * Convert from a Go Bytes representation, to Hex.
 * Empty bytes will return "".
 * @param   {String}  input         String, Go Bytes representation as a string.
 * @returns {Hex}                   String.
 * @throws  {error}   error         Error.  Syntax error.
 */
function GoBytesToHex(input) {
	let hex = "";
	let chunks = ExplodeBytes(input);
	// Empty bytes check
	if (chunks.length == 1 && isEmpty(chunks[0])) {
		return hex;
	}
	for (let c of chunks) {
		hex += parseInt(c).toString(16).toUpperCase().padStart(2, "0");
	}
	return hex;
}

// Returns the Hex string in the Hex line from a correctly formatted SysCnv conversion.
function SysCnvToHex(inputText) {
	let hexLine = inputText.split("\n", 1)[0];
	if (hexLine.substring(0, 4) != "Hex:") {
		throw new SyntaxError('Not in the correct SysCnv format.');
	}
	return hexLine.split(' ', 2)[1];
}

// Returns the digest (in Hex) from the given Hex input and hash alg. Throws.
async function HashHex(hashAlg, input) {
	// console.debug(hashAlg, input, input.length);
	if (isEmpty(hashAlg)) {
		throw new Error("No hash algorithm specified");
	}
	return ArrayBufferToHex(await crypto.subtle.digest(hashAlg, await HexToArrayBuffer(input)));
}

/**
 * Convert a hex string to a byte array
 * @param   {String}  hex  String, encoded in uppercase hex.
 * @returns {String}  Go Bytes representation.
 */
function HexToGoBytesString(hex) {
	for (var bytes = [], i = 0; i < hex.length; i += 2)
		bytes.push(parseInt(hex.substr(i, 2), 16)); // .substring does not return same results
	return "[" + bytes + "]";
}

/**
 * Get how many bits are needed to represent a particular number base
 * @param  {Number} base The length of the characters of the alphabet (the base,
 * e.g. for base 64 would be the number 64 and the output would be 6)
 * @returns {number} The number of bits required to represent the base.  
 */
function BitPerBase(base) {
	var bits = 0;
	var space = 1;

	while (base > space) {
		space = space * 2;
		bits++;
	}
	return bits;
}

// Returns string from the input string, where any control/non-printable characters
// are represented as a chiclet (including space).
// See also Mojibake (https://en.wikipedia.org/wiki/Mojibake)
function ASCIIExtToChiclets(string) {
	let outString = "";
	for (let char of string) {
		if (ASCIIExtCTRLNPChars.includes(char)) {
			outString += '';
			continue;
		}
		outString += char;
	}
	return outString;
}

// TODO Not in use and not working
// RemovePad is a helper function removes pad but not the single zero case.
function RemovePad(input, inAlph) {
	// console.debug("RemovePad", input, inAlph);
	if (input.length == 1) {
		return input;
	}
	// Remove padding characters
	let inPad = inAlph.charAt(0);
	for (var i = 0; i < input.length; i++) {
		if (input.charAt(i) !== inPad) {
			break;
		}
	}
	return input.substring(i);
}

/**
 * Converts a string to an ArrayBuffer.
 * @param  {string}       string
 * @return {ArrayBuffer}
 */
async function SToArrayBuffer(string) {
	var enc = new TextEncoder(); // Suppose to be always in UTF-8
	let uint8array = enc.encode(string);
	//return uint8array;
	let ab = uint8array.buffer;

	// Alternative to using text encoder, but this looks wrong: 
	// var len = string.length;
	// var bytes = new Uint8Array(len);
	// for (var i = 0; i < len; i++) {
	// 	bytes[i] = string.charCodeAt(i);
	// }
	// let b = await bytes.buffer;

	return ab;
};

/**
 * Converts an ArrayBuffer to a UTF-8 string.   
 *
 * @param {string} string
 * @return {string}
 */
async function ArrayBufferToS(ab) {
	var enc = new TextDecoder("utf-8");
	let s = await enc.decode(ab);
	return s;
};

/**
 * ToUTF8Array accepts a string and returns the utf8 encoding of the string.
 * https://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
 * @param {string} str         str that is being converted to UTF8
 * @returns {number[]} utf8    utf8 is the number array returned from the input string.
 */
function ToUTF8Array(str) {
	var utf8 = [];
	for (var i = 0; i < str.length; i++) {
		var charcode = str.charCodeAt(i);
		if (charcode < 0x80) utf8.push(charcode);
		else if (charcode < 0x800) {
			utf8.push(0xc0 | (charcode >> 6),
				0x80 | (charcode & 0x3f));
		} else if (charcode < 0xd800 || charcode >= 0xe000) {
			utf8.push(0xe0 | (charcode >> 12),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f));
		}
		// surrogate pair
		else {
			i++;
			// UTF-16 encodes 0x10000-0x10FFFF by
			// subtracting 0x10000 and splitting the
			// 20 bits of 0x0-0xFFFFF into two halves
			charcode = 0x10000 + (((charcode & 0x3ff) << 10) |
				(str.charCodeAt(i) & 0x3ff));
			utf8.push(0xf0 | (charcode >> 18),
				0x80 | ((charcode >> 12) & 0x3f),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f));
		}
	}
	return utf8;
};

//https://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function encode_utf8(s) {
	return unescape(encodeURIComponent(s));
};

function decode_utf8(s) {
	return decodeURIComponent(escape(s));
};