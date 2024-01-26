/*
to do: 
- set is_stale on connections and disconnections
- put callback back
*/


"use strict";

class Node_Template {

	#id

	constructor(options = {}) {

		this.#id = ""					// id of the html element
		this.elem = null				// the html element
		this.callback = null			// call this back when something changed
		this.input_connections = null	// map(name: String) list of { output_node: node_connected_to_this_input, output_name: output_name_of_that_node }
		this.output_nodes = null		// map(name: String) list of nodes
		this.outputs = { "default": null }
		this.is_stale = false

		if(typeof options.id !== "undefined") {
			this.#id = options.id
		}

		if(typeof options.callback !== "undefined") {
			this.callback = options.callback
		}

		if(typeof options.connections !== "undefined") {
			this.init_connections(options.connections)
		}
	}


	init_connections(connections) {

		this.input_connections = new Map()
		this.output_nodes = new Map()

		for(const conn of connections) {
			if(conn.type === "input") {
				this.input_connections.set(conn.name, null)
			}
			else if(conn.type === "output") {
				this.output_nodes.set(conn.name, null)
			}
		}
	}


	get id() {
		return this.#id
	}


	set id(id) {
		this.#id = id
		this.elem.setAttribute("id", id)
	}


	get title() {
		return this.elem.querySelector(".title").innerHTML
	}


	set title(t) {
		this.elem.querySelector(".title").innerHTML = t
	}


	get_input_connection(input_name) {
		return this.input_connections.get(input_name)
	}


	set_input_connection(input_name, output_node=null, output_name="") {
		if(output_node === null) {
			this.input_connections.set(input_name, null)	
		}
		else {
			this.input_connections.set(input_name, { "output_node": output_node, "output_name": output_name })
		}
		this.is_stale = true
		if(this.callback !== null) this.callback()
	}


	get_input(input_name) {
		const conn = this.input_connections.get(input_name) // { node: node, output: name}
		if(conn === null) return null
	
		const input = conn.output_node.get_output(conn.output_name)
		return input
	}


	get_output_node(name) {
		return this.output_nodes.get(name)
	}


	set_output_node(name, node) {
		this.output_nodes.set(name, node)
	}


	get_output(output_name) {

		if(typeof this.outputs[output_name] === "undefined") return this.outputs["default"] 
		return this.outputs[output_name]
	}


	disconnect_node(node_id) {

		for(const [name, conn] of this.input_connections) {
			if(conn.output_node !== null && conn.output_node.id === node_id) {
				this.input_connections.set(name, null)
			}
		}

		for(const [name, node] of this.output_nodes) {
			if(node !== null && node.id === node_id) {
				this.output_nodes.set(name, null)
			}
		}			
	}


	disconnect() {

		for(const [name, conn] of this.input_connections) {
			if(conn !== null) {
				conn.output_node.disconnect_node(this.id)
			}
		}

		for(const [name, node] of this.output_nodes) {
			if(node !== null) {
				node.disconnect_node(this.id)
			}
		}
	}


	build(options = {}) {

		this.elem = document.createElement("div")
		this.elem.classList.add("component")
		if(this.#id !== "") {
			this.elem.setAttribute("id", this.#id)
		}

		const title = (typeof options.title !== "undefined" ? options.title : "")
		const ttl = `<div class="title">${title}</div>`

		
		let conns = `<div class="connections">`

		const inputs = this.input_connections.keys()
		for(const input of inputs) {
			conns += `<div class="input"><div class="connector" data-id="${this.#id}" data-type="input" data-name="${input}"></div><div class="label">${input}</div></div>`
		}

		const outputs = this.output_nodes.keys()
		for(const output of outputs) {
			conns += `<div class="output"><div class="label">${output}</div><div class="connector" data-id="${this.#id}" data-type="output" data-name="${output}"></div></div>`
		}

		conns += "</div>"

		const params = `<div class="params"></div>`

		this.elem.innerHTML  = `${ttl}${conns}${params}`
	}

	process() {
	}


	process_all() {
		
		let was_stale = false

		for(const [name, conn] of this.input_connections) {
			if(conn !== null && conn.output_node !== null) {
				was_stale = conn.output_node.process_all()
			}
		}

		if(this.is_stale || was_stale) {
			this.process()
			this.is_stale = false
			was_stale = true
		}

		return was_stale
	}
}


class Node_Image extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "output", name: "output"}]
		super(options)
		
		this.current = ""
		this.build({title: "Image"})
		if(typeof options.params !== "undefined") {
			this.build_params(options.params)
		}
	}

	build_params(params) {

		const prms = this.elem.querySelector(".params")

		let checked = true
		for(let param of params) {

			const div = document.createElement("div")
			const url = param.trim()

			const input = document.createElement("input")
			input.setAttribute("type", "checkbox")
			const id = `id-${Math.floor(Math.random() * 1000000)}`
			input.setAttribute("id", id)
			if(checked) {
				this.current = url
				input.setAttribute("checked", true)
				this.image_load(url)
				checked = false
			}
			input.dataset["radio"] = "image-src"
			input.value = url
			input.addEventListener("change", this.param_onchange.bind(this))
			div.appendChild(input)

			const label = document.createElement("label")
			label.setAttribute("for", id)
			label.textContent = url
			div.appendChild(label)

			prms.appendChild(div)
		}
	}

	param_onchange(evt) {
		
		if(this.current === evt.currentTarget.value) return

		const elems = this.elem.querySelectorAll(`[data-radio="image-src"]`)
		for(let elem of elems) {
			elem.checked = false
		}
		evt.currentTarget.checked = true
		this.current = evt.currentTarget.value
		this.image_load(evt.currentTarget.value)
	}

	image_load(url) {

		const image = document.createElement("img")
		image.addEventListener("load", this.image_onload.bind(this))
		image.src = url
	}

	image_onload(evt) {

		const image = evt.target
		const canvas = new OffscreenCanvas(image.width, image.height)
		const ctx = canvas.getContext("2d")
		ctx.drawImage(image, 0,  0)
		this.outputs["output"] = ctx.getImageData(0, 0, image.width, image.height)
		this.outputs["default"] = this.outputs["output"]

		this.is_stale = true
		if(this.callback !== null) this.callback()
	}
}


