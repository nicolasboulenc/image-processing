"use strict";
// @ts-check

const app = {
	scale: 1,				// scale image on canvas?
	canvas: null,
	ctx: null,
	id: 0,					// used to generate ids
	components: [],			// list of { node: node, draggable: draggable }
	connections: [],		// list of { output: output_node, input: input_node, line: leader_line }
	selected_node: null,	// selected node
	rendering_node: null,	// rendered node
	conn_start:  null,		// when creating connection, starting html elem
	conn_line : null,		// the LeaderLine object used to connect
}


init()


function init() {

	app.canvas = document.getElementById('canvas')
	app.ctx = canvas.getContext('2d')

	const elems = document.querySelectorAll('[data-op]')
	for(const elem of elems) {
		elem.addEventListener('click', button_onclick)
	}

	// const resizeObserver = new ResizeObserver(ui_onresize)
	// resizeObserver.observe(document.querySelector(".ui"));

	document.addEventListener('keypress', window_onkeypressed)
	window.addEventListener('mouseup', window_onmouseup)
	window.addEventListener('mousemove', window_onmousemove)
}


// function ui_onresize(entries) {
// 	const bbox = entries[0].contentRect
// 	console.log(bbox)
// 	for(const comp of app.components) {
// 		comp.draggable.containment = entries[0]
// 	}
// }


function button_onclick(evt) {

	let node = null
	let op = evt.currentTarget.dataset['op']

	const options = { id: generate_id(), callback: render }

	if(op === 'image') {
		options.params = ['img/viking.jpg', 'img/david.png', 'img/surma.png']
		node = new Node_Image(options)
	}
	else if(op === 'brightness') {
		node = new Node_Brightness(options)
	}
	else if(op === 'contrast') {
		node = new Node_Contrast(options)
	}
	else if(op === 'inverted') {
		node = new Node_Inverted(options)
	}
	else if(op === 'gray') {
		node = new Node_Gray(options)
	}
	else if(op === 'threshold') {
		node = new Node_Threshold(options)
	}
	else if(op === 'rgb-adjuster') {
		node = new Node_RGB_Adjuster(options)
	}
	else if(op === 'rgb-splitter') {
		node = new Node_RGB_Splitter(options)
	}
	else if(op === 'rgb-merger') {
		node = new Node_RGB_Merger(options)
	}
	else if(op === 'bayer') {
		node = new Node_Bayer_Matrix(options)
	}
	else if(op === 'dither-threshold') {
		node = new Node_Dither_Threshold(options)
	}
	else if(op === 'output') {
		node = new Node_Output(options)
	}

	document.querySelector('.components').append(node.elem)

	node.elem.addEventListener('mouseover', node_onmouseover)	// to select component
	node.elem.addEventListener('mouseout', node_onmouseout)		// to de-select component

	// to connect components
	let elems = node.elem.querySelectorAll('.connections .output > .connector')
	for(const elem of elems) {
		elem.addEventListener('mousedown', connector_onmousedown)	
	}

	elems = node.elem.querySelectorAll('.connections .input > .connector')
	for(const elem of elems) {
		elem.addEventListener('mouseup', connector_onmouseup)
	}


	// create draggable
	const draggable = new PlainDraggable(node.elem)
	draggable.handle = node.elem.querySelector(".title")
	draggable.onDrag = node_ondrag
	app.components.push({node: node, draggable: draggable})

	if(node !== null && app.components.length === 1) {
		make_rendering(node.id)
		render()
	}
}


function render() {

	if(app.rendering_node === null) return

	app.rendering_node.is_stale = true
	app.rendering_node.process_all()

	const buffer = app.rendering_node.get_output()
	if(buffer === null) return

	app.canvas.width = buffer.width / app.scale
	app.canvas.height = buffer.height / app.scale
	app.ctx.putImageData(buffer, 0, 0)
}


function make_selected(id) {

	// node already selected
	if(app.selected_node !== null && app.selected_node.id === id) return
	
	// remove selected class
	if(app.selected_node !== null) {
		app.selected_node.elem.classList.remove("selected")
	}
	app.selected_node = null

	// add selected class
	if(id === "") return

	for(const comp of app.components) {
		if(comp.node.id === id) {
			app.selected_node = comp.node
			app.selected_node.elem.classList.add("selected")
			break
		}
	}
}


