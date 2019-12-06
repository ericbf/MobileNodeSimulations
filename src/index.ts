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
import { Hole } from "./models/hole"

export const verbosity: "debug" | "info" | "quiet" = "info" as "debug" | "info" | "quiet"
export const shouldRound = true
export const sensingRange = 5
export const sensingConfidence = 0.8
export const getConfidence = (distance: number) =>
	-1 / (1 + Math.pow(Math.E, (-(distance - 2 * sensingRange) / 0.7) * sensingRange)) + 1
export const numberStaticNodes = 28
export const fieldSize = 50
const trials = 100

// debug(`Matrix:\n${stringify(matrices[0])}`)

// let start = performance.now()

// const greedyResults = matrices.map(greedyLines)

// debug(`Greedy took ${performance.now() - start}`)

// start = performance.now()

// const wikiResults = matrices.map(wikiLines)

// debug(`Wiki took ${performance.now() - start}`)

// for (const [i, greedyResult] of greedyResults.entries()) {
// 	if (greedyResult.length !== wikiResults[i].length) {
// 		debug(
// 			`Greedy (${greedyResult.length}):`,
// 			greedyResult,
// 			`; wiki (${wikiResults[i].length}):`,
// 			wikiResults[i],
// 			`; matrix:\n${stringify(matrices[i])}`
// 		)
// 	}
// }

let tie = 0

class Stats {
	wins = 0
	total = 0
	winTotal = 0
	loseTotal = 0
}

const hbaStats = new Stats()
const novelStats = new Stats()

const dots = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

for (let i = 0; i < trials; i++) {
	const { mobileNodes, holes, distanceMatrix } = placeField()

	if (verbosity === "info") {
		process.stdout.cursorTo && process.stdout.cursorTo(0)
		process.stdout.write(`${dots[i % dots.length]} Working on ${i + 1}/${trials}`)
	}

	debug(`Number nodes: ${mobileNodes.length}`)
	debug(`Number holes: ${holes.length}`)

	const hbaTotal = getTotal(mobileNodes, holes, distanceMatrix, hba(distanceMatrix))

	hbaStats.total += hbaTotal

	const novelTotal = getTotal(mobileNodes, holes, distanceMatrix, novel(distanceMatrix))

	novelStats.total += novelTotal

	if (hbaTotal < novelTotal) {
		hbaStats.wins += 1

		hbaStats.winTotal += hbaTotal
		novelStats.loseTotal += novelTotal
	} else if (hbaTotal === novelTotal) {
		tie += 1
	} else {
		novelStats.wins += 1

		hbaStats.loseTotal += hbaTotal
		novelStats.winTotal += novelTotal
	}
}

if (verbosity === "info") {
	process.stdout.cursorTo && process.stdout.cursorTo(0)
}

info(`HBA won ${hbaStats.wins}, tied ${tie}, novel won ${novelStats.wins}.`)
info(
	`HBA total was ${hbaStats.total.toFixed(1)}, novel total was ${novelStats.total.toFixed(
		1
	)}.`
)
info(
	`On average, novel was ${((1 - novelStats.total / hbaStats.total) * 100).toFixed(
		0
	)}% better.`
)
info(
	novelStats.winTotal > 0
		? `When novel won, it was ${(
				(1 - novelStats.winTotal / hbaStats.loseTotal) *
				100
		  ).toFixed(0)}% better.`
		: `Novel never won.`
)
info(
	hbaStats.winTotal > 0
		? `When HBA won, it was ${(
				(1 - hbaStats.winTotal / novelStats.loseTotal) *
				100
		  ).toFixed(0)}% better.`
		: `HBA never won.`
)

function getTotal(
	nodes: Node[],
	holes: Hole[],
	distanceMatrix: number[][],
	dispatch: number[][]
) {
	return nodes
		.map((_, column) => {
			const row = dispatch[column].slice(0, holes.length).findIndex((n) => n > 0)

			return row >= 0 ? distanceMatrix[column][row] * dispatch[column][row] : 0
		})
		.reduce((trans, value) => trans + value)
}

/** Create a square distance matrix with each column is the distance from a node to each hole. If the number of nodes isn't equal the number of holes, fill the array with `NaN` to make it square. */
export function createDistanceMatrix(nodes: Node[], holes: Hole[]) {
	const size = Math.max(nodes.length, holes.length)

	const matrix = Array.from({ length: size }).map((_, i) =>
		Array.from({ length: size }).map((_, j) => {
			const node = nodes[i]
			const hole = holes[j]

			return !node || !hole ? NaN : distanceBetween(node, hole).round(shouldRound ? 0 : 3)
		})
	)

	const max = Math.max(...matrix.flat(1).filter(isFinite))

	for (const column of matrix) {
		for (const [index, value] of column.entries()) {
			if (!isFinite(value)) {
				column[index] = max
			}
		}
	}

	return matrix
}

/** Create a list of nodes with random coordinates. If `howMany` is ≥ the square of `fieldSize`, it won't work, so don't do that. */
function randomlyPlaceNodes(howMany = numberStaticNodes): Node[] {
	function make(_: any, id: number) {
		return {
			id,
			x: Math.random() * fieldSize,
			y: Math.random() * fieldSize
		}
	}

	// Let's ensure there are no two nodes that are overlapping each other.

	let nodes = Array.from({ length: howMany })
		.map(make)
		.map(round)

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

	const holes: Hole[] = Array.from(voronoi.cellPolygons())
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
		.map((pos) => ({ ...pos }))

	const mobileNodes = randomlyPlaceNodes()

	const distanceMatrix = createDistanceMatrix(mobileNodes, holes)

	return { staticNodes, mobileNodes, holes, distanceMatrix }
}

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
