"use strict";

// Many of these are not in use.  
const Base2 = document.getElementById('base2').value;
const Base4 = document.getElementById('base4').value;
const Base4DNA = document.getElementById('base4').value;
const Base8 = document.getElementById('base8').value;
const Base10 = document.getElementById('base10').value;
const Base12 = document.getElementById('base12').value;
const Base16 = document.getElementById('base16').value;
const Base16Lower = document.getElementById('base16_lower').value;
const base20 = document.getElementById('base20').value;
const base32 = document.getElementById('base32').value;
const zBase32 = document.getElementById('zbase32').value;
const base58 = document.getElementById('base58').value;
const base64 = document.getElementById('base64UriSafe').value;
const base64UriUnsafe = document.getElementById('base64UriUnsafe').value;
const base85 = document.getElementById('base85').value;
const base91 = document.getElementById('base91').value;
const base128 = document.getElementById('base128').value;
const base256 = document.getElementById('base256').value;


// Application element variables that remain constant, but have inner
// elements/values that will change or be modified.
// In Elements

var inAlphElem;
var inAlphLenElem;
var inBitsElem;
var inElem;
var inLenElem;

// Out Elements
var outAlphElem;
var outAlphLenElem;
var outBitsElem;
var outElem;
var outLenElem;

// Other  elements
var alertDivElement;
var alertMsgElement;
var lpadElem;
var diceSidesElem;

