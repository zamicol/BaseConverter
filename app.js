"use strict";

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector("#ConvertBaseButton").addEventListener('click', Convert);
	document.querySelector("#ExampleButton").addEventListener('click', ExampleConversion);
	document.querySelector("#FlipButton").addEventListener('click', Flip);
	document.querySelectorAll(".copy").forEach(t => {t.addEventListener('click', Copy);});
	document.querySelectorAll(".source").forEach(t => {t.addEventListener('click', Source);});
	document.querySelectorAll(".destination").forEach(t => {t.addEventListener('click', Desintation);});
});




function Convert() {
	let sourceAlphabet = document.getElementById("sourceAlphabet").value;
	let sourceString = document.getElementById("sourceString").value;
	let destinationAlphabet = document.getElementById("destinationAlphabet").value;

	let destinationString = arbitraryBaseConvert(sourceString, sourceAlphabet, destinationAlphabet);
	console.log(destinationString);
	document.getElementById("destinationString").value = destinationString;
}


function Flip() {
	let sourceAlphabet = document.getElementById("sourceAlphabet").value;
	let sourceString = document.getElementById("sourceString").value;
	let destinationAlphabet = document.getElementById("destinationAlphabet").value;
	let destinationString = document.getElementById("destinationString").value;

	document.getElementById("sourceAlphabet").value = destinationAlphabet;
	document.getElementById("sourceString").value = destinationString;
	document.getElementById("destinationAlphabet").value = sourceAlphabet;
	document.getElementById("destinationString").value = sourceString;
}


function ExampleConversion() {
	document.getElementById("sourceString").value = "k-6cq1CLkrfCmW84VUX-6AmJUfkP-orILPxm_BuBPjY";
	document.getElementById("sourceAlphabet").value = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	document.getElementById("destinationAlphabet").value = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-";
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
	document.getElementById("sourceAlphabet").value =input;
}

function Desintation(){
	console.log("Entered Desintation");
	let input = this.parentNode.parentNode.firstElementChild.firstElementChild.value;
	console.log(input);
	document.getElementById("destinationAlphabet").value = input;
}