function make_rendering(id) {

	if(app.rendering_node !== null && app.rendering_node.id === id) return
	
	if(app.rendering_node !== null) {
		app.rendering_node.elem.classList.remove("rendering")
	}

	for(const comp of app.components) {
		if(comp.node.id === id) {
			app.rendering_node = comp.node
			app.rendering_node.elem.classList.add("rendering")
			break
		}
	}
}


function generate_id() {
	return `c${ (''+app.id++).padStart(2, '0')}`
}


function connector_onmousedown(evt) {

	// to stop component dragging from connector
	// evt.stopImmediatePropagation()
	// this is not needed since using PlainDraggable handles

	app.conn_start = evt.currentTarget
	const attach = LeaderLine.pointAnchor(document.body, {x: evt.clientX, y: evt.clientY})
	app.conn_line = new LeaderLine(app.conn_start, attach, {dash: {animation: true}})
}


function connector_onmouseup(evt) {

	const conn_end = evt.currentTarget
	const conn_start = app.conn_start

	if(app.conn_start === null) return

	if(conn_start.dataset.id === conn_end.dataset.id) {
		console.log('Connection not created, cannot conenct to self.')
		app.conn_start = null
		app.conn_line.remove()
		app.conn_line = null
		return	
	}

	if(conn_start.dataset.type === conn_end.dataset.type) {
		console.log('Connection not created, same type.')
		app.conn_start = null
		app.conn_line.remove()
		app.conn_line = null
		return	
	}

	let input_node = null
	for(const comp of app.components) {
		if(comp.node.id === conn_end.dataset.id) {
			input_node = comp.node
			break
		}
	}

	let output_node = null
	for(const comp of app.components) {
		if(comp.node.id === conn_start.dataset.id) {
			output_node = comp.node
			break
		}
	}

	const input_name = evt.currentTarget.dataset['name']

	const curr_input = input_node.get_input_connection(input_name)
	if(curr_input !== null && curr_input.id === output_node.id) {
		console.log('Connection not created, connection already exists.')
		app.conn_start = null
		app.conn_line.remove()
		app.conn_line = null
		return
	}
	else if(curr_input !== null) {
		console.error('re-connect')
	}

	const output_name = app.conn_start.dataset["name"]

	output_node.set_output_node(output_name, input_node)
	input_node.set_input_connection(input_name, output_node, output_name)
	const line = new LeaderLine(conn_start, conn_end)
	app.connections.push({ output: output_node, input: input_node, line: line })
	
	app.conn_start = null
	app.conn_line.remove()
	app.conn_line = null

	render()
}


function window_onmouseup(evt) {

	if(app.conn_line !== null) {
		app.conn_start = null
		app.conn_line.remove()
		app.conn_line = null
	}
}


function window_onmousemove(evt) {

	if(app.conn_line !== null) {
		const attach = LeaderLine.pointAnchor(document.body, {x: evt.clientX, y: evt.clientY})
		app.conn_line.end = attach
		app.conn_line.position()
	}
}


function window_onkeypressed(evt) {

	if(evt.code === "KeyD") {
		console.log(`Remove: current ${app.selected_node.id}`)
		app.selected_node.disconnect()

		// remove connections
		const connections = []
		for(const conn of app.connections) {
			// { output: output_node, input: input_node, line: leader_line }
			if(conn.output.id === app.selected_node.id || conn.input.id === app.selected_node.id) {
				conn.line.remove()
			}
			else {
				connections.push(conn)
			}
		}
		app.connections = connections

		// remove components
		const components = []
		for(const comp of app.components) {
			if(comp.node.id === app.selected_node.id) {
				comp.node.elem.remove()
				comp.draggable.remove()
			}
			else {
				components.push(comp)
			}
		}
		app.components = components

		// render
		if(app.selected_node.id === app.rendering_node.id && app.components.length > 0) {
			make_rendering(app.components[0].node.id)
			render()
		}
	}

	if(evt.code === "KeyR") {
		make_rendering(app.selected_node.id)
		render()
	}
}


function node_ondrag(evt) {

	// this is a plain-draggable.js event, this.element === evt.currentTarget
	const id = this.element.id
	for(const conn of app.connections) {
		if(conn.input.id === id || conn.output.id === id) {
			conn.line.position()
		}
	}
}


function node_onmouseover(evt) {

	const id = evt.currentTarget.getAttribute('id')
	make_selected(id)
}


function node_onmouseout(evt) {

	make_selected("")
}

