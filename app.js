"use strict";

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector("#ConvertBaseButton").addEventListener('click', Convert);
	document.querySelector("#PadCheckbox").addEventListener('click', Convert);

	document.querySelector("#FlipButton").addEventListener('click', Flip);
	document.querySelector("#reverseInButton").addEventListener('click', ReverseIn);
	document.querySelector("#reverseOutButton").addEventListener('click', ReverseOut);
	document.querySelector("#ShareButton").addEventListener('click', ShareURL);

	
	// TODO this seems wrong
	document.querySelectorAll("#ClearButton").forEach(t => {
		t.addEventListener('click', Clear);
	});
	document.querySelectorAll(".copy").forEach(t => {
		t.addEventListener('click', Copy);
	});
	document.querySelectorAll(".source").forEach(t => {
		t.addEventListener('click', Source);
	});
	document.querySelectorAll(".destination").forEach(t => {
		t.addEventListener('click', Desintation);
	});


	

	//////////////////
	// URL parameters
	//////////////////
	PopulateFromURL();

	//////////////////
	// Live Update Conversion
	//////////////////
	// I don't know if change does anything, but input doesn't seem to cover all
	// cases of user interaction. 
	document.querySelector("#inputString").addEventListener('input', Convert);
	document.querySelector("#inputAlphabet").addEventListener('input', Convert);
	document.querySelector("#outputAlphabet").addEventListener('input', Convert);



	//////////////////
	// Examples
	//////////////////
	//document.querySelector("#ExampleButton").addEventListener('click', ExampleConversion);
	document.querySelector("#Example64To256Button").addEventListener('click', Example64To256);
	document.querySelector("#Example256to32Button").addEventListener('click', Example256to32);



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



	console.log(reduce(6, 8));
});


function FullBuckets() {
	var inputBase = document.getElementById("inputAlphabet").value.length;
	var outputBase = document.getElementById("outputAlphabet").value.length;
	console.log(inputBase);
	console.log(outputBase);

	inBits = bitPerBase(inputBase);
	outBits = bitPerBase(outputBase);



	console.log(reduce(inBits, outBits));
}




function Convert() {
	let inputAlphabet = document.getElementById("inputAlphabet").value;
	let inputString = document.getElementById("inputString").value;
	let outputAlphabet = document.getElementById("outputAlphabet").value;


	if (inputAlphabet == "" || inputString == "" || outputAlphabet == "") {
		console.log("Empty input.");
		return null;
	}

	// Set padding Setting
	if(document.getElementById("PadCheckbox").checked == true){
		Padding = true;
	}else{
		Padding = false;
	}

	let outputString = baseConvert(inputString, inputAlphabet, outputAlphabet);
	console.log(outputString);
	document.getElementById("outputString").value = outputString;
	Update();
}


function Flip() {
	let inputAlphabet = document.getElementById("inputAlphabet").value;
	let inputString = document.getElementById("inputString").value;
	let outputAlphabet = document.getElementById("outputAlphabet").value;
	let outputString = document.getElementById("outputString").value;

	document.getElementById("inputAlphabet").value = outputAlphabet;
	document.getElementById("inputString").value = outputString;
	document.getElementById("outputAlphabet").value = inputAlphabet;
	document.getElementById("outputString").value = inputString;

	Update();
}


function ReverseIn() {
	var string = document.getElementById("inputString").value;
	string = string.split("").reverse().join("");
	document.getElementById("inputString").value = string;
}

function ReverseOut() {
	var string = document.getElementById("outputString").value;
	string = string.split("").reverse().join("");
	document.getElementById("outputString").value = string;
}








function Copy() {
	//console.log("Triggered Copy");
	// Alternative selector:
	//console.log(this.parentNode.previousElementSibling.firstElementChild.value);

	let input = this.parentNode.previousElementSibling.firstElementChild;
	input.select();
	input.setSelectionRange(0, 99999);
	document.execCommand("copy");
}

