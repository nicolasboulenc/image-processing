
let draggable = null
let link = null
const links = []

document.addEventListener("mousedown", draggable_mousedown)
document.addEventListener("mouseup", draggable_mouseup)
document.addEventListener("mousemove", draggable_mousemove)

document.addEventListener("mousedown", linkable_mousedown)
document.addEventListener("mouseup", linkable_mouseup)
document.addEventListener("mousemove", linkable_mousemove)

create_node("Node 1")
create_node("Node 2", 300, 400)


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

        const catFound = new CustomEvent("animalfound", { detail: { name: "cat" } });
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

        if(evt.target.classList.contains("anchor")) {
            console.log("linkable_mouseup")
            link_connect(link, evt.target)
            links.push(link)
            link = null			
        }
    }
}


function linkable_mousemove(evt) {
    if(link !== null) {

        const pbox = link.elem.ownerSVGElement.getBoundingClientRect()
        const d = `M ${link.ori.x},${link.ori.y} L ${evt.clientX - pbox.x},${evt.clientY - pbox.y}`
        link.elem.setAttribute("d", d)
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
}


function link_create(elem0, elem1=null) {

    if(elem0 === null) return

    const svg = document.querySelector("svg")
    const pbox = elem0.ownerSVGElement.getBoundingClientRect()
    
    const sbox = elem0.getBoundingClientRect()
    const ori = { x: 0, y: 0 }
    ori.x = sbox.x + sbox.width / 2 - pbox.x
    ori.y = sbox.y + sbox.height / 2 - pbox.y

    const dst = { x: ori.x, y: ori.y }
    if(elem1 !== null) {
        const sbox = elem1.getBoundingClientRect()
        dst.x = sbox.x + sbox.width / 2 - pbox.x
        dst.y = sbox.y + sbox.height / 2 - pbox.y
    }

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
    p.classList.add("link")

    const d = `M ${ori.x},${ori.y} L ${dst.x},${dst.y}`
    p.setAttribute("d", d)

    svg.appendChild(p)

    const obj = { 
        ori: ori, 
        dst: dst, 
        ori_elem: elem0, 
        dst_elem: elem1, 
        elem: p 
    }
    elem0.addEventListener("animalfound", link_callback.bind(obj))

    return obj
}


function link_callback(evt) {

    // console.log(this)
    // console.log(evt.currentTarget)

    const pbox = this.elem.ownerSVGElement.getBoundingClientRect()

    const sbox = this.ori_elem.getBoundingClientRect()
    this.ori.x = sbox.x + sbox.width / 2 - pbox.x
    this.ori.y = sbox.y + sbox.height / 2 - pbox.y

    if(this.dst_elem !== null) {
        const sbox = this.dst_elem.getBoundingClientRect()
        this.dst.x = sbox.x + sbox.width / 2
        this.dst.y = sbox.y + sbox.height / 2
    }

    const d = `M ${this.ori.x},${this.ori.y} L ${this.dst.x},${this.dst.y}`
    this.elem.setAttribute("d", d)
}


function link_connect(link, dst_elem) {

    if(dst_elem === null) return

    const svg = document.querySelector("svg")
    const pbox = dst_elem.ownerSVGElement.getBoundingClientRect()
    
    const sbox = dst_elem.getBoundingClientRect()
    const dst = { x: 0, y: 0 }
    dst.x = sbox.x + sbox.width / 2 - pbox.x
    dst.y = sbox.y + sbox.height / 2 - pbox.y
    const d = `M ${ori.x},${ori.y} L ${dst.x},${dst.y}`
    link.elem.setAttribute("d", d)
    link.dst_elem = dst_elem
    link.dst_elem.addEventListener("animalfound", link_callback.bind(obj))
    link.dst = dst
    return link
}