document.addEventListener('DOMContentLoaded', () => {
	// In Elements
	inElem = document.getElementById("inputString");
	inAlphElem = document.getElementById("inputAlphabet");
	inBitsElem = document.getElementById("inputBitsNeeded");
	inLenElem = document.getElementById("inputStringLength");
	inAlphLenElem = document.getElementById("inputAlphabetLength");
	// Out Elements
	outElem = document.getElementById("outputString");
	outAlphElem = document.getElementById("outputAlphabet");
	outBitsElem = document.getElementById("outputBitsNeeded");
	outLenElem = document.getElementById('outputStringLength');
	outAlphLenElem = document.getElementById('outputAlphabetLength');
	// Other Elements
	diceSidesElem = document.getElementById('numberOfDiceSides');
	lpadElem = document.querySelector("#PadCheckbox");
	alertDivElement = document.getElementById('alertErrorDiv');
	alertMsgElement = document.getElementById('alertErrorMsg');

	document.querySelector("#ConvertBaseBtn").addEventListener('click', Convert);
	document.getElementById('alertErrorCloseBtn').addEventListener('click', ClearErrAlert);
	document.querySelector("#FlipBtn").addEventListener('click', Flip);
	document.querySelector("#ClearBtn").addEventListener('click', Clear);
	document.querySelector("#reverseInBtn").addEventListener('click', ReverseIn);
	document.querySelector("#reverseOutBtn").addEventListener('click', ReverseOut);
	lpadElem.addEventListener('click', Convert);

	document.getElementById('HashAlgoOptions').addEventListener('click', () => {
		DefaultIn("text");
		outAlphElem.value = "Hash:" + document.getElementById('HashAlgoOptions').value
		Convert();
	});
	document.querySelector('#SysCnvBtn').addEventListener('click', () => {
		outAlphElem.value = "SysCnv";
		DefaultIn("hex");
		Convert();
	});
	document.querySelector('#DNDConvertInBtn').addEventListener('click', () => {
		inAlphElem.value = "DND:" + diceSidesElem.value;
		DefaultOut("Hex");
		Convert();
	});
	document.querySelector('#DNDConvertOutBtn').addEventListener('click', () => {
		outAlphElem.value = "DND:" + diceSidesElem.value;
		DefaultIn("Hex")
		Convert();
	});
	document.querySelector('#base64InBtn').addEventListener('click', () => {
		DefaultOut("Hex");
		inAlphElem.value = "base64";
		Convert();
	});
	document.querySelector('#b64utOutBtn').addEventListener('click', () => {
		DefaultIn("Hex");
		outAlphElem.value = "ub64t";
		Convert();
	});
	document.querySelector('#ub64pOutBtn').addEventListener('click', () => {
		DefaultIn("Hex");
		outAlphElem.value = "ub64p";
		Convert();
	});
	document.getElementById('majusculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outAlphElem.value = "Majuscule";
		Convert();
	});
	document.getElementById('minisculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outAlphElem.value = "Miniscule";
		Convert();
	});
	document.getElementById('ridiculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outAlphElem.value = "Ridicule";
		Convert();
	});

	// Buttons on "Useful Alphabets"
	document.querySelectorAll(".copy").forEach(t => {
		t.addEventListener('click', Copy);
	});
	document.querySelectorAll(".source").forEach(t => {
		t.addEventListener('click', Source);
	});
	document.querySelectorAll(".destination").forEach(t => {
		t.addEventListener('click', Destination);
	});
	//////////////////
	// Examples
	//////////////////
	document.querySelector("#Example64To256Btn").addEventListener('click', () => {
		// Out is "Hello World!"
		GUIConvert(base64, "SGVsbG8gV29ybGQh", base256);
	});

	document.querySelector("#ExampleDNAToJSONBtn").addEventListener('click', () => {
		// Out is {"Hello":"World!"}
		GUIConvert("ACGT", "CTGTAGAGCAGACGCCCGTACGTACGTTAGAGATGGAGAGCCCTCGTTCTAGCGTACGCAAGACAGAGCTTC", base256);
	});

	// // TODO when right padding is implemented.  
	// document.querySelector("#Example256to32Btn").addEventListener('click', () => {
	// 	// Out should be MZXW6YTBOI======
	// 	// Or without replacing the padding characters: MZXW6YTBOIAAAAAA
	// 	// Example from https://tools.ietf.org/html/rfc4648#section-10
	// 	GUIConvert(base256, "foobarĀĀĀĀ", base32);
	// 	Convert();
	// });


	//////////////////
	// URI parameters
	//////////////////
	/** @type {FormParameter} */
	let formParams = [{
			"name": "inAlph",
			"id": "inputAlphabet"
		},
		{
			"name": "in",
			"id": "inputString",
		},
		{
			"name": "outAlph",
			"id": "outputAlphabet",
		},
		{
			"name": "lpad",
			"id": "PadCheckbox",
			"type": "bool",
		}
	];

	document.querySelector("#ShareBtn").addEventListener('click', () => ShareURI(formParams));
	PopulateFromURI(formParams);

	//////////////////
	// Live Update Conversion
	//////////////////
	// "change" doesn't work. "input" doesn't seem to cover all cases of user interaction. 
	inElem.addEventListener('input', Convert);
	inAlphElem.addEventListener('input', Convert);
	outAlphElem.addEventListener('input', Convert);


	// Finally, convert.  
	Convert();
});

// Helper that sets inAlph if not set. 
function DefaultIn(input) {
	if (isEmpty(inAlphElem.value)) {
		inAlphElem.value = input;
	}
}
// Helper that sets outAlph if not set. 
function DefaultOut(output) {
	if (isEmpty(outAlphElem.value)) {
		outAlphElem.value = output;
	}
}

// Flips Input and Output's alphabet and text area.
function Flip() {
	let inputAlphabet = inAlphElem.value;
	let inputString = inElem.value;
	let outputAlphabet = outAlphElem.value;
	let outputString = outElem.value;

	inAlphElem.value = outputAlphabet;
	inElem.value = outputString;
	outAlphElem.value = inputAlphabet;
	outElem.value = inputString;

	Update();
}

