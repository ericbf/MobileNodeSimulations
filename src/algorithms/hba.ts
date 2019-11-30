import { Node } from "../models/node"
import { Hole } from "../models/hole"
import {
	distanceBetween,
	stringify,
	withTransposed,
	transposed,
	omit,
	Unbox
} from "../helpers"

export function hba(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = [
		[10, 13, 3, 18, 11],
		[5, 19, 2, 9, 6],
		[9, 6, 4, 12, 14],
		[18, 12, 4, 17, 19],
		[11, 14, 5, 15, 10]
	]

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	console.log(`Distance matrix:\n${stringify(matrix, 0)}`)

	matrix = withTransposed(matrix, subtractColumns)

	console.log(`Subtracted row:\n${stringify(matrix, 0)}`)

	matrix = subtractColumns(matrix)

	console.log(`Subtracted column:\n${stringify(matrix, 0)}`)

	let lines = getLines(matrix)

	console.log(`Initial lines:`, lines)

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

	while (lines.length < matrix.length) {
		colLinesByIndex = getLineMap()
		rowLinesByIndex = getLineMap()

		for (const line of lines) {
			;(line.column ? colLinesByIndex : rowLinesByIndex)[line.index] = true
		}

		let uncoveredMin = Infinity

		for (const [i, column] of matrix.entries()) {
			for (const [j, value] of column.entries()) {
				if (!colLinesByIndex[i] && !rowLinesByIndex[j] && value < uncoveredMin) {
					uncoveredMin = value
				}
			}
		}

		console.log(`Uncovered min is ${uncoveredMin}`)

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

		lines = getLines(matrix)
	}

	console.log(`Final matrix:\n${stringify(matrix, 0)}`)

	const zeros = findBestZeros(matrix)

	console.log(`Best zeros:`, zeros)

	return []
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

/** Return a matrix where every value in each column is reduced by the lowest value in that column. */
export function subtractColumns(matrix: number[][]) {
	matrix = matrix.map((col) => col.slice(0))

	for (const column of matrix) {
		const min = Math.min(...column.filter(isFinite))

		for (const [index, value] of column.entries()) {
			column[index] = value - min
		}
	}

	return matrix
}

interface Line {
	/** Whether this is a row or a column. */
	column: boolean
	/** The row/column index of this line. */
	index: number
}

/**
 * Get the minimal number of lines to cover all the zeros. Do this by selecting the lines that cover the most uncovered zeros in turn until there are no uncovered zeros.
 * @param matrix The matrix wherein to find the least lines.
 */
function getLines(matrix: number[][]): Line[] {
	interface MaybeLine extends Line {
		/** The index of the zeros in this line. */
		zeros: number[]
	}

	const inColumns: MaybeLine[] = matrix
		.map((column, index) => ({
			column: true,
			index,
			zeros: getIndicesOfZeros(column)
		}))
		.filter(({ zeros }) => zeros.length > 0)

	const inRows: MaybeLine[] = transposed(matrix)
		.map((row, index) => ({
			column: false,
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
			.filter(({ column }) => column !== next.column)
			.forEach(({ zeros }) => zeros.remove(next.index))

		allLines = allLines.filter(({ zeros }) => zeros.length > 0).sort(lineSorter)
	}

	function lineSorter(a: MaybeLine, b: MaybeLine) {
		return b.zeros.length - a.zeros.length
	}

	return lines.map((line) => omit(line, "zeros"))
}

function findBestZeros(matrix: number[][]) {
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
	type FrequencyEntry = [number, Zero[]]

	interface FrequencyMap {
		[index: number]: FrequencyEntry
	}

	const colFrequencies: FrequencyMap = {}
	const rowFrequencies: FrequencyMap = {}

	for (const zero of zeros) {
		if (!colFrequencies[zero.column]) {
			colFrequencies[zero.column] = [0, []]
		}

		colFrequencies[zero.column][0] += 1
		colFrequencies[zero.column][1].push(zero)

		if (!rowFrequencies[zero.row]) {
			rowFrequencies[zero.row] = [0, []]
		}

		rowFrequencies[zero.row][0] += 1
		rowFrequencies[zero.row][1].push(zero)
	}

	console.log(colFrequencies)
	console.log(rowFrequencies)

	for (const [frequency, zeros] of Object.values(colFrequencies)) {
		if (frequency === 1) {
			const zero = zeros[0]

			zero.checked = true

			rowFrequencies[zero.row][1].forEach((zero) => {
				if (!zero.checked) {
					zero.crossed = true
				}
			})
		}
	}

	for (const [frequency, zeros] of Object.values(rowFrequencies)) {
		if (frequency === 1) {
			const zero = zeros[0]

			zero.checked = true

			colFrequencies[zero.column][1].forEach((zero) => {
				if (!zero.checked) {
					zero.crossed = true
				}
			})
		}
	}

	return zeros
}

function getIndicesOfZeros(column: number[]) {
	return column
		.map((value, index) => ({ value, index }))
		.filter(({ value }) => value === 0)
		.map(({ index }) => index)
}
