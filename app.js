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
const base64 = document.getElementById('base64urlsafe').value;
const base64urlunsafe = document.getElementById('base64urlunsafe').value;
const base85 = document.getElementById('base85').value;
const base91 = document.getElementById('base91').value;
const base128 = document.getElementById('base128').value;
const base256 = document.getElementById('base256').value;


// Application element variables that remain constant, but have inner
// elements/values that will change or be modified.
var inputStringElement;
var inputAlphabetElement;
var inputBitsNeededElement;
var inputStringLengthElement;
var inputAlphabetLengthElement;

var outputAlphabetElement;
var outputStringElement;
var outputBitsNeededElement;
var outputAlphabetLengthElement;
var outputStringLengthElement;

var padCheckboxElement;
var numberOfDiceSidesElement;

var alertDivElement;
var alertMsgElement;

// Application variables that will change from user input
var numberOfDiceSides;

document.addEventListener('DOMContentLoaded', () => {
	// Input Elements
	inputStringElement = document.getElementById("inputString");
	inputAlphabetElement = document.getElementById("inputAlphabet");
	inputBitsNeededElement = document.getElementById("inputBitsNeeded");
	inputStringLengthElement = document.getElementById("inputStringLength");
	inputAlphabetLengthElement = document.getElementById("inputAlphabetLength");
	// Ouput Elements
	outputStringElement = document.getElementById("outputString");
	outputAlphabetElement = document.getElementById("outputAlphabet");
	outputBitsNeededElement = document.getElementById("outputBitsNeeded");
	outputStringLengthElement = document.getElementById('outputStringLength');
	outputAlphabetLengthElement = document.getElementById('outputAlphabetLength');
	// Other Elements
	numberOfDiceSidesElement = document.getElementById('numberOfDiceSides');
	padCheckboxElement = document.querySelector("#PadCheckbox");

	alertDivElement = document.getElementById('alertErrorDiv');
	alertMsgElement = document.getElementById('alertErrorMsg');

	padCheckboxElement.addEventListener('click', Convert);

	document.querySelector("#FlipBtn").addEventListener('click', Flip);
	document.querySelector("#ClearBtn").addEventListener('click', Clear);
	document.querySelector("#ConvertBaseBtn").addEventListener('click', Convert);
	document.querySelector("#reverseInBtn").addEventListener('click', ReverseIn);
	document.querySelector("#reverseOutBtn").addEventListener('click', ReverseOut);



	document.getElementById('HashAlgoOptions').addEventListener('click', () => {
		DefaultIn("text");
		outputAlphabetElement.value = "Hash:" + document.getElementById('HashAlgoOptions').value
		Convert();
	});
	document.querySelector('#CyphrmeConvertBtn').addEventListener('click', () => {
		outputAlphabetElement.value = "SysCnv";
		DefaultIn("hex");
		Convert();
	});

	document.querySelector('#DNDConvertInBtn').addEventListener('click', () => {
		inputAlphabetElement.value = "DND:" + numberOfDiceSidesElement.value;
		DefaultOut("Hex");
		Convert();
	});
	document.querySelector('#DNDConvertOutBtn').addEventListener('click', () => {
		outputAlphabetElement.value = "DND:" + numberOfDiceSidesElement.value;
		DefaultIn("Hex")
		Convert();
	});

	document.querySelector('#base64InBtn').addEventListener('click', () => {
		DefaultOut("Hex");
		inputAlphabetElement.value = "base64";
		Convert();
	});

	document.querySelector('#b64utOutBtn').addEventListener('click', () => {
		DefaultIn("Hex");
		outputAlphabetElement.value = "ub64t";
		Convert();
	});
	document.querySelector('#ub64pOutBtn').addEventListener('click', () => {
		DefaultIn("Hex");
		outputAlphabetElement.value = "ub64p";
		Convert();
	});

	document.getElementById('majusculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outputAlphabetElement.value = "Majuscule";
		Convert();
	});
	document.getElementById('minisculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outputAlphabetElement.value = "Miniscule";
		Convert();
	});
	document.getElementById('ridiculeBtn').addEventListener('click', () => {
		DefaultIn("text");
		outputAlphabetElement.value = "Ridicule";
		Convert();
	});


	/** @type {FormParameter} */
	let formParams = [{
			"name": "inputString",
			"valueName": inputStringElement.value,
		},
		//// Useful for debugging.
		// {
		// 	"name": "outputString",
		// 	"valueName": outputStringElement.value,
		// },
		{
			"name": "inputAlphabet",
			"valueName": inputAlphabetElement.value
		},
		{
			"name": "outputAlphabet",
			"valueName": outputAlphabetElement.value,
		},
		{
			"name": "numberOfDiceSides",
			"valueName": numberOfDiceSidesElement.value,
		},
	];

	document.querySelector("#ShareBtn").addEventListener('click', () => ShareURL(formParams));

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
	// URL parameters
	//////////////////
	PopulateFromURL(formParams);
	Update();

	//////////////////
	// Live Update Conversion
	//////////////////
	// "change" doesn't work. "input" doesn't seem to cover all cases of user interaction. 
	inputStringElement.addEventListener('input', Convert);
	inputAlphabetElement.addEventListener('input', Convert);
	outputAlphabetElement.addEventListener('input', Convert);

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



	// Sets inAlph if not set. 
	function DefaultIn(input) {
		if (isEmpty(inputAlphabetElement.value)) {
			inputAlphabetElement.value = input;
		}
	}
	// Sets outAlph if not set. 
	function DefaultOut(output) {
		if (isEmpty(outputAlphabetElement.value)) {
			outputAlphabetElement.value = output;
		}
	}



	//////////////////
	// Live Update Length
	//////////////////
	document.querySelectorAll(".conversionTextArea").forEach(t => {
		t.addEventListener('input', Length);
	});
	// I don't know if change does anything, but input doesn't seem to cover all
	// cases of user interaction. 
	document.querySelectorAll(".conversionTextArea").forEach(t => {
		t.addEventListener('change', Length);
	});

	// Reset alert error message and hide div
	document.getElementById('alertErrorCloseBtn').addEventListener('click', () => {
		alertDivElement.hidden = true;
		alertMsgElement.textContent = "";
	});

	// console.log(lcm_two_numbers(3, 15));
	// console.log(lcm_two_numbers(10, 15));
	// console.log(lcm_two_numbers(5, 8));
	// console.log(lcm_two_numbers(6, 8));
});