// Reverses the input area text
function ReverseIn() {
	reverse(inElem);
}
// Reverses the output area text
function ReverseOut() {
	reverse(outElem);
}
// Reverses the input or output area text.
function reverse(element) {
	let output = element.value;
	if (isJson(output) && Array.isArray(JSON.parse(output))) {
		element.value = "[" + JSON.parse(output).reverse() + "]";
		return;
	}
	element.value = element.value.split("").reverse().join("");
}

// Clears out the Input and Output's alphabets and text areas.
function Clear() {
	inAlphElem.value = "";
	inElem.value = "";
	outAlphElem.value = "";
	outElem.value = "";
	Update();
}


// GUIConvert populates the GUI and calls Convert();
async function GUIConvert(inAlph, input, outAlph) {
	inAlphElem.value = inAlph;
	inElem.value = input;
	outAlphElem.value = outAlph;
	Convert();
}

// Converts the input text area from the input alphabet to the output alphabet.
async function Convert() {
	try {
		ClearErrAlert();

		let outputAlphabet = outAlphElem.value;
		let inputAlpha = inAlphElem.value;
		let inputString = inElem.value;

		// Set padding Setting
		if (lpadElem.checked == true) {
			LeftPadding = true;
		} else {
			LeftPadding = false;
		}

		if (inputAlpha == "" || outputAlphabet == "") {
			console.debug("Empty input alph or output alph.");
			Update();
			return;
		}

		/////////////////////
		// Input
		/////////////////////
		// Convert Keywords
		if (isKeyword(inputAlpha)) {
			inputString = KeywordToHex(inputAlpha, inputString);
			inputAlpha = Base16;
		}
		if (inputString === null || inputString === undefined) { // sanitize null/undefined, "0" is legit.  
			inputString = "";
		}

		/////////////////////
		// Output
		/////////////////////
		let out = "";
		if (!isKeyword(outputAlphabet)) {
			out = BaseConvert(inputString, inputAlpha, outputAlphabet);
		} else {
			// All keywords accept Hex.  If coming from keyword, input and inputAlpha
			// are already Hex.  Otherwise, convert to Hex.
			inputString = BaseToHex(inputString, inputAlpha);
			inputAlpha = Base16;

			let keyword = outputAlphabet;
			if (outputAlphabet.substring(0, 5) == "Hash:") {
				keyword = "Hash";
				var hashAlg = outputAlphabet.substring(5);
			} else if (outputAlphabet.substring(0, 4) == "DND:") {
				keyword = "DND";
				var diceSides = outputAlphabet.substring(4);
			}
			// console.debug(keyword);
			switch (keyword) {
				case "SysCnv":
					out = "Hex: " + inputString +
						"\nRFC base64 uri padded: " + HexToUb64p(inputString) +
						"\nGo Bytes: " + hexToGoBytesString(inputString) +
						"\nbase 128: " + BaseConvert(inputString, Base16, Base128);
					break;
				case "Hash":
					out = await hashHex(hashAlg, inputString);
					break;
				case "bytes":
					out = hexToGoBytesString(inputString);
					break;
				case "base64":
				case "b64":
				case "ubase64p":
				case "ub64p":
				case "base64up":
				case "b64up":
					out = HexToUb64p(inputString);
					break;
				case "ubase64t":
				case "ub64t":
				case "base64ut":
				case "b64ut":
					out = await ArrayBufferTo64ut(await HexToArrayBuffer(inputString));
					break;
				case "DND":
					out = baseToDND(inputString, inputAlpha, diceSides);
					break;
				case "string":
				case "text":
					out = await hexToString(inputString);
					break;
				case "Hex":
					out = inputString;
					break;
				case "hex":
					out = hexPadded(BaseConvert(inputString, Base16, Base16Lower));
					break;
				case "Majuscule":
					out = inElem.value.toUpperCase(); // Use original string, and not Hex representation.
					break;
				case "Miniscule":
					out = inElem.value.toLowerCase();
					break;
				case "Ridicule":
					out = RidiculeCasingGUI(inElem.value);
					break;
				default:
					throw new Error("Keyword not supported for Output");
			}
		}

		outElem.value = out;
	} catch (error) {
		console.debug(error);
		alertMsgElement.textContent = error;
		alertDivElement.hidden = false;
	}
	Update(); // Update lengths even on error. 
}

