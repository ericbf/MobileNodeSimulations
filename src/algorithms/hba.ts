import { stringify, withTransposed, debug, asTuple, getIndicesOfZeros } from "../helpers"
import { verbosity } from ".."
import { minimumLines } from "./minimum-lines"

/**
 * Calculate how to dispatch the nodes based on HBA.
 * @param distanceMatrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function hba(distanceMatrix: number[][]) {
	debug(`Start HBA`)

	let matrix = distanceMatrix

	debug(`Distance matrix:\n${stringify(matrix)}`)

	matrix = withTransposed(matrix, subtractColumns)

	debug(`Subtracted row:\n${stringify(matrix)}`)

	matrix = subtractColumns(matrix)

	debug(`Subtracted column:\n${stringify(matrix)}`)

	reduceMatrixWithLines(matrix)

	debug(`Final matrix:\n${stringify(matrix)}`)

	const zeros = findZeros({ matrix: matrix, original: distanceMatrix })

	selectZeros(mapZeroFrequencies(zeros))

	if (verbosity === "debug") {
		// Fill the matrix with zeros
		matrix = matrix.map((column) => column.map(() => 0))

		// Put 1s in the result spots
		zeros
			.filter(({ checked }) => checked)
			.forEach(({ column, row }) => (matrix[column][row] = 1))

		// Result
		debug(`Result:\n${stringify(matrix)}`)
	}

	return matrix
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

export interface LineMap {
	[index: number]: boolean
}

export function getEmptyLineMap(matrix: number[][]) {
	return Array.from({ length: matrix.length }).reduce<LineMap>((trans, _, i) => {
		trans[i] = false

		return trans
	}, {})
}

export function reduceMatrixWithLines(matrix: number[][]) {
	let lines = minimumLines(matrix)

	debug(`Lines are:`, lines)

	let colLinesByIndex: LineMap
	let rowLinesByIndex: LineMap

	while (lines.length < matrix.length) {
		colLinesByIndex = getEmptyLineMap(matrix)
		rowLinesByIndex = getEmptyLineMap(matrix)

		for (const line of lines) {
			const list = line.isColumn ? colLinesByIndex : rowLinesByIndex

			list[line.index] = true
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

				const value = matrix[i][j]

				if (colLined && rowLined) {
					matrix[i][j] = (value + uncoveredMin).round(3)
				} else if (!colLined && !rowLined) {
					matrix[i][j] = (value - uncoveredMin).round(3)
				}
			}
		}

		debug(`Updated matrix:\n${stringify(matrix)}`)

		lines = minimumLines(matrix)

		debug(`Lines are now:`, lines)
	}
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

export interface FrequencyEntry {
	isColumn: boolean
	index: number
	frequency: number
	zeros: Zero[]
}

export interface FrequencyMap {
	[index: number]: FrequencyEntry
}

export function mapZeroFrequencies(zeros: Zero[]) {
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

function selectZeros({
	colFrequencies,
	rowFrequencies
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
}) {
	function getZeros() {
		return [...Object.values(colFrequencies), ...Object.values(rowFrequencies)]
			.map((entry) =>
				asTuple([
					entry,
					entry.zeros.reduce((min, next) => (min.value < next.value ? min : next))
				])
			)
			.sort(([a, aZero], [b, bZero]) => {
				const byLength = a.zeros.length - b.zeros.length

				if (byLength) {
					return byLength
				}

				return aZero.value - bZero.value
			})
			.map(([, zero]) => zero)
	}

	function checkAndRemove(zero: Zero) {
		zero.checked = true

		remove(zero, "columns")
		remove(zero, "rows")

		delete colFrequencies[zero.column]
		delete rowFrequencies[zero.row]

		function remove(zero: Zero, from: "columns" | "rows") {
			const entry =
				from === "columns" ? colFrequencies[zero.column] : rowFrequencies[zero.row]

			entry.zeros.forEach((otherZero: Zero) => {
				if (otherZero !== zero) {
					otherZero.crossed = true

					const otherEntry =
						from === "columns"
							? rowFrequencies[otherZero.row]
							: colFrequencies[otherZero.column]

					otherEntry.frequency -= 1
					otherEntry.zeros.remove(otherZero)

					if (otherEntry.zeros.length === 0) {
						if (from === "columns") {
							delete rowFrequencies[otherZero.row]
						} else {
							delete colFrequencies[otherZero.column]
						}
					}
				}
			})
		}
	}

	let zeros = getZeros()

	while (zeros.length > 0) {
		const zero = zeros.first!

		checkAndRemove(zero)

		zeros = getZeros()
	}
}
