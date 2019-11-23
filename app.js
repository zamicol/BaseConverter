"use strict";

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector("#ConvertBaseButton").addEventListener('click', Convert);
	document.querySelector("#ExampleButton").addEventListener('click', ExampleConversion);
	document.querySelector("#FlipButton").addEventListener('click', Flip);
	document.querySelectorAll("#ClearButton").forEach(t => {t.addEventListener('click', Clear);});
	document.querySelectorAll(".copy").forEach(t => {t.addEventListener('click', Copy);});
	document.querySelectorAll(".source").forEach(t => {t.addEventListener('click', Source);});
	document.querySelectorAll(".destination").forEach(t => {t.addEventListener('click', Desintation);});
	
});




function Convert() {
	let inputAlphabet = document.getElementById("inputAlphabet").value;
	let inputString = document.getElementById("inputString").value;
	let outputAlphabet = document.getElementById("outputAlphabet").value;

	let outputString = baseConvert(inputString, inputAlphabet, outputAlphabet);
	console.log(outputString);
	document.getElementById("outputString").value = outputString;
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
}


function ExampleConversion() {
	document.getElementById("inputString").value = "k-6cq1CLkrfCmW84VUX-6AmJUfkP-orILPxm_BuBPjY";
	document.getElementById("inputAlphabet").value = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	document.getElementById("outputAlphabet").value = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-";
	Convert();
}


function Copy(){
console.log("Entered Copy");
// Alternative selector:
//console.log(this.parentNode.previousElementSibling.firstElementChild.value);

let input = this.parentNode.previousElementSibling.firstElementChild;
input.select();
input.setSelectionRange(0, 99999);
document.execCommand("copy");
}

function Source(){
	console.log("Entered Source");
	let input = this.parentNode.parentNode.firstElementChild.firstElementChild.value;
	console.log(input);
	document.getElementById("inputAlphabet").value =input;
}

function Desintation(){
	console.log("Entered Desintation");
	let input = this.parentNode.parentNode.firstElementChild.firstElementChild.value;
	console.log(input);
	document.getElementById("outputAlphabet").value = input;
}

function Clear(){
	console.log("Entered Clear");
	document.getElementById("inputAlphabet").value = "";
	document.getElementById("inputString").value = "";
	document.getElementById("outputAlphabet").value = "";
	document.getElementById("outputString").value = "";
}