'use strict';

const btn = { div: [{ a: { href: "#" } }] }
const css = { div: {
	'display': 'inline',
	'border-radius': '.2rem',
	'background-color': 'lightgray',
	'box-shadow': 'black',
	'padding': '1rem'
}}

function createFragment(obj) {

	const key = Object.keys(obj)[0]
	const root = document.createElement(key)
	const val = obj[key]

	if(typeof val === 'string') {
		root.innerHTML = val
	}
	else if(Array.isArray(val) === true) {
		for(const elem of val) {
			const res = createFragment(elem)
			root.append(res)
		}
	}
	else {
		const keys = Object.keys(val)
		for(const key of keys) {
			root.setAttribute(key, val[key])
		}
	}

	return root
}

function createStyle(obj) {

	let text_content = ''
	for(const [key, props] of Object.entries(obj)) {
		text_content += `${key} {`
		for(const [prop, value] of Object.entries(props)) {
			text_content += `\t${prop}: ${value};\n`
		}
		text_content += `}`
	}

	return text_content
}

function createComponent(tag, fragment, style) {

	const component = class extends HTMLElement {
		constructor() {
			super();

			const elem = createFragment(fragment)
			// this.append(elem)

			const css = document.createElement('style')
			css.textContent = createStyle(style)

			this.attachShadow({ mode: "open" })         // sets and returns 'this.shadowRoot'
			this.shadowRoot.append(css, elem)
		}
	}

	customElements.define(tag, component)
}

createComponent('my-button2', btn, css)