/**
 * KeywordToHex is for generalizing an input alphabet keyword into a
 * Hex string representation.
 * Returns the intermediate base representation for the input (Hex).
 * @param   {String}   inAlph        String. Input Alphabet/Keyword for switching.
 * @param   {String}   input         String. Input to be converted.
 * @returns {String}   intermediate  String. Hex
 * @throws  {Error}                  Error.  Error when no dice sides specified.
 */
function KeywordToHex(inAlph, input) {
	if (inAlph.substring(0, 4) == "DND:") {
		var diceSides = inAlph.substring(4);
		if (isEmpty(diceSides)) {
			throw new Error("Must specify number of dice sides. Given: " + diceSides);
		}
		inAlph = "DND";
	}

	switch (inAlph) {
		case "DND":
			return BaseToHex(dndToDecimal(diceSides), Base10);
		case "bytes":
			return GoBytesToHex(input);
		case "SysCnv":
			return cyphrmeToHex(input);
		case "base64":
		case "b64":
		case "base64up":
		case "b64up":
		case "ubase64p":
		case "ub64p":
		case "base64ut":
		case "b64ut":
		case "ubase64t":
		case "ub64t":
			return B64ToHex(input);
		case "hex":
			return BaseConvert(input, inAlph, Base16);
		case "Hex":
			return input;
		case "string":
		case "text":
			return stringToHex(input);
		default:
			throw new Error('Keyword unsupported.');
	}
}

////////////////////
// Alphabet Buttons.  (copy, in, out)
////////////////////
// Copies the alphabet from the row.
function Copy() {
	let input = this.parentElement.parentElement.querySelector('input');
	input.select();
	input.setSelectionRange(0, 99999);
	document.execCommand("copy");
}

// Updates the Input/Source Alphabet with a given alphabet.
function Source() {
	inAlphElem.value = this.parentElement.parentElement.querySelector('input').value;
	Update();
}

// updates the Output Alphabet with a given alphabet.
function Destination() {
	outAlphElem.value = this.parentElement.parentElement.querySelector('input').value;
	Update();
}

// clears out the error message, and hides the alert.
function ClearErrAlert() {
	alertDivElement.hidden = true;
	alertMsgElement.textContent = "";
}



// Update updates all information presented on the screen.  
// Except share link, for the worry that could slow down things too much. 
function Update() {
	let upObj = bitsBaseLengthGUI(inAlphElem.value, inElem.value);
	inBitsElem.textContent = upObj.bits;
	inAlphLenElem.textContent = upObj.base;
	inLenElem.textContent = upObj.length;

	upObj = bitsBaseLengthGUI(outAlphElem.value, outElem.value, outBitsElem, outAlphLenElem, outLenElem);
	outBitsElem.textContent = upObj.bits;
	outAlphLenElem.textContent = upObj.base;
	outLenElem.textContent = upObj.length;
}


// Returns the Hex string in the Hex line from a correctly formatted SysCnv conversion.
function cyphrmeToHex(input) {
	let hexLine = input.split("\n", 1)[0];
	if (hexLine.substring(0, 4) != "Hex:") {
		throw new Error('Not in the correct SysCnv format.');
	}
	return hexLine.split(' ', 2)[1];
}

// Returns the digest (in Hex) from the given Hex input and hash alg. Throws.
async function hashHex(hashAlg, input) {
	// console.debug(hashAlg, input);
	if (isEmpty(hashAlg)) {
		throw new Error("No hash algorithm specified");
	}
	return arrayBufferToHex(await crypto.subtle.digest(hashAlg, await HexToArrayBuffer(input)));
}

