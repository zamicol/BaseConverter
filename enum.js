"use strict";

// TODO use when modules implemented
// const Base10 = "0123456789";
// const Base16 = "0123456789ABCDEF";
// const Base16Lower = "0123456789abcdef";

// ///////////////////////
// // RFC 4648 base64s
// ///////////////////////
// // RFCBase64Unsafe is a URI unsafe base 64 alphabet, the "default" for RFC 4648. 
// const RFCBase64Unsafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// // RFCBase64Uri is RFC 4648 URI safe base 64 alphabet.  
// const RFCBase64Uri = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// ASCII Extended control and non printable characters.
const ASCIIExtCTRLNPChars = String.fromCharCode(
	// First two rows and space
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
	22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
	// Row 9, 10, NBSP, and soft hyphen
	127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141,
	142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156,
	157, 158, 159, 160, 173
);