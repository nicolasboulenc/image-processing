
class ID_Generator {
    #id
    constructor() {
        this.id = 1
    }
    next(prefix) {
        return `${prefix}${"0".repeat(8-this.id.toString().length)}${this.id++}`
    }
}

let draggable = null
let link = null


document.addEventListener("mousedown", draggable_mousedown)
document.addEventListener("mouseup", draggable_mouseup)
document.addEventListener("mousemove", draggable_mousemove)

document.addEventListener("mousedown", linkable_mousedown)
document.addEventListener("mouseup", linkable_mouseup)
document.addEventListener("mousemove", linkable_mousemove)

create_node("Node 1")
create_node("Node 2", 300, 400)
create_node("Node 3", 600, 400)


const id_gen = new ID_Generator()

function draggable_mousedown(evt) {

    if(evt.target.classList.contains("handle")) {
        draggable = evt.target.parentElement
        while(draggable !== null && draggable.classList.contains("draggable") !== true) {
            draggable = draggable.parentElement
        }
    }
    else if(evt.target.classList.contains("draggable")) {
        draggable = evt.target
    }
    
    if(draggable !== null) {
        console.log("draggable_mousedown")
        const cbox = draggable.getBoundingClientRect()

        offset_x = cbox.x - evt.clientX
        offset_y = cbox.y - evt.clientY

        const sbox = draggable.getBBox()

        const state = { is_dragging: true, origin: {x: sbox.x, y: sbox.y}, offset: {x: offset_x, y: offset_y} }
        draggable.dataset["state"] = JSON.stringify(state)

        if(draggable.transform.baseVal.length === 0) {
            const transform = document.querySelector("svg").createSVGTransform()
            draggable.transform.baseVal.appendItem(transform)
        }
        // svg equivalent to z-index
        document.querySelector("svg").appendChild(draggable)
    }
}


function draggable_mouseup(evt) {

    if(draggable !== null) {
        delete draggable.dataset["state"]
        draggable = null
    }
}


function draggable_mousemove(evt) {

    if(draggable !== null) {

        const data = draggable.dataset.state
        if(typeof data === "undefined") return

        const state = JSON.parse(data)
        const pbox = draggable.ownerSVGElement.getBoundingClientRect()
        const x = evt.clientX - pbox.x + state.offset.x - state.origin.x
        const y = evt.clientY - pbox.y + state.offset.y - state.origin.y

        draggable.transform.baseVal[0].setTranslate(x, y)

        const catFound = new CustomEvent("linkable-event", { detail: { name: "cat" } });
        const anchors = draggable.querySelectorAll(".anchor")
        for(const anchor of anchors) {
            anchor.dispatchEvent(catFound)
        }
    }
}


function linkable_mousedown(evt) {
    if(evt.target.classList.contains("anchor")) {
        console.log("linkable_mousedown")

        link = link_create(evt.target)
    }
}


function linkable_mouseup(evt) {
    if(link !== null) {
        let anchor = null
        const elems = document.elementsFromPoint(evt.clientX, evt.clientY)
        for(const elem of elems) {
            if(elem.classList.contains("anchor")) {
                anchor = elem
                break
            }
        }

        if(anchor === null) {
            console.log("linkable_mouseup")
            link.parentElement.remove()
            link = null
        }
        else {
            console.log("linkable_mouseup")
            const src = document.querySelector(`[data-linkable-id="${link.dataset.linkableSrc}"]`)
            const new_link = link_create(src, anchor)

            link.parentElement.remove()
            link = null
        }
    }
}


function linkable_mousemove(evt) {
    if(link !== null) {

        const pbox = link.ownerSVGElement.getBoundingClientRect()

        const src = document.querySelector(`[data-linkable-id="${link.dataset.linkableSrc}"]`)
        const bbox = src.getBoundingClientRect()
        const src_x = bbox.x + bbox.width / 2 - pbox.x
        const src_y = bbox.y + bbox.height / 2 - pbox.y

        const d = `M ${src_x},${src_y} L ${evt.clientX - pbox.x},${evt.clientY - pbox.y}`
        link.setAttribute("d", d)
    }
}