// Sets the output string to ridicule format of input string.
function RidiculeCasingGUI(input) {
	input = input.toLowerCase();
	let ridicule = "";
	for (let i = 0; i < input.length; i++) {
		var rid = input[i];
		if (i % 2 != 0) { // Every other character
			if (rid.toUpperCase() != undefined) { // returns undefined on non-printable, and possibly other chars (i.e. space)
				rid = rid.toUpperCase();
			}
		}
		ridicule += rid;
	}
	return ridicule;
}

///////////////////////////////
//// DND Convert
///////////////////////////////

// Returns a new padded array (if needed) from given array.
function rollsPadded(rolls, diceSides) {
	let cols = parseInt(diceSides).toString().length;

	// Padding
	let paddedRolls = [];
	for (let x of rolls) {
		if (x.toString().length < cols) {
			x = x.toString().padStart(cols, "0");
		}
		paddedRolls.push(x);
	}
	return paddedRolls;
}

/**
 * Returns the decimal representation, as a string, from the DND input.  Returns
 * string because number can't represent nil, string can with empty quotes, "".
 * @param   {number}   diceSides   Number. Number of dice sides (determines base).
 * @returns {string}                Decimal representation of DND rolls. 
 */
function dndToDecimal(diceSides) {
	let cols = diceSides.length;
	diceSides = parseInt(diceSides); // Guarantee number and not string.
	// console.debug(diceSides);
	if (diceSides == 0) {
		throw new Error("must specify number of dice sides");
	}

	let rollErrCheck = (roll) => {
		roll = parseInt(roll);
		// console.debug(typeof roll, typeof diceSides);
		if (roll > diceSides) {
			throw new Error("cannot have roll higher than dice sides: " + roll);
		}
		if (roll <= 0) {
			throw new Error("cannot have a roll of 0: " + roll);
		}
	};

	if (isEmpty(inElem.value)) {
		return "";
	}

	let rolls = new Array();
	// Support space as delimiter.
	if (inElem.value.includes(' ')) {
		rolls = rollsPadded(inElem.value.split(' ', inElem.value.length), diceSides)
	} else {
		rolls = inElem.value.match(new RegExp('.{1,' + cols + '}', 'g'));
	}
	for (let roll of rolls) {
		rollErrCheck(roll); // throws
	}

	return diceRollsToDecimal(diceSides, rolls);
}


/**
 * Returns the decimal representation from the number of dice sides, and the
 * given rolls. Returns String because, unlike number, it handles null, e.g. "",
 * gracefully.
 * @param   {number}         diceSides   Number. Number of dice sides (determines base).
 * @param   {Array<number>}  rolls       Array.  Dice rolls.
 * @returns {string}         String. Decimal representation of DND rolls. 
 * @throws  {error}          error       Error.  Error when roll is higher than dice side.
 */
function diceRollsToDecimal(diceSides, rolls) {
	let nu = 0;
	let x = 0;
	for (let i = rolls.length - 1; i >= 0; i--) {
		// Shift dice roles from "human numbers" to computer science numbers (minus one)
		let roll = parseInt(rolls[x] - 1);
		x++;
		if (roll > diceSides) {
			throw new Error("cannot have a roll higher than the dice sides: " + roll);
		}
		let power = diceSides ** i;
		let dec = roll * power;
		nu = nu + dec;
	}
	return nu.toString();
}