class Node_Gray extends Node_Template {

	constructor(options = {}) {

		options.connections = [{type: "input", name: "input"}, {type: "output", name: "output"}]
		super(options)
		this.current = ""
		
		this.build({title: "Gray"})
		this.build_params()
	}

	build_params() {

		const params = ["average", "luminance"]

		const prms = this.elem.querySelector(".params")

		let checked = true
		for(let param of params) {
			const div = document.createElement("div")

			const input = document.createElement("input")
			input.setAttribute("type", "checkbox")
			const id = `id-${Math.floor(Math.random() * 1000000)}`
			input.setAttribute("id", id)
			if(checked) {
				this.current = param
				input.setAttribute("checked", true)
				checked = false
			}
			input.dataset["radio"] = "gray-type"
			input.value = param
			input.addEventListener("change", this.param_onchange.bind(this))
			div.appendChild(input)

			const label = document.createElement("label")
			label.setAttribute("for", id)
			label.textContent = param
			div.appendChild(label)

			prms.appendChild(div)
		}
	}


	param_onchange(evt) {

		if(this.current === evt.currentTarget.value) return

		const elems = this.elem.querySelectorAll(`[data-radio="gray-type"]`)
		for(let elem of elems) {
			elem.checked = false
		}
		evt.currentTarget.checked = true
		this.current = evt.currentTarget.value

		this.is_stale = true
		if(this.callback !== null) this.callback()
	}


	process() {

		const conn = this.get_input_connection("input")
		if(conn === null) return

		const input = this.get_input("input")
		if(this.current === "average") {
			this.outputs["output"] = this.gray_avg(input)
		}
		else if(this.current === "luminance") {
			this.outputs["output"] = this.gray_lum(input)
		}
		this.outputs["default"] = this.outputs["output"]
	}


	gray_avg(src) {

		const dst = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
	
			let r = src.data[i + 0]
			let g = src.data[i + 1]
			let b = src.data[i + 2]
	
			const gr = Math.round( (r + g + b) / 3 )
			dst.data[i + 0] = gr
			dst.data[i + 1] = gr
			dst.data[i + 2] = gr
			dst.data[i + 3] = 255
		}
		return dst
	}
	
	
	gray_lum(src) {
	
		const dst = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
	
			let r = src.data[i + 0]
			let g = src.data[i + 1]
			let b = src.data[i + 2]
	
			r = ( r <= 0.04045 ? r / 12.92 : Math.pow( (r + 0.055) / 1.055, 2.4 ) )
			g = ( g <= 0.04045 ? g / 12.92 : Math.pow( (g + 0.055) / 1.055, 2.4 ) )
			b = ( b <= 0.04045 ? b / 12.92 : Math.pow( (b + 0.055) / 1.055, 2.4 ) )
	
			let gr = Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722)
			if(gr <= 0.0031308) {
				gr = gr * 12.92
			}
			else {
				gr = 1.055 * Math.pow(gr, 1/2.4) - 0.055
			}
	
			dst.data[i + 0] = gr
			dst.data[i + 1] = gr
			dst.data[i + 2] = gr
			dst.data[i + 3] = 255
		}
		return dst
	}

}


