 "use strict";

 // baseConvert converts a given string with a given encoding alphabet
 // 
 //
 // Base is assumed from alphabet sizes. 

 // LeftPadding is for preceding padding characters.  By default padding should be
 // ignored as it carries no meaning.  For example, for the base 7 alphabet of
 // "ABCDEFG", the padding character is "A". For the base 8 alphabet of
 // "01234567", the padding character is "0".  Padding characters are preserved
 // on a 1:1 character basis.  
 let LeftPadding = false;


 /**
  * baseConvert converts a given string with a given encoding alphabet
  * into another base with another given encoding alphabet.  
  * Base is assumed from alphabet sizes. 
  * @param  {string} string The string to be encoded into another base.  
  * @param  {string} inputAlphabet The characters of the input alphabet (i.e. 0123456789ABCDEF)
  * @param  {string} outputAlphabet The characters of the output alphabet (i.e. ABCDEFGHJKLMNPQRSTUVWXYZ234567)
  */
 function baseConvert(string, inputAlphabet, outputAlphabet) {
 	if (string == "" || inputAlphabet == "" || outputAlphabet == "") {
 		return null;
 	}

 	const add = (x, y, base) => {
 		let z = [];
 		const n = Math.max(x.length, y.length);
 		let carry = 0;
 		let i = 0;
 		while (i < n || carry) {
 			const xi = i < x.length ? x[i] : 0;
 			const yi = i < y.length ? y[i] : 0;
 			const zi = carry + xi + yi;
 			z.push(zi % base);
 			carry = Math.floor(zi / base);
 			i++;
 		}
 		return z;
 	}

 	const multiplyByNumber = (num, power, base) => {
 		if (num < 0) return null;
 		if (num === 0) return [];

 		let result = [];
 		while (true) {
 			num & 1 && (result = add(result, power, base));
 			num = num >> 1;
 			if (num === 0) break;
 			power = add(power, power, base);
 		}

 		return result;
 	}

 	const inputAlphabetChars = inputAlphabet.split('');

 	// decodeInput finds the position of each character in alphabet, thus decoding
 	// the input string into a useful array.  
 	const decodeInput = (string) => {
 		const digits = string.split('');
 		let arr = [];
 		for (let i = digits.length - 1; i >= 0; i--) {
 			// Check for character in alphabet
 			if (!(inputAlphabetChars.includes(digits[i]))) {
 				throw new Error('character not in alphabet: ' + digits[i]);
 			}
 			const n = inputAlphabet.indexOf(digits[i])
 			// Continue even if character is not found (possibly a padding character.)
 			if (n == -1) continue;
 			// Alternatively, fail on bad character
 			// if (n == -1) return null;
 			arr.push(n);
 		}
 		return arr;
 	}

 	const fromBase = inputAlphabet.length;
 	const toBase = outputAlphabet.length;
 	// TODO support Base 1 decoding.  
 	if (toBase == 1) return;
 	const digits = decodeInput(string);
 	if (digits === null) return null;

 	// Get an array of what each position of character should be. 
 	let outArray = [];
 	let power = [1];
 	for (let i = 0; i < digits.length; i++) {
 		outArray = add(outArray, multiplyByNumber(digits[i], power, toBase), toBase);
 		power = multiplyByNumber(fromBase, power, toBase);
 	}

 	// Finally, decode array into characters.  
 	let out = '';
 	// Preceding padding characters - Add back in preceding padding characters.
 	if (LeftPadding) {
 		let inPad = inputAlphabet.charAt(0);
 		let outPad = outputAlphabet.charAt(0);
 		let i = 0;
 		while (i < string.length) {
 			if (string.charAt(i) !== inPad) break;
 			out += outPad;
 			i++;
 		}
 	}

 	for (let i = outArray.length - 1; i >= 0; i--) {
 		out += outputAlphabet[outArray[i]];
 	}

 	return out;
 }


 /**
  * Get how many bits are needed to represent a particular number base
  * @param  {Number} base The length of the characters of the alphabet (the base,
  * e.g. for base 64 would be the number 64 and the output would be 6)
  * @returns {number} The number of bits required to represent the base.  
  */
 function bitPerBase(base) {
 	var bits = 0;
 	var space = 1;

 	while (base > space) {
 		space = space * 2;
 		bits++;
 	}

 	return bits;
 }

 /**
  * Convert a hex string to a byte array
  * @param   {String}  hex  String, encoded in uppercase hex.
  * @returns {String}  Go Bytes representation.
  */
 function hexToGoBytesString(hex) {
 	for (var bytes = [], i = 0; i < hex.length; i += 2)
 		bytes.push(parseInt(hex.substr(i, 2), 16)); // .substring does not return same results
 	return "[" + bytes + "]";
 }

 // convert a Unicode string to a string in which
 // each 16-bit unit occupies only one byte
 function toBinary(string) {
 	const codeUnits = new Uint16Array(string.length);
 	for (let i = 0; i < codeUnits.length; i++) {
 		codeUnits[i] = string.charCodeAt(i);
 	}
 	const charCodes = new Uint8Array(codeUnits.buffer);
 	let result = '';
 	for (let i = 0; i < charCodes.byteLength; i++) {
 		result += String.fromCharCode(charCodes[i]);
 	}
 	return result;
 }

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
  * HexTob64ut is hex to "RFC 4648 URI Safe Truncated".  
  * 
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
