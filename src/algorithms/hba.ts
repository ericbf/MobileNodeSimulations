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

export function hba(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	matrix = withTransposed(matrix, subtractColumns)

	debug(`Subtracted row:\n${stringify(matrix, 1)}`)

	matrix = subtractColumns(matrix)

	debug(`Subtracted column:\n${stringify(matrix, 1)}`)

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

/** Create a square distance matrix with each column is the distance from a node to each hole. If the number of nodes isn't equal the number of holes, fill the array with `NaN` to make it square. */
export function createDistanceMatrix(nodes: Node[], holes: Hole[]) {
	const size = Math.max(nodes.length, holes.length)

	return Array.from({ length: size }).map((_, i) =>
		Array.from({ length: size }).map((_, j) => {
			const node = nodes[i]
			const hole = holes[j]

			return !node || !hole ? NaN : distanceBetween(node, hole)
		})
	)
}

/**
 * Return a matrix where every value in each column is reduced by the lowest value in that column.
 * @param matrix The matrix to reduce each column by the min of that column.
 */
export function subtractColumns(matrix: number[][]) {
	matrix = matrix.map((col) => col.slice(0))

	for (const column of matrix) {
		const eligible = column.filter(isFinite)

		if (eligible.length < 2) {
			continue
		}

		const min = Math.min(...column.filter(isFinite))

		for (const [index, value] of column.entries()) {
			column[index] = value - min
		}
	}

	return matrix
}

interface Line {
	/** Whether this is a row or a column. */
	isColumn: boolean
	/** The row/column index of this line. */
	index: number
}

/**
 * Get the minimal number of lines to cover all the zeros. Do this by selecting the lines that cover the most uncovered zeros in turn until there are no uncovered zeros.
 * @param matrix The matrix wherein to find the least lines.
 */
export function getLines(matrix: number[][]): Line[] {
	interface MaybeLine extends Line {
		/** The index of the zeros in this line. */
		zeros: number[]
	}

	const inColumns: MaybeLine[] = matrix
		.map((column, index) => ({
			isColumn: true,
			index,
			zeros: getIndicesOfZeros(column)
		}))
		.filter(({ zeros }) => zeros.length > 0)

	const inRows: MaybeLine[] = transposed(matrix)
		.map((row, index) => ({
			isColumn: false,
			index,
			zeros: getIndicesOfZeros(row)
		}))
		.filter(({ zeros }) => zeros.length > 0)

	const lines: MaybeLine[] = []

	let allLines = [...inColumns, ...inRows].sort(lineSorter)

	while (allLines.length > 0) {
		const next = allLines.shift()!

		lines.push(next)

		allLines
			.filter(({ isColumn: column }) => column !== next.isColumn)
			.forEach(({ zeros }) => zeros.remove(next.index))

		allLines = allLines.filter(({ zeros }) => zeros.length > 0).sort(lineSorter)
	}

	function lineSorter(a: MaybeLine, b: MaybeLine) {
		return b.zeros.length - a.zeros.length
	}

	return lines.map((line) => omit(line, "zeros"))
}

export function findBestZeros(matrix: number[][]) {
	const zeros = matrix
		.map(getIndicesOfZeros)
		.map((zeros: number[], column: number) =>
			zeros.map((row) => ({
				column,
				row,
				checked: false,
				crossed: false
			}))
		)
		.flat()

	type Zero = Unbox<typeof zeros>
	interface FrequencyEntry {
		isColumn: boolean
		index: number
		frequency: number
		zeros: Zero[]
	}

	interface FrequencyMap {
		[index: number]: FrequencyEntry
	}

	const colFrequencies: FrequencyMap = {}
	const rowFrequencies: FrequencyMap = {}

	for (const zero of zeros) {
		let col = colFrequencies[zero.column]
		let row = rowFrequencies[zero.row]

		if (!col) {
			colFrequencies[zero.column] = col = {
				isColumn: true,
				index: zero.column,
				frequency: 0,
				zeros: []
			}
		}

		if (!row) {
			rowFrequencies[zero.row] = row = {
				isColumn: false,
				index: zero.row,
				frequency: 0,
				zeros: []
			}
		}

		col.frequency += 1
		col.zeros.push(zero)

		row.frequency += 1
		row.zeros.push(zero)
	}

	function checkZeros(
		primary: FrequencyMap,
		pKey: "column" | "row",
		secondary: FrequencyMap,
		sKey: "column" | "row",
		threshold: number
	) {
		for (const [indexAsString, { frequency, zeros }] of Object.entries(primary)) {
			const index = parseInt(indexAsString, 10)

			if (frequency <= threshold) {
				const zero = zeros.random

				if (zero) {
					zero.checked = true

					secondary[zero[sKey]].zeros.forEach((zero) => {
						if (!zero.checked) {
							zero.crossed = true

							const frequency = primary[zero[pKey]]

							if (frequency) {
								frequency.frequency -= 1
								frequency.zeros.remove(zero)
							} else {
								debug("Would have failed")
							}
						}
					})

					delete secondary[zero[sKey]]
				}

				delete primary[index]
			}
		}
	}

	function hasWithin(map: FrequencyMap, threshold: number) {
		return Object.values(map).find(({ frequency }) => frequency === threshold) != null
	}

	function isEmpty(map: FrequencyMap) {
		return Object.values(map).length === 0
	}

	let threshold = 1

	while (
		hasWithin(colFrequencies, threshold) ||
		hasWithin(rowFrequencies, threshold) ||
		((!isEmpty(colFrequencies) || !isEmpty(rowFrequencies)) && threshold++)
	) {
		checkZeros(colFrequencies, "column", rowFrequencies, "row", threshold)
		checkZeros(rowFrequencies, "row", colFrequencies, "column", threshold)
	}

	return zeros
}

export function getIndicesOfZeros(column: number[]) {
	return column
		.map((value, index) => ({ value, index }))
		.filter(({ value }) => value === 0)
		.map(({ index }) => index)
}