// TODO
function BucketPad() {}

function FullBuckets() {
	inBits = bitPerBase(inputAlphabetElement.value.length);
	outBits = bitPerBase(outputAlphabetElement.value.length);

	inputBitsNeededElement.textContent = inBits;
	outputBitsNeededElement.textContent = outBits;
}

async function GUIConvert(inAlph, input, outAlph) {
	inputAlphabetElement.value = inAlph;
	inputStringElement.value = input;
	outputAlphabetElement.value = outAlph;
	Convert();
}


// async function GUIConvertDefault(inAlph,defInAlph, input, defInput, outAlph, defOutAlph) {
// 	if (isEmpty(inputAlphabetElement.value) && !isEmpty(defInAlph)) {
// 		inputAlphabetElement.value = defInAlph;
// 	}

// 	inputAlphabetElement.value = inAlph;
// 	inputStringElement.value = input;
// 	outputAlphabetElement.value = outAlph;
// 	Convert();
// }


// Converts the input text area from the input alphabet to the output alphabet.
async function Convert() {
	try {
		// Clear out error message
		alertDivElement.hidden = true;
		alertMsgElement.textContent = "";

		let outputAlphabet = outputAlphabetElement.value;
		let inputAlpha = inputAlphabetElement.value;
		let inputString = inputStringElement.value;

		// Set padding Setting
		if (padCheckboxElement.checked == true) {
			LeftPadding = true;
		} else {
			LeftPadding = false;
		}

		let outputString = "";
		if (inputAlpha == "" || outputAlphabet == "") {
			console.debug("Empty input alph or output alph.");
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
		// console.debug(inputString);

		/////////////////////
		// Output
		/////////////////////
		if (!isKeyword(outputAlphabet)) {
			outputString = baseConvert(inputString, inputAlpha, outputAlphabet);
		} else {
			// All keywords accept Hex.  If coming from keyword, input and inputAlpha
			// are already Hex.  Otherwise, convert to Hex.
			inputString = baseToHex(inputString, inputAlpha);
			inputAlpha = Base16;

			// console.log(inputString);

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
					outputString = "Hex: " + inputString +
						"\nRFC base64 uri padded: " + HexToUb64p(inputString) 
						+ "\nGo Bytes: " + hexToGoBytesString(inputString)
						+ "\nbase 128: " + baseConvert(inputString, Base16, Base128)
					;
					break;
				case "Hash":
					outputString = await hashHex(hashAlg, inputString);
					break;
				case "bytes":
					outputString = hexToGoBytesString(inputString);
					break;
				case "base64":
				case "b64":
				case "ubase64p":
				case "ub64p":
				case "base64up":
				case "b64up":
					outputString = HexToUb64p(inputString);
					break;
				case "ubase64t":
				case "ub64t":
				case "base64ut":
				case "b64ut":
					outputString = await ArrayBufferTo64ut(await HexToArrayBuffer(inputString));
					break;
				case "DND":
					outputString = dndRollsFromInput(inputString, inputAlpha, diceSides);
					break;
				case "string":
				case "text":
					outputString = await hexToString(inputString);
					break;
				case "Hex":
					outputString = inputString;
					break;
				case "hex":
					outputString = hexPadded(baseConvert(inputString, Base16, Base16Lower));
					break;
				case "Majuscule":
					outputString = inputStringElement.value.toUpperCase(); // Use original string, and not Hex representation.
					break;
				case "Miniscule":
					outputString = inputStringElement.value.toLowerCase();
					break;
				case "Ridicule":
					outputString = RidiculeCasingGUI(inputStringElement.value);
					break;
				default:
					throw new Error("Keyword not supported for Output");
			}
		}

		outputStringElement.value = outputString;
		Update();
	} catch (error) {
		console.error(error);
		alertMsgElement.textContent = error;
		alertDivElement.hidden = false;
	}
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
			return baseToHex(dndToDecimalString(diceSides), Base10);
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
			return baseConvert(input, inAlph, Base16);
		case "Hex":
			return input;
		case "string":
		case "text":
			return stringToHex(input);
		default:
			throw new Error('Keyword unsupported.');
	}
}