function create_node(title="Node 1", x=50, y=250) {
    
    const NODE_WIDTH = 150
    const CONN_WIDTH = 16
    const svg = document.querySelector("svg")

    const text = `
        <rect x="0" y="0" width="${NODE_WIDTH}" height="70" rx="2" ry="2" class="header handle" />
        <text x="${CONN_WIDTH/2}" y="17" width="${NODE_WIDTH}" class="title handle">${title}</text>
        <rect x="0" y="20" width="${NODE_WIDTH}" height="2" class="contents" />
        <rect x="0" y="20" width="${NODE_WIDTH}" height="70" rx="2" ry="2" class="contents" />
        <rect x="-${CONN_WIDTH/2}" y="37" width="${CONN_WIDTH}" height="${CONN_WIDTH}" rx="${CONN_WIDTH/2}" ry="${CONN_WIDTH/2}" class="connector anchor" />
        <rect x="${NODE_WIDTH-CONN_WIDTH/2}" y="37" width="${CONN_WIDTH}" height="${CONN_WIDTH}" rx="${CONN_WIDTH/2}" ry="${CONN_WIDTH/2}" class="connector anchor" />
        `

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.classList.add("draggable")
    g.classList.add("node")
    g.innerHTML = text

    const transform = svg.createSVGTransform()
    transform.setTranslate(x, y)
    g.transform.baseVal.appendItem(transform)
    svg.appendChild(g)
    return g
}


function link_create(src_elem, dst_elem=null) {

    if(src_elem === null) return

    const svg = document.querySelector("svg")
    const pbox = src_elem.ownerSVGElement.getBoundingClientRect()
    
    if(typeof src_elem.dataset.linkableId === "undefined") {
        src_elem.dataset.linkableId = id_gen.next("A")
    }
    const bbox = src_elem.getBoundingClientRect()

    const src_x = bbox.x + bbox.width / 2 - pbox.x
    const src_y = bbox.y + bbox.height / 2 - pbox.y

    let dst_x = src_x
    let dst_y = src_y
    if(dst_elem !== null) {
        if(typeof dst_elem.dataset.linkableId == "undefined") {
            dst_elem.dataset.linkableId = id_gen.next("A")
        }
        dst_elem.dataset.linkableType = "dst"
        const bbox = dst_elem.getBoundingClientRect()
        dst_x = bbox.x + bbox.width / 2 - pbox.x
        dst_y = bbox.y + bbox.height / 2 - pbox.y
    }

    // line
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
    p.dataset.linkableSrc = src_elem.dataset.linkableId
    p.classList.add("link")
    if(dst_elem !== null) {
        p.dataset.linkableDst = dst_elem.dataset.linkableId
    }

    const d = `M ${src_x},${src_y} L ${dst_x},${dst_y}`
    p.setAttribute("d", d)

    // arrow
    const a = document.createElementNS("http://www.w3.org/2000/svg", "path")
    a.classList.add("arrow")

    const arrow_angle = Math.PI / 4
    const arrow_length = 20
    const line_angle = Math.tanh((dst_y - src_y) / (dst_x - src_x))
    console.log(line_angle)
    const x1 = dst_x + Math.cos(arrow_angle - line_angle) * arrow_length
    const y1 = dst_y + Math.sin(arrow_angle - line_angle) * arrow_length

    const x2 = dst_x - Math.cos(arrow_angle - line_angle) * arrow_length
    const y2 = dst_y - Math.sin(arrow_angle - line_angle) * arrow_length

    const ad = `M ${x1},${y1} L ${dst_x},${dst_y} L ${x2},${y2}`
    a.setAttribute("d", ad)


    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.classList.add("linkable")
    g.appendChild(p)
    g.appendChild(a)
    svg.appendChild(g)

    src_elem.addEventListener("linkable-event", link_callback)
    if(dst_elem !== null) {
        dst_elem.addEventListener("linkable-event", link_callback)
    }

    return p
}


function link_callback(evt) {

    const anchor = evt.target

    let links = document.querySelectorAll(`[data-linkable-src="${anchor.dataset.linkableId}"]`)
    for(const link of links) {
        link_update(link)
    }

    links = document.querySelectorAll(`[data-linkable-dst="${anchor.dataset.linkableId}"]`)
    for(const link of links) {
        link_update(link)
    }
}


function link_update(link) {

    const pbox = link.ownerSVGElement.getBoundingClientRect()

    const src = document.querySelector(`[data-linkable-id="${link.dataset.linkableSrc}"]`)
    const sbox = src.getBoundingClientRect()
    const src_x = sbox.x + sbox.width / 2 - pbox.x
    const src_y = sbox.y + sbox.height / 2 - pbox.y

    const dst = document.querySelector(`[data-linkable-id="${link.dataset.linkableDst}"]`)
    const dbox = dst.getBoundingClientRect()
    const dst_x = dbox.x + dbox.width / 2 - pbox.x
    const dst_y = dbox.y + dbox.height / 2 - pbox.y

    const d = `M ${src_x},${src_y} L ${dst_x},${dst_y}`
    link.setAttribute("d", d)
}
