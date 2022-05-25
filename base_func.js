"use strict";

// Returns the exploded byte array from ",".
function explodeBytes(input) {
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
	for (let c of explodeBytes(input)) {
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
	let chunks = explodeBytes(input);
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
async function hashHex(hashAlg, input) {
	// console.debug(hashAlg, input, input.length);
	if (isEmpty(hashAlg)) {
		throw new Error("No hash algorithm specified");
	}
	return arrayBufferToHex(await crypto.subtle.digest(hashAlg, await HexToArrayBuffer(input)));
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

// Returns string from the input string, where any control/non-printable characters
// are represented as a chiclet (including space).
// See also Mojibake (https://en.wikipedia.org/wiki/Mojibake)
function asciiExtToChiclets(string) {
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