function Source() {
	console.log("Entered Source");
	let input = this.parentNode.parentNode.firstElementChild.firstElementChild.value;
	document.getElementById("inputAlphabet").value = input;
	Update();
}

function Desintation() {
	console.log("Entered Desintation");
	let input = this.parentNode.parentNode.firstElementChild.firstElementChild.value;
	document.getElementById("outputAlphabet").value = input;
	Update();
}

function Clear() {
	//console.log("Triggered Clear");
	document.getElementById("inputAlphabet").value = "";
	document.getElementById("inputString").value = "";
	document.getElementById("outputAlphabet").value = "";
	document.getElementById("outputString").value = "";
	Update();
}


function Length() {
	//console.log("Triggered Length");
	//console.log(this);
	this.parentNode.querySelector(".lengthDisplay").textContent = this.value.length;
}


function LengthAll() {
	//console.log("Triggered LengthAll");

	document.getElementById("inputAlphabetLength").textContent = document.getElementById("inputAlphabet").value.length;
	document.getElementById("inputStringLength").textContent = document.getElementById("inputString").value.length;
	document.getElementById("outputAlphabetLength").textContent = document.getElementById("outputAlphabet").value.length;
	document.getElementById("outputStringLength").textContent = document.getElementById("outputString").value.length;


}

// Update updates all information presented on the screen.  
function Update() {
	LengthAll();
}


// Populate fields from URL parameters. 
function PopulateFromURL() {
	console.log("populating from URL");
	var url = new URL(window.location.href);
	console.log(url);
	var input = url.searchParams.get("in");
	var inAlpha = url.searchParams.get("inAlpha");
	var outAlpha = url.searchParams.get("outAlpha");
	var pad = url.searchParams.get("pad");
	console.log(input, inAlpha, outAlpha, pad);

	if (input != "" || inAlpha != "" || outAlpha != "") {
		document.getElementById("inputString").value = input;
		document.getElementById("inputAlphabet").value = inAlpha;
		document.getElementById("outputAlphabet").value = outAlpha;
		document.getElementById("PadCheckbox").checked = pad;

		Convert();
	}

	//Recreate the share URL
	ShareURL();
}

// Share
function ShareURL() {

	var input = document.getElementById("inputString").value;
	var inAlpha = document.getElementById("inputAlphabet").value;
	var outAlpha = document.getElementById("outputAlphabet").value;
	var pad = document.getElementById("PadCheckbox").checked;


	var url = new URL(window.location.href);
	url.searchParams.set("in", input);
	url.searchParams.set("inAlpha", inAlpha);
	url.searchParams.set("outAlpha", outAlpha);
	url.searchParams.set("pad", pad);


	console.log(url);


	document.getElementById("ShareTextArea").value = url.href;
}




function ExampleConversion() {
	document.getElementById("inputString").value = "KNBrzb9SPxyILkIHg5XE-z7Lm8x8Y5UjS4kXY3StK14";
	document.getElementById("inputAlphabet").value = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	document.getElementById("outputAlphabet").value = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-";
	// Out should be 12BWR7JBVQZDDNW5M1Z4CF8VYEPZZQNVC-G7KRV-ZOCUX-7P7F
	Convert();
}


function Example64To256() {
	document.getElementById("inputString").value = "eyJhbGciOiJFUzUxMiJ9";
	document.getElementById("inputAlphabet").value = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	document.getElementById("outputAlphabet").value = document.getElementById("base256").value;
	// Out should be {"alg":"ES512"}
	Convert();
}

function Example256to32() {
	document.getElementById("inputString").value = "foobar¡¡¡¡";
	document.getElementById("inputAlphabet").value = document.getElementById("base256").value;
	document.getElementById("outputAlphabet").value = document.getElementById("base32").value;
	// Out should be MZXW6YTBOI======
	Convert();
}