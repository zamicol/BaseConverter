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
* @param   {string} input     Input string.  
* @param   {string} inAlph    Input alphabet (i.e. 0123456789ABCDEF)
* @param   {string} outAlph   Output alphabet (i.e. ABCDEFGHJKLMNPQRSTUVWXYZ234567)
* @returns {string}           output number
*/
 function BaseConvert(input, inAlph, outAlph) {
 	console.log("baseConvert: ", input, inAlph, outAlph);
 	if (input === null || input == "" || inAlph == "" || outAlph == "") {
 		return null;
 	}

 	const fromBase = inAlph.length;
 	const toBase = outAlph.length;
 	const inAlphChars = inAlph.split('');

 	// if(fromBase == 1){
 	// 	console.log("In Unary Case Hit");
 	// }

 	// // TODO support base 1/ unary encoding decoding.  
 	// if (toBase == 1) {
 	// 	console.log("Out Unary Case Hit");
 	// 	//return "1".repeat(parseInt(decimal)); // TODO possibly add to BaseConvert
 	// }




 	const add = (x, y, base) => {
 		// For base-1, just concatenate the arrays since each digit can only be 1
 		if (base === 1) {
 			return [...x, ...y];
 		}


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


 		// For base-1, multiplication is just repetition
 		if (base === 1) {
 			let result = [];
 			for (let i = 0; i < num; i++) {
 				result.push(...power);
 			}
 			return result;
 		}

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
 		const digits = input.split('');
 		let arr = [];
 		for (let i = digits.length - 1; i >= 0; i--) {
 			// Check for character in alphabet
 			if (!(inAlphChars.includes(digits[i]))) {
 				throw new Error('character not in alphabet: ' + digits[i]);
 			}
 			const n = inAlph.indexOf(digits[i])
 			// Continue even if character is not found (possibly padding character,
 			// see check above.)
 			if (n == -1) continue;
 			arr.push(n);
 		}
 		return arr;
 	}

 	const digits = decodeInput(input);
 	if (digits == []) return null; // zero case is legit.
 	let outArray = []; // Array of character position.
 	let power = [1];
 	for (let i = 0; i < digits.length; i++) {
 		outArray = add(outArray, multiplyByNumber(digits[i], power, toBase), toBase);
 		power = multiplyByNumber(fromBase, power, toBase);
 	}

 	// Finally, decode array into characters.  
 	let out = '';
 	// Add back left (preceding) padding characters.
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
 	// console.log(out);
 	return out;
 }