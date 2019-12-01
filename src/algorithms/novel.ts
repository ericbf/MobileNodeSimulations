import { Node } from "../models/node"
import { Hole } from "../models/hole"
import { stringify, debug } from "../helpers"
import { verbosity } from ".."
import {
	createDistanceMatrix,
	getLines,
	findZeros,
	getZeroFrequencies,
	FrequencyMap,
	checkZeros,
	LineMap,
	getEmptyLineMap
} from "./hba"

export function novel(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	const original = matrix.map((col) => col.slice(0))

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	let lines = getLines(matrix)

	debug(`Lines are:`, lines)

	let colLinesByIndex: LineMap
	let rowLinesByIndex: LineMap

	const neededLines = Math.min(nodes.length, holes.length)

	while (lines.length < neededLines) {
		colLinesByIndex = getEmptyLineMap(matrix)
		rowLinesByIndex = getEmptyLineMap(matrix)

		for (const line of lines) {
			;(line.isColumn ? colLinesByIndex : rowLinesByIndex)[line.index] = true
		}

		let uncoveredMin = Infinity

		for (const [i, column] of matrix.entries()) {
			for (const [j, value] of column.entries()) {
				if (!colLinesByIndex[i] && !rowLinesByIndex[j] && value < uncoveredMin) {
					uncoveredMin = value
				}
			}
		}

		debug(`Uncovered min is ${uncoveredMin}`)

		for (const [column, colLined] of Object.entries(colLinesByIndex)) {
			const i = parseInt(column, 10)

			for (const [row, rowLined] of Object.entries(rowLinesByIndex)) {
				const j = parseInt(row, 10)

				if (colLined && rowLined) {
					matrix[i][j] += uncoveredMin
				} else if (!colLined && !rowLined) {
					matrix[i][j] -= uncoveredMin
				}
			}
		}

		debug(`Updated matrix:\n${stringify(matrix)}`)

		lines = getLines(matrix)

		debug(`Lines are now:`, lines)
	}

	debug(`Final matrix:\n${stringify(matrix, 1)}`)

	const zeros = findZeros({ matrix, original })

	checkAndCrossZeros(getZeroFrequencies(zeros))

	debug(`Zeros:`, zeros)

	if (verbosity === "debug") {
		// Fill the matrix with zeros
		matrix = matrix.map((column) => column.map(() => 0))

		// Put 1s in the result spots
		zeros
			.filter(({ checked }) => checked)
			.forEach(({ column, row }) => (matrix[column][row] = 1))

		// Result
		debug(`Result:\n${stringify(matrix, 1)}`)
	}

	return zeros
		.filter(({ checked }) => checked)
		.map(({ column, row }) => ({ ...nodes[column], ...holes[row] }))
}

export function checkAndCrossZeros({
	colFrequencies,
	rowFrequencies
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
}) {
	function getZerosInThreshold(threshold: number) {
		return [...Object.values(colFrequencies), ...Object.values(rowFrequencies)]
			.filter(({ frequency }) => frequency <= threshold)
			.flatMap(({ zeros }) => zeros)
			.sort((a, b) => a.value - b.value)
	}

	let threshold = 1
	let zeros = getZerosInThreshold(threshold)

	while (true) {
		if (zeros.length === 0) {
			threshold += 1

			zeros = getZerosInThreshold(threshold)

			if (zeros.length === 0) {
				break
			}
		}

		checkZeros({ colFrequencies, rowFrequencies, zeros })

		zeros = getZerosInThreshold(threshold)
	}
}
