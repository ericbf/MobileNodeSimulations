import "./globals"

import { Stats } from "fast-stats"
import { Delaunay } from "d3-delaunay"
import assert from "assert"
import { promises as fs, WriteStream, createWriteStream, accessSync } from "fs"

import { hba } from "./algorithms/hba"
import { Node } from "./models/node"
import {
	round,
	byPosition,
	isUnique,
	toCoordinate,
	distanceBetween,
	toCartesian,
	findMatching
} from "./helpers"
import { batteryAware } from "./algorithms/battery-aware"
import { Hole } from "./models/hole"
import { tba } from "./algorithms/tba"

export const shouldRound = true

const verbosity = "info" as "debug" | "info" | "quiet"

export const debug = verbosity === "debug"
export const info = debug || verbosity === "info"

const writeToFile = true
const trials = 50

const dots = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

const Settings = [
	{
		sensingRange: 1.75,
		numberStaticNodes: 10,
		fieldSize: 10
	},
	{
		sensingRange: 3,
		numberStaticNodes: 20,
		fieldSize: 20
	},
	{
		sensingRange: 4,
		numberStaticNodes: 30,
		fieldSize: 30
	}
]

let file: WriteStream | undefined

while (Settings.length > 0) {
	const settings = Settings.shift()!
	const { sensingRange, numberStaticNodes, fieldSize } = settings
	const maxBattery = fieldSize * 3
	const minBattery = Math.sqrt(fieldSize * fieldSize * 2)

	for (let i = 0; i < trials; i++) {
		const { mobileNodes, holes, distanceMatrix, voronoi, delaunay } = placeField({
			howMany: numberStaticNodes,
			sensingRange,
			fieldSize,
			maxBattery,
			minBattery
		})

		if (verbosity === "info") {
			process.stdout.cursorTo && process.stdout.cursorTo(0)
			process.stdout.write(`${dots[i % dots.length]} Working on ${i + 1}/${trials}`)
		}

		if (debug) {
			console.log(`Number nodes: ${mobileNodes.length}`)
			console.log(`Number holes: ${holes.length}`)
		}

		const hbaDispatch = hba(distanceMatrix)
		const batteryHbaDispatch = batteryAware(distanceMatrix, mobileNodes, hba)
		const tbaDispatch = tba(distanceMatrix)
		const batteryTbaDispatch = batteryAware(distanceMatrix, mobileNodes, tba)

		const hbaStats = getStats("hba", mobileNodes, holes, distanceMatrix, hbaDispatch)

		if (writeToFile && !file) {
			const findName = (num?: number): string => {
				const name = `output/stats${num ? `-${num}` : ""}.csv`

				try {
					accessSync(name)

					if (num && num >= 5000) {
						throw new Error("Tried too many times.")
					}

					return findName((num ?? 1) + 1)
				} catch {}

				return name
			}
			file = createWriteStream(findName(), { flags: "wx" })
			file.write(getHeading(settings, hbaStats))

			const holeDelauney = Delaunay.from(holes.map(toCartesian))
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fieldSize} ${fieldSize}">
    <path stroke-width="${(fieldSize * 0.2) /
			50}" stroke="black" d="${voronoi.render()}"/>
    <path stroke="none" fill="black" d="${delaunay.renderPoints(
			undefined,
			(fieldSize * 0.2) / 50
		)}"/>
    <path stroke-width="${(fieldSize * 0.2) /
			50}" stroke="blue" fill="none" d="${delaunay.renderPoints(
				undefined,
				sensingRange
			)}"/>
    <path stroke="none" fill="red" d="${holeDelauney.renderPoints(
			undefined,
			(fieldSize * 0.25) / 50
		)}"/>
