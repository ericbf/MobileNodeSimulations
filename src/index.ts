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
	info,
	debug
} from "./helpers"
import { novel } from "./algorithms/novel"

export const verbosity: "debug" | "info" | "quiet" = "debug"
export const shouldRound = true
export const sensingRange = 1.5
export const sensingConfidence = 0.8
export const getConfidence = (distance: number) =>
	-1 / (1 + Math.pow(Math.E, (-(distance - 2 * sensingRange) / 0.7) * sensingRange)) + 1
export const numberStaticNodes = 3
export const fieldSize = 3

/** Create a list of nodes with random coordinates. If `howMany` is ≥ the square of `fieldSize`, it won't work, so don't do that. */
export function randomlyPlaceNodes(howMany = numberStaticNodes): Node[] {
	function make(_: any, id: number) {
		return round({
			id,
			x: Math.random() * fieldSize,
			y: Math.random() * fieldSize
		})
	}

	// Let's ensure there are no two nodes that are overlapping each other.

	let nodes = Array.from({ length: howMany }).map(make)

	let containedDuplicates: boolean

	do {
		nodes.sort(byPosition)
		containedDuplicates = false

		for (let i = nodes.length - 1; i >= 0; i--) {
			const node = nodes[i]

			if (isUnique(node, i, nodes)) {
				continue
			}

			containedDuplicates = true
			nodes.splice(i, 1, make(undefined, node.id))
		}
	} while (containedDuplicates)

	// Return our list of unique nodes, sorted by ID, because why not

	return nodes.sort((lhs, rhs) => lhs.id - rhs.id)
}

function placeField() {
	const staticNodes = randomlyPlaceNodes()
	const delaunay = Delaunay.from(staticNodes.map(toCartesian))
	const voronoi = delaunay.voronoi([0, 0, fieldSize, fieldSize])

	const holes = Array.from(voronoi.cellPolygons())
		.flat()
		.map(toCoordinate)
		.map(round)
		.sort(byPosition)
		.filter(isUnique)
		.filter((pos) => {
			const distances = staticNodes.map((node) => ({
				node,
				distance: distanceBetween(pos, node)
			}))

			const closest = distances.reduce((closest, next) =>
				closest.distance < next.distance ? closest : next
			)

			return closest.distance > sensingRange
		})
		.map((pos) => ({ ...pos, confidence: 0 }))

	const mobileNodes = randomlyPlaceNodes()

	return { staticNodes, mobileNodes, holes }
}

let hbaWin = 0
let hbaTotalTotal = 0
let hbaWinTotal = 0
let hbaLoseTotal = 0

let tie = 0

let novelWin = 0
let novelTotalTotal = 0
let novelWinTotal = 0
let novelLoseTotal = 0

for (let i = 0; i < 1000 || hbaWinTotal === 0; i++) {
	const { mobileNodes, holes } = placeField()

	debug(`Number nodes: ${mobileNodes.length}`)
	debug(`Number holes: ${holes.length}`)

	const hbaDispatch = hba(mobileNodes, holes)
	const hbaTotal = getTotal(mobileNodes, hbaDispatch)

	hbaTotalTotal += hbaTotal

	const novelDispatch = novel(mobileNodes, holes)
	const novelTotal = getTotal(mobileNodes, novelDispatch)

	novelTotalTotal += novelTotal

	if (hbaTotal < novelTotal) {
		hbaWin += 1

		hbaWinTotal += hbaTotal
		novelLoseTotal += novelTotal
	} else if (hbaTotal === novelTotal) {
		tie += 1
	} else {
		novelWin += 1

		hbaLoseTotal += hbaTotal
		novelWinTotal += novelTotal
	}
}

info(`HBA won ${hbaWin}, tied ${tie}, novel won ${novelWin}.`)
info(
	`HBA total was ${hbaTotalTotal.toFixed(1)}, novel total was ${novelTotalTotal.toFixed(
		1
	)}.`
)
info(
	`On average, novel was ${((1 - novelTotalTotal / hbaTotalTotal) * 100).toFixed(
		0
	)}% better.`
)
info(
	novelWinTotal > 0
		? `For its wins, novel was ${((1 - novelWinTotal / hbaLoseTotal) * 100).toFixed(
				0
		  )}% better.`
		: `Novel never won.`
)
info(
	hbaWinTotal > 0
		? `For its wins, hba was ${((1 - hbaWinTotal / novelLoseTotal) * 100).toFixed(
				0
		  )}% better.`
		: `HBA never won.`
)

function getTotal(start: Node[], end: Node[]) {
	return start.reduce((total, node) => {
		const ending = end.find(({ id }) => id === node.id)

		return total + (ending ? distanceBetween(ending, node) : 0)
	}, 0)
}
// info(hba([], []))

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
