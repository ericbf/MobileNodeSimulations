import { Node } from "../models/node"
import { Hole } from "../models/hole"
import {
	distanceBetween,
	stringify,
	withTransposed,
	transposed,
	omit,
	debug
} from "../helpers"
import { verbosity } from ".."

export function hba(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	const original = matrix

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	matrix = withTransposed(matrix, subtractColumns)

	debug(`Subtracted row:\n${stringify(matrix, 1)}`)

	matrix = subtractColumns(matrix)

	debug(`Subtracted column:\n${stringify(matrix, 1)}`)

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

export interface Line {
	/** Whether this is a row or a column. */
	isColumn: boolean
	/** The row/column index of this line. */
	index: number
}

export interface LineMap {
	[index: number]: boolean
}

export function getEmptyLineMap(matrix: number[][]) {
	return Array.from({ length: matrix.length }).reduce<LineMap>((trans, _, i) => {
		trans[i] = false

		return trans
	}, {})
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

export interface Zero {
	column: number
	row: number
	checked: boolean
	crossed: boolean
	value: number
}

export function findZeros({
	matrix,
	original
}: {
	matrix: number[][]
	original: number[][]
}) {
	return matrix
		.map(getIndicesOfZeros)
		.map((zeros: number[], column: number) =>
			zeros.map((row) => ({
				column,
				row,
				checked: false,
				crossed: false,
				value: original[column][row]
			}))
		)
		.flat()
}

export function getIndicesOfZeros(column: number[]) {
	return column
		.map((value, index) => ({ value, index }))
		.filter(({ value }) => value === 0)
		.map(({ index }) => index)
}

export interface FrequencyEntry {
	isColumn: boolean
	index: number
	frequency: number
	zeros: Zero[]
}

export interface FrequencyMap {
	[index: number]: FrequencyEntry
}

export function getZeroFrequencies(zeros: Zero[]) {
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

	return { colFrequencies, rowFrequencies }
}

function checkAndCrossZeros({
	colFrequencies,
	rowFrequencies
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
}) {
	function doCheckFor(map: FrequencyMap, threshold: number) {
		Object.values(map)
			.filter(({ frequency }) => frequency <= threshold)
			.map(({ zeros }) => zeros)
			.forEach((zeros) =>
				checkZeros({
					colFrequencies,
					rowFrequencies,
					zeros
				})
			)
	}

	function hasWithin(map: FrequencyMap, threshold: number) {
		const index = Object.values(map).findIndex(({ frequency }) => frequency <= threshold)
		return index >= 0
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
		doCheckFor(colFrequencies, threshold)
		doCheckFor(rowFrequencies, threshold)
	}
}

export function checkZeros({
	colFrequencies,
	rowFrequencies,
	zeros
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
	zeros: Zero[]
}) {
	for (const zero of zeros) {
		if (!zero.checked && !zero.crossed) {
			zero.checked = true

			crossAndRemoveZeros({ colFrequencies, rowFrequencies, forZero: zero })

			delete colFrequencies[zero.column]
			delete rowFrequencies[zero.row]
		}
	}
}

export function crossAndRemoveZeros({
	colFrequencies,
	rowFrequencies,
	forZero
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
	forZero: Zero
}) {
	const remove = (fromColumns: boolean) => (other: Zero) => {
		if (other !== forZero) {
			other.crossed = true

			const entry = fromColumns ? rowFrequencies[other.row] : colFrequencies[other.column]

			entry.frequency -= 1
			entry.zeros.remove(other)

			if (entry.zeros.length === 0) {
				if (fromColumns) {
					delete rowFrequencies[other.row]
				} else {
					delete colFrequencies[other.column]
				}
			}
		}
	}

	colFrequencies[forZero.column].zeros.forEach(remove(true))
	rowFrequencies[forZero.row].zeros.forEach(remove(false))
}
