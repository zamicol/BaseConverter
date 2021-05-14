"use strict";

// baseConvert converts a given string with a given encoding alphabet
// 
//
// Base is assumed from alphabet sizes. 

// Padding is for preceeding padding characters.  By default padding should be
// ignored as it carries no meaning.  For example, for the base 7 alphabet of
// "ABCDEFG", the padding character is "A". For the base 8 alphabet of
// "01234567", the padding character is "0".  Padding characters are preserved
// on a 1:1 character basis.  
let Padding = false;


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

	// decodeInput finds the position of each character in alphabet, thus decoding
	// the input string into a useful array.  
	const decodeInput = (string) => {
		const digits = string.split('');
		let arr = [];
		for (let i = digits.length - 1; i >= 0; i--) {
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
	// Preceding padding characters - Add back in preceeding padding characters.
	if(Padding){
		let inPad = inputAlphabet.charAt(0);
		let outPad = outputAlphabet.charAt(0);
		let i=0;
		while(i<string.length){
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