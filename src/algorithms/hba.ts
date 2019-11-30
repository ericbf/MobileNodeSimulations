import { Node } from "../models/node"
import { Hole } from "../models/hole"

export function hba(nodes: Node[], holes: Hole[]): Node[] {
	nodes.length = 0
	holes.length = 0
	const node0: Node = { id: 0, x: 1, y: 2 }
	const node1: Node = { id: 1, x: 2, y: 1 }
	const node2: Node = { id: 2, x: 5, y: 6 }
	const node3: Node = { id: 3, x: 7, y: 8 }
	nodes.push(node0)
	nodes.push(node1)
	//nodes.push(node2)
	//nodes.push(node3)
	const hole0: Hole = { confidence: 0, x: 1, y: 2 }
	const hole1: Hole = { confidence: 1, x: 2, y: 1 }
	const hole2: Hole = { confidence: 2, x: 130, y: 14 }
	const hole3: Hole = { confidence: 3, x: 15, y: 16 }
	holes.push(hole0)
	holes.push(hole1)
	//holes.push(hole2)
	//holes.push(hole3)

	let matSize = 0
	if (nodes.length == holes.length) {
		matSize = nodes.length
	} else if (nodes.length > holes.length) {
		matSize = nodes.length
	} else {
		matSize = holes.length
	}

	const coefMatrix = Array.from({ length: matSize }).map(() => new Array(matSize))

	if (nodes.length == holes.length) {
		for (var i = 0; i < nodes.length; i++) {
			for (var j = 0; j < nodes.length; j++) {
				coefMatrix[i][j] = Math.sqrt(
					Math.pow(nodes[i].x + nodes[i].y, 2) + Math.pow(holes[j].x + holes[j].y, 2)
				)
			}
		}
	}
	if (nodes.length > holes.length) {
		for (var i = 0; i < nodes.length; i++) {
			for (var j = 0; j < nodes.length; j++) {
				if (j < holes.length) {
					coefMatrix[i][j] = Math.sqrt(
						Math.pow(nodes[i].x + nodes[i].y, 2) + Math.pow(holes[j].x + holes[j].y, 2)
					)
				} else {
					coefMatrix[i][j] = Number.POSITIVE_INFINITY
				}
			}
		}
	}
	if (nodes.length < holes.length) {
		for (var i = 0; i < holes.length; i++) {
			for (var j = 0; j < holes.length; j++) {
				if (i < nodes.length) {
					coefMatrix[i][j] = Math.sqrt(
						Math.pow(nodes[i].x + nodes[i].y, 2) + Math.pow(holes[j].x + holes[j].y, 2)
					)
				} else {
					coefMatrix[i][j] = Number.POSITIVE_INFINITY
				}
			}
		}
	}

	console.log(coefMatrix)

	let lineCount = 0
	while (lineCount != matSize) {
		for (var i = 0; i < matSize; i++) {
			let min = Number.POSITIVE_INFINITY
			for (var j = 0; j < matSize; j++) {
				if (coefMatrix[i][j] < min) {
					min = coefMatrix[i][j]
				}
			}
			for (var j = 0; j < matSize; j++) {
				coefMatrix[i][j] = coefMatrix[i][j] - min
			}
		}
		lineCount = matSize
	}

	console.log(coefMatrix)
	return []
}
