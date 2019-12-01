import "./globals"

import { Delaunay } from "d3-delaunay"
// import { promises as fs } from "fs"

import { hba } from "./algorithms/hba"
import { Node } from "./models/node"
import {
	round,
	byPosition,
	isUnique,
	toCoordinate,
	distanceBetween,
	toCartesian,
	info
} from "./helpers"

export const verbosity: "debug" | "info" | "quiet" = "debug"
export const shouldRound = false
export const sensingRange = 1
export const sensingConfidence = 0.8
export const getConfidence = (distance: number) =>
	-1 / (1 + Math.pow(Math.E, (-(distance - 2 * sensingRange) / 0.7) * sensingRange)) + 1
export const numberStaticNodes = 7
export const fieldSize = 5

// /** Create a list of nodes with random coordinates. If `howMany` is ≥ the square of `fieldSize`, it won't work, so don't do that. */
// export function randomlyPlaceNodes(howMany = numberStaticNodes): Node[] {
// 	function make(_: any, id: number) {
// 		return round({
// 			id,
// 			x: Math.random() * fieldSize,
// 			y: Math.random() * fieldSize
// 		})
// 	}

// 	// Let's ensure there are no two nodes that are overlapping each other.

// 	let nodes = Array.from({ length: howMany }).map(make)

// 	let containedDuplicates: boolean

// 	do {
// 		nodes.sort(byPosition)
// 		containedDuplicates = false

// 		for (let i = nodes.length - 1; i >= 0; i--) {
// 			const node = nodes[i]

// 			if (isUnique(node, i, nodes)) {
// 				continue
// 			}

// 			containedDuplicates = true
// 			nodes.splice(i, 1, make(undefined, node.id))
// 		}
// 	} while (containedDuplicates)

// 	// Return our list of unique nodes, sorted by ID, because why not

// 	return nodes.sort((lhs, rhs) => lhs.id - rhs.id)
// }

// const staticNodes = randomlyPlaceNodes()
// const delaunay = Delaunay.from(staticNodes.map(toCartesian))
// const voronoi = delaunay.voronoi([0, 0, fieldSize, fieldSize])

// const holes = Array.from(voronoi.cellPolygons())
// 	.flat()
// 	.map(toCoordinate)
// 	.map(round)
// 	.sort(byPosition)
// 	.filter(isUnique)
// 	.filter((pos) => {
// 		const distances = staticNodes.map((node) => ({
// 			node,
// 			distance: distanceBetween(pos, node)
// 		}))

// 		const closest = distances.reduce((closest, next) =>
// 			closest.distance < next.distance ? closest : next
// 		)

// 		return closest.distance > sensingRange
// 	})
// 	.map((pos) => ({ ...pos, confidence: 0 }))

// const mobileNodes = randomlyPlaceNodes()

// info(`Number nodes: ${mobileNodes.length}`)
// info(`Number holes: ${holes.length}`)

// hba(mobileNodes, holes)

// info(hba(mobileNodes, holes))

info(hba([], []))

// const holeDelauney = Delaunay.from(holes.map(toCartesian))
// const svg = `
//     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fieldSize} ${fieldSize}">
//         <path stroke-width="${(fieldSize * 0.2) /
// 					50}" stroke="black" d="${voronoi.render()}"/>
//         <path stroke="none" fill="black" d="${delaunay.renderPoints(
// 					undefined,
// 					(fieldSize * 0.2) / 50
// 				)}"/>
//         <path stroke-width="${(fieldSize * 0.2) /
// 					50}" stroke="blue" fill="none" d="${delaunay.renderPoints(
// 	undefined,
// 	sensingRange
// )}"/>
//         <path stroke="none" fill="red" d="${holeDelauney.renderPoints(
// 					undefined,
// 					(fieldSize * 0.25) / 50
// 				)}"/>
//     </svg>
// `
// // This will draw the field on an svg, just for funzies
// fs.writeFile(`field.svg`, svg)
