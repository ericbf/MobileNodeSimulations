import "./globals"

import { Delaunay } from "d3-delaunay"
import assert from "assert"
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
	debug,
	transposed
} from "./helpers"
import { batteryAware } from "./algorithms/battery-aware"
import { Hole } from "./models/hole"
import { tba } from "./algorithms/tba"

export const verbosity: "debug" | "info" | "quiet" = "info" as "debug" | "info" | "quiet"
export const shouldRound = true
export const sensingRange = 3
export const numberStaticNodes = 5
export const fieldSize = 10
export const maxBattery = fieldSize * 3
export const minBattery = Math.sqrt(fieldSize * fieldSize * 2)
const trials = 10000

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

let hbaTotal = 0
let batteryAwareTotal = 0
let tbaTotal = 0

let hbaMin = 0
let batteryAwareMin = 0

const dots = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

for (let i = 0; i < trials; i++) {
	const { mobileNodes, holes, distanceMatrix } = placeField()

	if (verbosity === "info") {
		process.stdout.cursorTo && process.stdout.cursorTo(0)
		process.stdout.write(`${dots[i % dots.length]} Working on ${i + 1}/${trials}`)
	}

	debug(`Number nodes: ${mobileNodes.length}`)
	debug(`Number holes: ${holes.length}`)

	const hbaStats = getStats(mobileNodes, holes, distanceMatrix, hba(distanceMatrix))

	const batteryAwareStats = getStats(
		mobileNodes,
		holes,
		distanceMatrix,
		batteryAware(distanceMatrix, mobileNodes, holes, hba)
	)

	debug(`hba stats: ${JSON.stringify(hbaStats, null, 4)}`)
	debug(`Battery aware stats: ${JSON.stringify(batteryAwareStats, null, 4)}`)

	hbaTotal += hbaStats.total
	batteryAwareTotal += batteryAwareStats.total

	hbaMin += hbaStats.minBatteryAfter
	batteryAwareMin += batteryAwareStats.minBatteryAfter
	// tbaTotal += tbaIteration
}

if (verbosity === "info") {
	process.stdout.clearLine && process.stdout.clearLine(0)
	process.stdout.cursorTo && process.stdout.cursorTo(0)
}

info(
	`HBA total: ${hbaTotal.toFixed(1)}
Battery Aware total: ${batteryAwareTotal.toFixed(1)}`
)

hbaMin /= trials
batteryAwareMin /= trials

info(
	`HBA average min battery: ${hbaMin.toFixed(1)}
Battery Aware average min battery: ${batteryAwareMin.toFixed(1)}`
)

function getStats(
	nodes: Node[],
	holes: Hole[],
	distanceMatrix: number[][],
	dispatch: number[][]
) {
	const nodeMovements = nodes.map((_, column) => {
		const row = dispatch[column].slice(0, holes.length).findIndex((n) => n > 0)

		return row >= 0 ? distanceMatrix[column][row] : 0
	})

	assert(
		dispatch.every((col) => col.some((value) => value === 1)),
		"Not every column dispatched"
	)

	const total = nodeMovements.reduce((trans, value) => trans + value)

	const totalBatteryBefore = nodes.reduce((trans, { battery }) => trans + battery, 0)
	const averageBatteryBefore = totalBatteryBefore / nodes.length

	const nodeBatteriesBefore = nodes.map(({ battery }) => battery)

	const maxBatteryBefore = Math.max(...nodes.map(({ battery }) => battery))
	const minBatteryBefore = Math.min(...nodes.map(({ battery }) => battery))

	const nodeBatteriesAfter = nodes.map(({ battery }, i) => {
		return battery - nodeMovements[i]
	})

	const maxBatteryAfter = Math.max(...nodeBatteriesAfter)
	const minBatteryAfter = Math.min(...nodeBatteriesAfter)

	const totalBatteryAfter = nodeBatteriesAfter.reduce(
		(trans, battery) => trans + battery,
		0
	)
	const averageBatteryAfter = totalBatteryAfter / nodes.length

	const totalBatteryUsage = totalBatteryBefore - totalBatteryAfter
	const averageBatteryUsage = averageBatteryBefore - averageBatteryAfter

	return {
		total,
		nodeBatteriesBefore,
		maxBatteryBefore,
		minBatteryBefore,
		totalBatteryBefore,
		averageBatteryBefore,
		nodeBatteriesAfter,
		maxBatteryAfter,
		minBatteryAfter,
		totalBatteryAfter,
		averageBatteryAfter,
		totalBatteryUsage,
		averageBatteryUsage
	}
}

/** Create a square distance matrix with each column is the distance from a node to each hole. If the number of nodes isn't equal the number of holes, fill the array with `NaN` to make it square. */
export function createDistanceMatrix(nodes: Node[], holes: Hole[]) {
	// return transposed([
	// 	[4, 3, 5, 4, 6, 0, 0],
	// 	[0, 7, 7, 3, 0, 2, 2],
	// 	[0, 9, 8, 4, 0, 2, 2],
	// 	[3, 0, 2, 2, 6, 0, 0],
	// 	[0, 2, 2, 0, 4, 2, 2],
	// 	[5, 0, 0, 3, 10, 0, 0],
	// 	[2, 2, 0, 0, 7, 1, 1]
	// ])

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
			y: Math.random() * fieldSize,
			battery: (Math.random() * minBattery + maxBattery - minBattery).round(
				shouldRound ? 0 : 3
			)
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
