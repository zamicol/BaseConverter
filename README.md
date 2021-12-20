https://convert.zamicol.com/

# BaseConverter
Zamicol's Base Converter 

If your project needs to do base conversion, use `base_converter.js`.  

BaseConverter is a generalized, number first converter.  This converter treats
input and output as numbers and uses the iterative divide by radix conversion
method.  This method is suitable for arbitrary bases, character sets, and
alphabet lengths.  

Surprisingly,  I couldn't find a converter online that met my needs, so I built
this.  Other projects had limitations on alphabet characters, alphabet length,
input/output length, or were designed for specific encoding.  

Padding can be applied according to bytes, nibbles, or any other bucket size.
This converter is alphabet agnostic for input and output and has no limitations
on alphabets starting with 0, special or repeating characters, or is unable to
be divided evenly.