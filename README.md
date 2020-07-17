https://convert.zamicol.com/

# BaseConverter
Zamicol's Base Converter - Convert arbitrary bases of arbitrary alphabets of
arbitrary lengths in javascript.

If your project needs to do base conversion, use `base_converter.js`.  

I couldn't find a converter online that met my needs, so I built this.  

This base converter is a number first converter.  Many base converters start
with the paradigm of [base64 or
base32](https://tools.ietf.org/html/rfc4648#section-4), or more broadly the byte
paradigm of right padding. This generalized base converter will not limit a
general base 64 alphabet to the defined base64 encoding scheme, like
Javascript's "btoa" method. This converter treats input and output as numbers
first while still providing options suitable for byte paradigm right pad
encoding.  An advantage of this approach a generalized right pad method. Padding
works for the define base32 encoding scheme as well as a general base 33 or base
58 alphabet. Addionally, padding can be applied according to bytes, nibbles, or
any other "bucket size".  

This converter is alphabet agnostic for input and output.  It doesn't care if
your alphabet starts with a 0, has special or repeating characters, or is unable
to be divided evenly.