// Flips Input and Output's alphabet and text area.
function Flip() {
	let inputAlphabet = inputAlphabetElement.value;
	let inputString = inputStringElement.value;
	let outputAlphabet = outputAlphabetElement.value;
	let outputString = outputStringElement.value;

	inputAlphabetElement.value = outputAlphabet;
	inputStringElement.value = outputString;
	outputAlphabetElement.value = inputAlphabet;
	outputStringElement.value = inputString;

	Update();
}

// Reverses the input area text
function ReverseIn() {
	reverse(inputStringElement);
}

// Reverses the output area text
function ReverseOut() {
	reverse(outputStringElement);
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

// Copies the alphabet from the row.
function Copy() {
	let input = this.parentElement.parentElement.querySelector('input');
	input.select();
	input.setSelectionRange(0, 99999);
	document.execCommand("copy");
}

// Updates the Input/Source Alphabet with a given alphabet.
function Source() {
	// console.debug("Entered Source");
	inputAlphabetElement.value = this.parentElement.parentElement.querySelector('input').value;
	Update();
}

// updates the Output Alphabet with a given alphabet.
function Destination() {
	outputAlphabetElement.value = this.parentElement.parentElement.querySelector('input').value;
	Update();
}

// Clears out the Input and Output's alphabets and text areas.
function Clear() {
	//console.log("Triggered Clear");
	inputAlphabetElement.value = "";
	inputStringElement.value = "";
	outputAlphabetElement.value = "";
	outputStringElement.value = "";
	Update();
}

// clears out the error message, and hides the alert.
function ClearErrAlert() {
	alertDivElement.hidden = true;
	alertMsgElement.textContent = "";
}

// Calculates the length of the text in the text area, and updates the GUI.
function Length() {
	let lengthDisplay = this.parentNode.querySelector(".lengthDisplay");
	if (lengthDisplay != null) {
		lengthDisplay.textContent = this.value.length;
	}
}

// Update updates all information presented on the screen.  
// Except share link, for the worry that could slow down things too much. 
function Update() {
	metaAll();
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



//// Maj, Min, Rid Convert

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

//// DND Convert

// Returns a new array from the given array, that will be padded if there are
// more than 9 dice sides.
// If there is no padding, the given array will be returned unmodified.
function rollsPadded(rolls, diceSides) {
	let cols = diceSides.toString().length; // Call before parseInt() (length works on strings and not numbers).
	diceSides = parseInt(diceSides); // Guaruntee number and not string.
	// Padding
	if (diceSides > 9) {
		let paddedRolls = [];
		for (let roll of rolls) {
			if (roll.toString().length < cols) {
				paddedRolls.push(roll.toString().padStart(cols, "0"));
				continue;
			}
			paddedRolls.push(roll);
		}
		return paddedRolls;
	}
	console.log(rolls)
	return rolls;
}

/**
 * Returns an array of the dice rolls, from the input.
 * @param   {String}    input        String. Input string to be converted to DND rolls.
 * @param   {String}    inputAlpha   String. Alphabet/Base that input is in.
 * @param   {number}    diceSides    Number. Number of dice sides (determines base).
 * @returns {String}    output       String. Output based on input alphabet base.
 * @throws  {error}     error        Error. Fails when dice sides are not specified, and/or roll is higher than dice sides.
 */
function dndRollsFromInput(input, inputAlpha, diceSides) {
	// console.debug(input, inputAlpha, diceSides);
	if (diceSides == 0 || isEmpty(diceSides)) { // "handle "undefined"
		throw new Error("must specify number of dice sides. Given:" + diceSides);
	}
	let decimal = baseConvert(input, inputAlpha, Base10);
	// console.debug(decimal);
	let cols = [];
	// Discovery for column (base power)
	for (let i = 0; i < decimal.length; i++) {
		let n = diceSides ** i;
		if (n > decimal) {
			break;
		}
		cols.push(n);
	}
	// console.log(cols);
	let rolls = [];
	let remainder = decimal;
	let r = cols.reverse();
	for (let i = 0; i < r.length; i++) {
		let roll = ~~(remainder / r[i]); // bitwise XOR XOR to get decimal. 
		remainder = remainder % r[i];
		// console.log(roll, remainder);
		if (roll == 1) {
			roll--;
		}
		roll++;
		if (roll > diceSides) {
			throw new Error("cannot have a roll higher than dice sides: " + roll);
		}
		rolls.push(roll);
	}
	rolls = rollsPadded(rolls, diceSides).toString();
	return rolls.toString().replaceAll(',', '', );
}

/**
 * Returns the decimal representation, as a string, from the DND input.
 * @param   {number}   diceSides   Number. Number of dice sides (determines base).
 * @returns {String}   output      String. Decimal representation of DND rolls.
 */
function dndToDecimalString(diceSides) {
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

	let rolls = new Array();
	// Support space as delimiter.
	if (inputStringElement.value.includes(' ')) {
		rolls = rollsPadded(inputStringElement.value.split(' ', inputStringElement.value.length), diceSides)
	} else {
		rolls = inputStringElement.value.match(new RegExp('.{1,' + cols + '}', 'g'));
	}
	for (let roll of rolls) {
		// console.debug(roll);
		rollErrCheck(roll); // throws
	}

	let dec = diceRollsToDecimal(diceSides, rolls);
	// console.debug(dec);
	return dec.toString();
}


/**
 * Returns the decimal representation from the number of dice sides, and the
 * given rolls.
 * @param   {number}         diceSides   Number. Number of dice sides (determines base).
 * @param   {Array<number>}  rolls       Array.  Dice rolls.
 * @returns {number}         decimal     Number. Decimal representation of DND rolls.
 * @throws  {error}          error       Error.  Error when roll is higher than dice side.
 */
function diceRollsToDecimal(diceSides, rolls) {
	if (outputAlphabetElement.value.length == 0) {
		outputAlphabetElement.value = Base16;
	}

	let nu = 0;
	// console.log(rolls);
	let dci = parseInt(diceSides); // In case it is interpreted as string
	let r = rolls.reverse();
	for (let i = 0; i < r.length; i++) {
		let roll = parseInt(rolls[i]) - 1;
		// Corrects dice roll for 1 being interpreted as 0.
		if (roll == 0) {
			roll = 1;
		}
		if (roll > dci) {
			throw new Error("cannot have a roll higher than the dice sides: " + roll);
		}
		let power;
		// console.log(i)
		if (i == 0) {
			power = 1;
		} else if (i == 1) {
			power = dci;
		} else {
			power = dci ** i;
		}
		let dec = roll * power;
		nu = nu + dec;
		// console.log(nu, power, dec, roll);
	}
	return nu;
}

///////////////////////
// App Helpers
///////////////////////

// Updates the legth of all text on the screen.
function metaAll() {
	if (isKeyword(inputAlphabetElement.value)) {
		bitsBaseLengthGUI(inputAlphabetElement.value, inputStringElement.value, inputBitsNeededElement, inputAlphabetLengthElement, inputStringLengthElement);
	} else {
		var inLength = inputAlphabetElement.value.length;
		inputAlphabetLengthElement.textContent = inLength;
		inputStringLengthElement.textContent = inputStringElement.value.length;
		inputBitsNeededElement.textContent = bitPerBase(inLength);
	}

	if (isKeyword(outputAlphabetElement.value)) {
		return bitsBaseLengthGUI(outputAlphabetElement.value, outputStringElement.value, outputBitsNeededElement, outputAlphabetLengthElement, outputStringLengthElement);
	}
	var outLength = outputAlphabetElement.value.length;
	outputAlphabetLengthElement.textContent = outLength;
	outputStringLengthElement.textContent = outputStringElement.value.length;
	outputBitsNeededElement.textContent = bitPerBase(outLength);
}

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


// Converts from arbitrary base, to Hex.
// Does not support keywords
function baseToHex(input, inputAlpha) {
	if (inputAlpha !== Base16) {
		input = baseConvert(input, inputAlpha, Base16);
	}
	if (input.length % 2 == 1) {
		input = input.padStart(input.length + 1, "0");
	}
	return input;
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
 * @param   {String}  input         String, Go Bytes representation as a string.
 * @returns {String}  outputString  String. Output string.
 * @throws  {error}   error         Error.  Syntax error.
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
 * @param   {String}  input         String, Go Bytes representation as a string.
 * @returns {String}  outputString  String. Output string.
 * @throws  {error}   error         Error.  Syntax error.
 */
function GoBytesToHex(input) {
	let chunks = explodeBytes(input);
	let hex = "";
	for (let c of chunks) {
		hex += parseInt(c).toString(16).toUpperCase().padStart(2, "0");
	}
	return hex;
}

// updates the Bits, Base, and Length components of the GUI, based on keyword.
function bitsBaseLengthGUI(keyword, text, bits, base, length) {
	// console.debug(keyword);
	if (keyword.substring(0, 4) == "DND:") {
		keyword = "DND";
	}
	bits.textContent = "n/a";
	base.textContent = "n/a";
	length.textContent = text.length;
	switch (keyword) {
		case "bytes":
			bits.textContent = 8;
			base.textContent = 2;
			length.textContent = text.length + "\n(Chunks: " + text.split(",").length + ")";
			return;
		case "Hash:SHA-256":
		case "Hash:SHA-384":
		case "Hash:SHA-512":
			bits.textContent = 4; // Output is Hex, which is 4 bits.
			base.textContent = keyword.substring(5);
			return;
		case "base64":
		case "b64":
		case "ubase64p":
		case "ub64p":
			bits.textContent = 6;
			base.textContent = "u64p";
			return;
		case "base64up":
		case "b64up":
			bits.textContent = 6;
			base.textContent = "b64up";
			return;
		case "base64ut":
		case "b64ut":
			bits.textContent = 6;
			base.textContent = "b64ut";
			return;
		case "ubase64t":
		case "ub64t":
			bits.textContent = 6;
			base.textContent = "ub64t";
			return;
			// Currently only works in to out.
		case "Ridicule":
		case "Majuscule":
		case "Miniscule":
			inputBitsNeededElement.textContent = "n/a";
			inputAlphabetLengthElement.textContent = "n/a";
			return;
		case "text":
		case "string":
			base.textContent = "Unicode";
			return;
		case "SysCnv":
			return; // Do nothing.
		case "DND":
			base.textContent = "Dice " + numberOfDiceSidesElement.value;
			bits.textContent = bitPerBase(numberOfDiceSidesElement.value);
			return;
		default:
			bits.textContent = "n/a";
			base.textContent = "n/a";
			// console.debug('keyword not recognized');
			return;
	}
}



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


//// Cyphrme funcs

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