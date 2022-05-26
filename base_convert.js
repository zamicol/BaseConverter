 "use strict";

 // baseConvert converts a given string with a given encoding alphabet
 // 
 //
 // Base is assumed from alphabet sizes. 

 // LeftPadding is for preceding padding characters.  By default padding should
 // be ignored as it carries no meaning.  For example, for the base 7 alphabet
 // of "ABCDEFG", the padding character is "A". For the base 8 alphabet of
 // "01234567", the padding character is "0".  Padding characters are preserved
 // on a 1:1 character basis.  
 let LeftPadding = false;

 /**
  * BaseConvert converts a given string with a given encoding alphabet into
  * another base with another given encoding alphabet.  
  * Base is assumed from alphabet sizes. 
  *
  * @param  {string} input     Input string.  
  * @param  {string} inAlph    Input alphabet (i.e. 0123456789ABCDEF)
  * @param  {string} outAlph   Output alphabet (i.e. ABCDEFGHJKLMNPQRSTUVWXYZ234567)
  */
 function BaseConvert(input, inAlph, outAlph) {
 	//console.log("baseConvert: ", input, inAlph, outAlph);
 	if (input === null || input == "" || inAlph == "" || outAlph == "") {
 		return null;
 	}

 	const fromBase = inAlph.length;
 	const toBase = outAlph.length;
 	const inAlphChars = inAlph.split('');
 	// TODO support Base 1 decoding.  
 	if (toBase == 1) return;

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
 		if (num === 0) return [0]; // Zero is legit. 

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
 	// input into a useful array.  
 	const decodeInput = (input) => {
 		// console.log("decodeInput: ", string);
 		const digits = input.split('');
 		let arr = [];
 		for (let i = digits.length - 1; i >= 0; i--) {
 			// Check for character in alphabet
 			if (!(inAlphChars.includes(digits[i]))) {
 				throw new Error('character not in alphabet: ' + digits[i]);
 			}
 			const n = inAlph.indexOf(digits[i])
 			// Continue even if character is not found (possibly a padding character.)
 			if (n == -1) continue;
 			// Alternatively, fail on bad character
 			// if (n == -1) return null;
 			arr.push(n);
 		}
 		return arr;
 	}

 	const digits = decodeInput(input);
 	if (digits === null) return null; // zero case is legit.  
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
 		let inPad = inAlph.charAt(0);
 		let outPad = outAlph.charAt(0);
 		let i = 0;
 		while (i < input.length) {
 			if (input.charAt(i) !== inPad) break;
 			out += outPad;
 			i++;
 		}
 	}

 	for (let i = outArray.length - 1; i >= 0; i--) {
 		out += outAlph[outArray[i]];
 	}

 	return out;
 }