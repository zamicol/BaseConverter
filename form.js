"use strict";

// export {
// 	PopulateFromValues,
// 	PopulateFromURL,
// 	ShareURL,
// 	Serialize,
// };

// Example FormParameter: 

// const PageFormParameters = [{
// 	"name": "numberOfACsInput"
// },
// {
// 	"name": "timeout"
// },
// {
// 	"name": "urlInput"
// },
// {
// 	"name": "generateQR",
// 	"type": "bool"
// },
// ];

/**
 * FormParameter
 * FormParameter should be in this form: 
 * 
 * {
 * 	"name":       "Parameter name in the URL.  Is used as the default value for valueName and id.  "
 * 	"type":       "type of the parameter" // Bool, string
 * 	"valueName":  "Custom name of 'value' from the html element.  This should be set if value name differs from parameter name."
 * 	"id":         "id of the html element if it differs from 'name'.  Example, url parameter "retrieve" and html id "Retrieve."
 * 	"funcTrue":    ToggleVisible(document.querySelector("#advancedOptions"));
 * }
 * 
 * @typedef  {Object} FormParameter
 * @property {String} name             - Parameter name in the URL.  Is used as the default value for valueName and id.  
 * @property {String} [type=string]    - Type of the parameter (bool/string). Defaults to string. 
 * @property {String} [valueName]      - Custom name of 'value' from the html element.  This should be set if value name differs from parameter name.
 * @property {String} [id]             - Id of the html element if it differs from the name.  Example, url parameter "retrieve" and html id "Retrieve"
 * @property {String} [funcTrue]       - Function to execute if param is true.  e.g. `"funcTrue": ToggleVisible(document.querySelector("#advancedOptions"));`
 * 
 */

/**
 * FormOptions
 * formOptions are in this form:
 * {
 * "prefix": "form input prefix which will be prepended to name. "
 * }
 *
 * @typedef  {Object} FormOptions
 * @property {String} prefix - Form input prefix which will be prepended to name. 
 */


////////////////////////////
// Functions
///////////////////////////

/**
 * PopulateFromURL
 * 
 * @param   {FormParameter}   params    FormParameters object. 
 * @returns {Object}          pairs     key:value pairs object from url search entries.            
 */
function PopulateFromURL(params) {
	// console.log("Running PopulateFromURL:", params);
	const shareButton = document.querySelector("#shareURLBtn");
	if (shareButton != null) {
		shareButton.addEventListener('click', function () {
			ShareURL(params);
		});
	}

	if (isEmpty(params)) {
		console.debug("params is empty, returning. ");
		return;
	}

	var url = new URL(window.location.href);
	// Put parts into an object since searchParams needs to be combined with fragment queries. 
	let pairs = {};
	var frag = window.location.hash.substring(1); //"#" character is pos [0]

	if (!isEmpty(frag)) {
		let p = frag.split('?');
		// // Anchor: (for debugging)
		// let anchor = p[0]; 
		// console.log("Anchor: ", anchor);

		// Fragment query is after # and ?, separated by "&".
		if (!isEmpty(p[1])) {
			let fqs = p[1].split('&');
			console.log("fqs: ", fqs);

			fqs.forEach((q) => {
				let fqp = q.split('=');
				if (fqp[1] === undefined) {
					pairs[fqp[0]] = null;
					return;
				}
				// Browsers automatically escape values.  Unescape. 
				pairs[fqp[0]] = unescape(fqp[1]);
			});
		}
	}

	for (var pair of url.searchParams.entries()) {
		pairs[pair[0]] = pair[1];
	}
	if (isEmpty(pairs)) {
		return;
	}
	// console.log("Pairs:", pairs);


	// TODO perhaps flip iterating over pairs instead of params.  
	for (const parameter in params) {
		var name = params[parameter].name;
		var type = params[parameter].type;
		var id = params[parameter].id;
		var value = pairs[name];
		//console.log("name: ", name, "type: ", type, "id: ", id, "value: ", value);

		// If ID is present, it overwrites Name.  
		if (!isEmpty(id)) {
			name = id;
		}

		// Run funcTrue. Value may be "true", or empty "" if in the URL and with no
		// value set, but not `undefined`.  Name only is considered a flag and is
		// interpreted as true.  
		if (type == "bool" && value !== undefined && (value === "" || value === "true")) {
			console.debug("Running funcTrue for: ", params[parameter]);
			params[parameter].funcTrue();
		}

		// Set the value of input or boolean check. 
		if (!isEmpty(value)) {
			if (type == "bool" && value == "true") {
				let e = document.getElementById(name);
				if (e != null) {
					e.checked = true;
				}
				continue;
			}

			let e = document.getElementById(name)
			if (e != null) {
				e.value = value;
			}
		}
	}
	ShareURL(params);
	return pairs;
}



/**
 * @param {Object}params        A Param object.
 * @param {Object}values        A values object. 
 * @param {Object}formOptions   A form options object.
 * @returns {void}         
 */
function PopulateFromValues(params, values, formOptions) {
	if (isEmpty(params)) {
		return;
	}

	var prefix = "";

	if (!isEmpty(formOptions)) {
		if (!isEmpty(formOptions.prefix)) {
			prefix = formOptions.prefix;
		}
	}

	for (const parameter in params) {
		var name = params[parameter].name;
		var type = params[parameter].type;
		var valueName = params[parameter].valueName;
		var value = values[name];
		if (!isEmpty(valueName)) {
			//console.debug("Cusom value name: " + valueName);
			value = values[valueName];
		}


		// console.debug(name, value, type);

		if (!isEmpty(prefix)) {
			name = prefix + name;
		}
		// console.debug(name);

		if (!isEmpty(value)) {
			if (type == "bool" && value == true) {
				document.getElementById(name).checked = true;
				continue;
			}
			document.getElementById(name).value = value;
		}
	}
};


/**
 * ShareURL generates a share URL, populates the GUI with it, and returns the
 * URL. 
 * 
 * @param {Element}form       Form element
 * @returns {URL}             URL
 */
function ShareURL(params) {
	// console.log(params);
	var url = new URL(window.location.href);

	for (const parameter in params) {
		var name = params[parameter].name;
		var type = params[parameter].type;
		// console.debug(name, type);

		let thing = document.getElementById(name);
		if (thing === null) {
			continue;
		}

		var value = thing.value;
		//console.log(name, type, value);
		// For bools
		if (type == "bool") {
			if (document.getElementById(name).checked) {
				value = "true";
			} else {
				value = "";
			}
		}

		if (!isEmpty(value)) {
			url.searchParams.set(name, value);
		}
	}

	let shareUrl = document.querySelector("#shareURL");
	if (shareUrl != null) {
		if (shareUrl instanceof HTMLTextAreaElement) {
			shareUrl.value = url.href;
		} else {
			shareUrl.innerHTML = url.href.link(url.href);
		}
	}
	// console.debug(url);
	return url;
};



/**
 * Serialize serialize a form into JSON string.  
 * 
 * @param   {Element}form       Form element
 * @returns {string}            Stringed form
 */
function Serialize(form) {
	var formData = new FormData(form);

	var pairs = {};
	for (let [name, value] of formData) {
		if (value == "true" || value == "on") {
			value = true;
		}
		if (value == "false" || value == "unchecked") {
			value = false;
		}
		if (name.substring(0, 6) == "input_") {
			name = name.substring(6);
		}
		if (!isEmpty(value)) {
			pairs[name] = value;
		}
	}

	return JSON.stringify(pairs);
};