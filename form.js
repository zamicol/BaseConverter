"use strict";

// Example FormParameter: 

// const PageFormParameters = [{
// 	"name": "numberOfACsInput"
// },
// {
// 	"name": "timeout"
//  "id":"timeoutInput"
// },
// {
// 	"name": "uriInput"
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
 * 	"name":       "Parameter name in the URI.  Is used as the default value for id.  "
 *  "id":         "id of the html element if it differs from 'name'.  Example, URI parameter "retrieve" and html id "Retrieve."
 * 	"type":       "type of the parameter" // Bool, string
 * 	"funcTrue":    ToggleVisible(document.querySelector("#advancedOptions"));
 * }
 * 
 * @typedef  {Object} FormParameter
 * @property {String} name             - Parameter name in the URI.  Is used as the default value for id.  
 * @property {String} [id]             - Id of the html element if it differs from the name.  Example, URI parameter "retrieve" and html id "Retrieve"
 * @property {String} [type=string]    - Type of the parameter (bool/string). Defaults to string. 
 * @property {String} [funcTrue]       - Function to execute if param is true.  e.g. `"funcTrue": () => ToggleVisible(document.querySelector("#advancedOptions"));`
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
 * PopulateFromURI
 * 
 * 1. inits event listener and 
 * 2. Performs creating the share URI. 
 *
 * @param   {FormParameter}   params    FormParameters object. 
 * @returns {void}                      
 */
async function PopulateFromURI(params) {
	//console.log("Running PopulateFromURI:", params);
	const shareButton = document.querySelector("#shareURLBtn");
	if (shareButton != null) {
		shareButton.addEventListener('click', function() {
			ShareURI(params)
		});
	}

	if (isEmpty(params)) {
		//console.debug("Form.PopulateFromURI params is empty, returning. ");
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
	//console.log("Pairs:", pairs);


	// TODO perhaps flip iterating over pairs instead of params.  
	for (const parameter in params) {
		var name = params[parameter].name;
		var id = params[parameter].id;
		var type = params[parameter].type;
		var value = pairs[name];
		var funcTrue = params[parameter].funcTrue;
		//console.log("name: ", name, "type: ", type, "id: ", id, "value: ", value);

		// If ID is present, it overwrites Name.  
		if (!isEmpty(id)) {
			name = id;
		}

		// Run funcTrue. Value may be "true", or empty "" if in the URL and with no
		// value set, but not `undefined`.  Name only is considered a flag and is
		// interpreted as true.  
		if (type == "bool" && funcTrue !== undefined && value !== undefined && (value === "" || value === "true")) {
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

	ShareURI(params);
}



/**
 * @param   {FormParameter}  params        A Param object.
 * @param   {Object}         values        A values object. 
 * @param   {Object}         formOptions   A form options object.
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
		var name = params[parameter].name; // Required
		var type = params[parameter].type;
		var id = params[parameter].id;
		var value = values[name];

		if (!isEmpty(prefix)) {
			name = prefix + name;
		}

		// If id is empty, assume name is the id on the page.
		if (isEmpty(id)) {
			id = name;
		}

		// console.debug(params, name, value, type);

		if (!isEmpty(value)) {
			if (type == "bool" && value == true) {
				document.getElementById(id).checked = true;
				continue;
			}
			document.getElementById(id).value = value;
		}
	}
};


/**
 * ShareURI generates a share URL, populates the GUI with it, and returns the
 * URL. 
 * 
 * @param {FormParameter} params       Form parameters object.  
 * @returns {URL}             URL
 */
function ShareURI(params) {
	// console.log("ShareURI", params);
	var url = new URL(window.location.href);

	for (const parameter in params) {
		var name = params[parameter].name;
		var id = params[parameter].id;
		var type = params[parameter].type;
		// console.log(name, id, type);

		// `name` is default id for html element.  `id` overrides `name` for html
		// elements ids.
		if (id !== undefined) {
			var htmlElementID = id
		} else {
			var htmlElementID = name;
		}

		var elem = document.getElementById(htmlElementID);
		if (elem !== null) {
			var value = elem.value;

			if (type == "bool") {
				if (elem.checked) {
					value = "true";
				} else {
					value = "";
				}
			}
		}

		if (!isEmpty(value)) {
			url.searchParams.set(name, value);
		} else {
			// Cleans out value from string in case it is set in the URI already.
			// (e.g. bools on false will not be cleared)
			url.searchParams.delete(name);
		}
	}

	//Remove hash if there's nothing in it."#" character is pos [0]
	if (isEmpty(url.hash.substring(1))) {
		url.hash = "";
	}
	//console.log("Share URI Link: ", url.href);

	// URI Link
	let shareUrl = document.querySelector("#shareURL");
	if (shareUrl != null) {
		shareUrl.innerHTML = url.href.link(url.href);
	}

	// Text Area 
	let shareArea = document.querySelector("#shareURIArea");
	if (shareArea != null) {
		shareArea.innerHTML = url.href;
	}

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