</svg>
`
			// This will draw the field on an svg, just for funzies
			fs.writeFile(`output/field.svg`, svg, {
				flag: "wx"
			}).catch(() => {
				function tryAgain(num: number) {
					return () => {
						if (num < 500) {
							fs.writeFile(`output/field-${num}.svg`, svg, {
								flag: "wx"
							}).catch(tryAgain(num + 1))
						}
					}
				}

				tryAgain(2)()
			})
		}

		file?.write(getRow(settings, hbaStats))

		const batteryHbaStats = getStats(
			"battery-hba",
			mobileNodes,
			holes,
			distanceMatrix,
			batteryHbaDispatch
		)

		file?.write(getRow(settings, batteryHbaStats))

		const tbaStats = getStats("tba", mobileNodes, holes, distanceMatrix, tbaDispatch)

		file?.write(getRow(settings, tbaStats))

		const batteryTbaStats = getStats(
			"battery-tba",
			mobileNodes,
			holes,
			distanceMatrix,
			batteryTbaDispatch
		)

		file?.write(getRow(settings, batteryTbaStats))

		if (debug) {
			console.log(`hba stats: ${JSON.stringify(hbaStats, null, 4)}`)
		}
		if (debug) {
			console.log(`Battery hba stats: ${JSON.stringify(batteryHbaStats, null, 4)}`)
		}
		if (debug) {
			console.log(`Tba stats: ${JSON.stringify(tbaStats, null, 4)}`)
		}
		if (debug) {
			console.log(`Battery tba stats: ${JSON.stringify(batteryTbaStats, null, 4)}`)
		}
	}

	if (verbosity === "info") {
		process.stdout.clearLine?.(0)
		process.stdout.cursorTo?.(0)
	}
}

file?.close()

function getHeading(...objs: any[]) {
	return (
		objs
			.flatMap(Object.keys)
			.map(String)
			.sort((a, b) => a.localeCompare(b))
			.map((k) => (/[,"]/.test(k) ? `"${k.replace('"', '""')}"` : k))
			.join(",") + "\n"
	)
}

function getRow(...objs: any[]) {
	return (
		objs
			.flatMap(Object.entries)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, v]) => String(v))
			.map((v) => (/[,"]/.test(v) ? `"${v.replace('"', '""')}"` : v))
			.join(",") + "\n"
	)
}

function getStats(
	key: string,
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

	const total = nodeMovements.reduce((trans, value) => trans + value).round(3)

	const nodeBatteriesBefore = nodes.map(({ battery }) => battery)
	const nodeBatteriesAfter = nodes.map(({ battery }, i) => {
		return battery - nodeMovements[i]
	})

	const batteryStatsBefore = (new Stats().push(nodeBatteriesBefore) as unknown) as Stats
	const batteryStatsAfter = (new Stats().push(nodeBatteriesAfter) as unknown) as Stats

	const minBatteryBefore = Math.min(...nodeBatteriesBefore).round(3)
	const minBatteryAfter = Math.min(...nodeBatteriesAfter).round(3)

	const maxBatteryBefore = Math.max(...nodeBatteriesBefore).round(3)
	const maxBatteryAfter = Math.max(...nodeBatteriesAfter).round(3)

	const totalBatteryBefore = nodes
		.reduce((trans, { battery }) => trans + battery, 0)
		.round(3)
	const totalBatteryAfter = nodeBatteriesAfter
		.reduce((trans, battery) => trans + battery, 0)
		.round(3)

	const averageBatteryBefore = (totalBatteryBefore / nodes.length).round(3)
	const averageBatteryAfter = (totalBatteryAfter / nodes.length).round(3)

	const totalBatteryUsage = (totalBatteryBefore - totalBatteryAfter).round(3)
	const averageBatteryUsage = (averageBatteryBefore - averageBatteryAfter).round(3)

	return {
		key,
		total,
		batteryBeforeStandardDeviation: batteryStatsBefore.stddev().round(3),
		batteryAfterStandardDeviation: batteryStatsAfter.stddev().round(3),
		batteryBeforeMedian: batteryStatsBefore.median().round(3),
		batteryAfterMedian: batteryStatsAfter.median().round(3),
		totalBatteryBefore,
		averageBatteryBefore,
		maxBatteryAfter,
		minBatteryAfter,
		maxBatteryBefore,
		minBatteryBefore,
		totalBatteryAfter,
		averageBatteryAfter,
		totalBatteryUsage,
		averageBatteryUsage
	}
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

	// for (const column of matrix) {
	// 	for (const [index, value] of column.entries()) {
	// 		if (!isFinite(value)) {
	// 			column[index] = 0
	// 		}
	// 	}
	// }

	return matrix
}

/** Create a list of nodes with random coordinates. If `howMany` is ≥ the square of `fieldSize`, it won't work, so don't do that. */
function randomlyPlaceNodes({
	howMany,
	fieldSize,
	maxBattery,
	minBattery
}: {
	howMany: number
	fieldSize: number
	maxBattery: number
	minBattery: number
}): Node[] {
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

function placeField({
	howMany,
	fieldSize,
	maxBattery,
	minBattery,
	sensingRange
}: {
	howMany: number
	fieldSize: number
	maxBattery: number
	minBattery: number
	sensingRange: number
}) {
	const staticNodes = randomlyPlaceNodes({ howMany, fieldSize, maxBattery, minBattery })
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

	const mobileNodes = randomlyPlaceNodes({ howMany, fieldSize, maxBattery, minBattery })

	const distanceMatrix = createDistanceMatrix(mobileNodes, holes)

	return { staticNodes, mobileNodes, holes, distanceMatrix, voronoi, delaunay }
}