class Node_Bayer_Matrix extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "output", name: "output"}]
		super(options)
		this.current = "0"
		
		this.build({title: "Bayer Matrix"})
		this.build_params()

		this.is_stale = true
		if(this.callback !== null) this.callback()
	}

	build_params() {

		const params = ["0", "1", "2"]
		const prms = this.elem.querySelector(".params")

		let checked = true
		for(let param of params) {
			const div = document.createElement("div")

			const input = document.createElement("input")
			input.setAttribute("type", "checkbox")
			const id = `id-${Math.floor(Math.random() * 1000000)}`
			input.setAttribute("id", id)
			if(checked) {
				this.current = param
				input.setAttribute("checked", true)
				checked = false
			}
			input.dataset["radio"] = "bayer-n"
			input.value = param
			input.addEventListener("change", this.param_onchange.bind(this))
			div.appendChild(input)

			const label = document.createElement("label")
			label.setAttribute("for", id)
			label.textContent = param
			div.appendChild(label)

			prms.appendChild(div)
		}
	}


	param_onchange(evt) {

		if(this.current === evt.currentTarget.value) return

		const elems = this.elem.querySelectorAll(`[data-radio="bayer-n"]`)
		for(let elem of elems) {
			elem.checked = false
		}
		evt.currentTarget.checked = true
		this.current = evt.currentTarget.value

		this.is_stale = true
		if(this.callback !== null) this.callback()
	}


	process() {
		const n = parseInt(this.current)
		this.outputs["output"] = this.matrix_calc(n)
		this.outputs["default"] = this.outputs["output"]
	}


	matrix_calc(n=0) {

		if(n < 0) return null
		if(n > 2) return null
	
		const matrices = [
					[ 0, 2,
					 3, 1 ],
	
					[ 0,  8,  2,  10,
					 12, 4,  14, 6,
					 3,  11, 1,  9,
					 15, 7,  13, 5 ],
	
					[ 0, 32, 8, 40, 2, 34, 10, 42,
					 48, 16, 56, 24, 50, 18, 58, 26,
					 12, 44, 4, 36, 14, 46, 6, 38,
					 60, 28, 52, 20, 62, 30, 54, 22,
					 3, 35, 11, 43, 1, 33, 9, 41,
					 51, 19, 59, 27, 49, 17, 57, 25,
					 15, 47, 7, 39, 13, 45, 5, 37,
					 63, 31, 55, 23, 61, 29, 53, 21 ]
		]
		const m1 = matrices[n]
		const dst = new ImageData(Math.pow(2, n + 1), Math.pow(2, n + 1))
	
		const count = Math.pow(2, n + 1) * Math.pow(2, n + 1) * 4
		const unit = 256 / ( Math.pow(2, n + 1) * Math.pow(2, n + 1) )
	
		for(let i=0; i<count; i+=4) {
			dst.data[i + 0] = m1[i/4] * unit
			dst.data[i + 1] = m1[i/4] * unit
			dst.data[i + 2] = m1[i/4] * unit
			dst.data[i + 3] = 255
		}
	
		return dst
	}

}


class Node_Dither_Threshold extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "input", name: "grayscale"}, {type: "input", name: "pattern"}, {type: "output", name: "output"}]
		super(options)

		this.build({title: "Dither Threshold"})
	}

	process() {

		const conn_g = this.get_input_connection("grayscale")
		const conn_p = this.get_input_connection("pattern")

		if(conn_g === null || conn_p === null) return

		const grayscale = this.get_input("grayscale")
		const pattern = this.get_input("pattern")

		this.outputs["output"] = this.dither(grayscale, pattern)
		this.outputs["default"] = this.outputs["output"]
	}


	dither(src, noise, threshold=-1) {

		const dst = new ImageData(src.width, src.height)

		if(threshold !== -1) {
			for (let i=0; i<src.data.length; i+=4) {
	
				const offset = noise.data[i] - 256 / 2
				if(src.data[i + 0] + offset > threshold) {
					dst.data[i + 0] = 255
					dst.data[i + 1] = 255
					dst.data[i + 2] = 255
				}
				dst.data[i + 3] = 255
			}
			return dst
		}
		else {
			for (let i=0; i<src.data.length; i+=4) {
	
				const src_x = (i/4) % src.width
				const src_y = Math.floor((i/4) / src.width)
				const noise_x = src_x % noise.width
				const noise_y = src_y % noise.height
				const noise_index = (noise_x + noise_y * noise.width) * 4
	
				const threshold = noise.data[noise_index]
				if(src.data[i + 0] > threshold) {
					dst.data[i + 0] = 255
					dst.data[i + 1] = 255
					dst.data[i + 2] = 255
				}
				dst.data[i + 3] = 255
			}
			return dst
		}
	}
}