/**
 * Returns an array of the dice rolls, from the input.
 * FIXME since this function uses javascript's number, it's limited in size.  
 * @param   {String}    input        String. Input string to be converted to DND rolls.
 * @param   {String}    inputAlpha   String. Alphabet/Base that input is in.
 * @param   {number}    diceSides    Number. Number of dice sides (determines base).
 * @returns {String}    output       String. Output based on input alphabet base.
 * @throws  {error}     error        Error. Fails when dice sides are not specified, and/or roll is higher than dice sides.
 */
 function baseToDND(input, inputAlpha, diceSides) {
	//console.debug("baseToDND: ", input, inputAlpha, diceSides);
	if (diceSides == 0 || isEmpty(diceSides)) { // "handle "undefined"
		throw new Error("must specify number of dice sides. Given:" + diceSides);
	}
	let decimal = BaseConvert(input, inputAlpha, Base10);
	let rolls = [];

	// Discovery for column (radix column power)
	for (var power = 1; true; power++) {
		let n = diceSides ** power;
		if (n > decimal) {
			power--;
			break;
		}
	}
	// console.log("Power:", power);

	for (let i = power; i >= 0; i--) {
		let roll = ~~(decimal / (diceSides ** power)); // bitwise XOR XOR to get decimal. 
		decimal = decimal % (diceSides ** power);
		power--;


		if (roll > diceSides) {
			throw new Error("cannot have a roll higher than dice sides: " + roll);
		}
		rolls.push(roll+1); // convert from computer science numbers to human numbers
	}
	// console.log("Rolls:", rolls);
	rolls = rollsPadded(rolls, diceSides).toString();
	return rolls.toString().replaceAll(',', '', );
}


///////////////////////
// App Helpers
///////////////////////

// Returns true, if the string is a recognized keyword, or has a recognized
// prefix (e.g. "Hash" from "Hash:SHA-256").
function isKeyword(s) {
	let reservedList = [
		"bytes", "SysCnv", "hex", "Hex", "b64", "b64ut", "ub64p", "ub64t", "b64up",
		"base64", "base64ut", "ubase64p", "ubase64t", "base64up", "Ridicule", "Majuscule",
		"Miniscule", "text", "string"
	];
	if (reservedList.includes(s) || s.substring(0, 4) == "DND:" || s.substring(0, 5) == "Hash:") {
		return true;
	}
	return false;
}

// RemovePad is a helper function removes pad but not the single zero case.
function RemovePad(input, inAlph){
	console.log("RemovePad", input, inAlph);
	if (input.length == 1) {
		return input;
	}
	// Remove padding characters
	let inPad = inAlph.charAt(0);
	let out = "";
	for (var i = 0; i < input.length; i++) {
		if (input.charAt(i) !== inPad){
			break;
		} 
	}
	return input.substring(i);
}

// Returns string from input string, where any control/non-printable characters
// are represented as a chiclet. See also Mojibake (https://en.wikipedia.org/wiki/Mojibake)
function controlCharsToChiclets(input) {
	let outString = "";
	for (let char of input) {
		if (ASCIICONTROL.includes(char)) {
			outString += '';
			continue;
		}
		outString += char;
	}
	return outString;
}

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

/**
 * @typedef  {Object} GuiMeta
 * @property {string} bits   - Bits in alphabet. 
 * @property {string} base   - Alphabet base.
 * @property {string} length - length of string.  
 */


/**
 * Calculates Bits, Base, and Length based on alphabet, including keywords.
 * @param    {String}    alph         String, Go Bytes representation as a string.
 * @param    {String}    text         String. 
 * @returns  {GuiMeta}                GuiMeta         
 */
