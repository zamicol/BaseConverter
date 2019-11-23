"use strict";


// arbitraryBaseConvert converts a given string with a given encoding alphabet
// into another base with another given encoding alphabet.  
//
// Base is assumed from alphabet sizes. 
function arbitraryBaseConvert(string, srcAlphabet, dstAlphabet) {

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
		if (num == 0) return [];

		let result = [];
		while (true) {
			num & 1 && (result = add(result, power, base));
			num = num >> 1;
			if (num === 0) break;
			power = add(power, power, base);
		}

		return result;
	}

	// decodeInput finds the position of each character in alphabet, thus
	// decoding the input string into a useful array.  
	const decodeInput = (string) => {
		const digits = string.split('');
		let arr = [];
		for (let i = digits.length - 1; i >= 0; i--) {
			const n = srcAlphabet.indexOf(digits[i])
			if (n == -1) return null;
			arr.push(n);
		}
		return arr;
	}

	const fromBase = srcAlphabet.length;
	const toBase = dstAlphabet.length;
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
	for (let i = outArray.length - 1; i >= 0; i--){
		out += dstAlphabet[outArray[i]];
	}
		

	return out;
}