class Node_Threshold extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "input", name: "input"}, {type: "output", name: "output"}]
		super(options)

		this.level = 128

		this.build({title: "Threshold"})
		this.build_params()
	}


	build_params() {

		const prms = this.elem.querySelector(".params")

		const div = document.createElement("div")
		const input = document.createElement("input")
		input.setAttribute("type", "range")
		const id = `id-${Math.floor(Math.random() * 1000000)}`
		input.setAttribute("id", id)
		input.setAttribute("min", 0)
		input.setAttribute("max", 255)
		input.setAttribute("value", this.threshold)
		input.addEventListener("change", this.param_onchange.bind(this))
		div.appendChild(input)

		prms.appendChild(div)
	}

	param_onchange(evt) {

		this.level = evt.currentTarget.value
		this.is_stale = true
		if(this.callback !== null) this.callback()
	}

	process() {

		const conn = this.get_input_connection("input")
		if(conn === null) return

		const input = this.get_input("input")

		this.outputs["output"] = this.threshold(input)
		this.outputs["default"] = this.outputs["output"]
	}

	threshold(src) {

		const threshold = this.level

		let dst = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
	
			if(src.data[i + 0] < threshold) {
				dst.data[i + 0] = 0
			}
			else {
				dst.data[i + 0] = 255
			}

			if(src.data[i + 1] < threshold) {
				dst.data[i + 1] = 0
			}
			else {
				dst.data[i + 1] = 255
			}

			if(src.data[i + 2] < threshold) {
				dst.data[i + 2] = 0
			}
			else {
				dst.data[i + 2] = 255
			}

			dst.data[i + 3] = 255
		}
		return dst
	}
}


class Node_RGB_Splitter extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "input", name: "input"}, {type: "output", name: "R"}, {type: "output", name: "G"}, {type: "output", name: "B"}]
		super(options)
		
		this.build({ title: "RGB Splitter" })
	}

	process() {

		const conn = this.get_input_connection("input")
		if(conn === null) return

		const input = this.get_input("input")
		this.split(input)
	}

	split(src) {
		
		const dstR = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
			dstR.data[i + 0] = src.data[i + 0]
			dstR.data[i + 1] = src.data[i + 0]
			dstR.data[i + 2] = src.data[i + 0]
			dstR.data[i + 3] = 255
		}
		this.outputs["R"] = dstR

		const dstG = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
			dstG.data[i + 0] = src.data[i + 1]
			dstG.data[i + 1] = src.data[i + 1]
			dstG.data[i + 2] = src.data[i + 1]
			dstG.data[i + 3] = 255
		}
		this.outputs["G"] = dstG

		const dstB = new ImageData(src.width, src.height)
		for (let i=0; i<src.data.length; i+=4) {
			dstB.data[i + 0] = src.data[i + 2]
			dstB.data[i + 1] = src.data[i + 2]
			dstB.data[i + 2] = src.data[i + 2]
			dstB.data[i + 3] = 255
		}
		this.outputs["B"] = dstB

		this.outputs["default"] = this.outputs["R"]

	}
}


class Node_RGB_Merger extends Node_Template {

	constructor(options = {}) {

		options.connections = [{type: "input", name: "R"}, {type: "input", name: "G"}, {type: "input", name: "B"}, {type: "output", name: "output"} ]
		super(options)

		this.build({title: "RGB Merger"})
	}

	process() {
		if(	this.get_input_connection("R") === null && this.get_input_connection("G") === null && this.get_input_connection("B") === null) return

		const r = this.get_input("R")
		const g = this.get_input("G")
		const b = this.get_input("B")
		this.outputs["output"] = this.merge(r, g, b)
		this.outputs["default"] = this.outputs["output"]
	}

	merge(r, g, b) {

		let w, h
		if(r !== null) {
			w = r.width
			h = r.height
		}
		else if(g !== null) {
			w = g.width
			h = g.height
		}
		else if(b !== null) {
			w = b.width
			h = b.height
		}

		const dst = new ImageData(w, h)
		for (let i=0; i<dst.data.length; i+=4) {
			dst.data[i + 0] = (r !== null ? r.data[i + 0] : 0)
			dst.data[i + 1] = (g !== null ? g.data[i + 1] : 0)
			dst.data[i + 2] = (b !== null ? b.data[i + 2] : 0)
			dst.data[i + 3] = 255
		}

		return dst
	}
}


class Node_Output extends Node_Template {

	constructor(options = {}) {
		options.connections = [{type: "input", name: "input"}]
		super(options)
		
		this.build({title: "Output"})
	}

	process() {

		const conn = this.get_input_connection("input")
		if(conn === null) return

		const input = this.get_input("input")
		this.outputs["output"] = input
		this.outputs["default"] = this.outputs["output"]
	}
}

