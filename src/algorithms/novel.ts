import { Node } from "../models/node"
import { Hole } from "../models/hole"
import {
	distanceBetween,
	stringify,
	withTransposed,
	transposed,
	omit,
	Unbox,
	debug
} from "../helpers"
import { verbosity } from ".."
import { subtractColumns, createDistanceMatrix, getLines, findBestZeros } from "./hba"

export function novel(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	let lines = getLines(matrix)

	debug(`Lines are:`, lines)

	interface LineMap {
		[index: number]: boolean
	}

	let colLinesByIndex: LineMap
	let rowLinesByIndex: LineMap

	function getLineMap() {
		return Array.from({ length: matrix.length }).reduce<LineMap>((trans, _, i) => {
			trans[i] = false

			return trans
		}, {})
	}

	const neededLines = Math.min(nodes.length, holes.length)

	while (lines.length < neededLines) {
		colLinesByIndex = getLineMap()
		rowLinesByIndex = getLineMap()

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

	if (lines.length > neededLines) {
		lines.length = neededLines
	}

	debug(`Final matrix:\n${stringify(matrix, 1)}`)

	const zeros = findBestZeros(matrix)

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