function bitsBaseLengthGUI(alph, text) {
	// console.debug(keyword);
	if (alph.substring(0, 4) == "DND:") {
		var sides = alph.substring(4);
		alph = "DND";
	}

	var bits = "n/a";
	var base = "n/a";
	var length = text.length;

	switch (alph) {
		case "bytes":
			bits = 8;
			base = 2;
			length = text.length + "\n(Chunks: " + text.split(",").length + ")";
			break;
		case "Hash:SHA-256":
		case "Hash:SHA-384":
		case "Hash:SHA-512":
			bits = 4; // Output is Hex, which is 4 bits.
			base = alph.substring(5);
			break;
		case "base64":
		case "b64":
		case "ubase64p":
		case "ub64p":
			bits = 6;
			base = "u64p";
			break;
		case "base64up":
		case "b64up":
			bits = 6;
			base = "b64up";
			break;
		case "base64ut":
		case "b64ut":
			bits = 6;
			base = "b64ut";
			break;
		case "ubase64t":
		case "ub64t":
			bits = 6;
			base = "ub64t";
			break;
			// Currently only works in to out.
		case "Ridicule":
		case "Majuscule":
		case "Miniscule":
			break;
		case "text":
		case "string":
			base = "Unicode";
			break;
		case "SysCnv":
			break; // Do nothing.
		case "DND":
			base = "Dice " + sides;
			bits = bitPerBase(sides);
			break;
		default: // Not a keyword
			length = text.length;
			base = alph.length;
			bits = bitPerBase(alph.length);

			break;
	}

	return {
		"bits": bits,
		"base": base,
		"length": length
	};
}


// TODO
// function BucketPad() {}
// function FullBuckets() {
// 	inBits = bitPerBase(inAlphElem.value.length);
// 	outBits = bitPerBase(outAlphElem.value.length);
// 	inBitsElem.textContent = inBits;
// 	outBitsElem.textContent = outBits;
// }



///////////////////////
// Helpers
///////////////////////

function lcm_two_numbers(x, y) {
	if ((typeof x !== 'number') || (typeof y !== 'number'))
		return false;
	return (!x || !y) ? 0 : Math.abs((x * y) / gcd_two_numbers(x, y));
}

function gcd_two_numbers(x, y) {
	x = Math.abs(x);
	y = Math.abs(y);
	while (y) {
		var t = y;
		y = x % y;
		x = t;
	}
	return x;
}

function range(start, stop, step) {
	var a = [start],
		b = start;
	while (b < stop) {
		a.push(b += step || 1);
	}
	return a;
}

function isJson(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}



/**
 * arrayBufferToHex accepts an array buffer and returns a string of hex.
 * Taken from https://stackoverflow.com/a/50767210/1923095
 * @param {ArrayBuffer} buffer       str that is being converted to UTF8
 * @returns {string} hex             String with hex.  
 */
async function arrayBufferToHex(buffer) {
	return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join('').toUpperCase();
};

/**
 * isEmpty is a helper function to determine if thing is empty. 
 * 
 * Objects are empty if they have no keys. (Returns len === 0 of object keys.)
 *
 * Functions are considered always not empty. 
 * 
 * NaN returns true.  (NaN === NaN is always false, as NaN is never equal to
 * anything. NaN is the only JavaScript value unequal to itself.)
 *
 * Don't use on HTMl elements. For HTML elements, use the !== equality check
 * (element !== null).
 *
 * Cannot use CryptoKey with this function since (len === 0) always. 
 *
 * @param   {any}     thing    Thing you wish was empty.  
 * @returns {boolean}          Boolean.  
 */
function isEmpty(thing) {
	if (typeof thing === 'function') {
		return false;
	}

	if (thing === Object(thing)) {
		if (Object.keys(thing).length === 0) {
			return true;
		}
		return false;
	}

	if (!isBool(thing)) {
		return true;
	}
	return false
};

/**
 * Helper function to determine boolean.  
 *
 * Javascript, instead of considering everything false except a few key words,
 * decided everything is true instead of a few key words.  Why?  Because
 * Javascript.  This function inverts that assumption, so that everything can be
 * considered false unless true. 
 *
 * @param   {any}      bool   Thing that you wish was a boolean.  
 * @returns {boolean}         An actual boolean.  
 */
function isBool(bool) {
	if (
		bool === false ||
		bool === "false" ||
		bool === undefined ||
		bool === "undefined" ||
		bool === "" ||
		bool === 0 ||
		bool === "0" ||
		bool === null ||
		bool === "null" ||
		bool === "NaN" ||
		Number.isNaN(bool) ||
		bool === Object(bool) // isObject
	) {
		return false;
	}
	return true;
};