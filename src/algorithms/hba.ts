import { stringify, withTransposed, debug } from "../helpers"
import { verbosity } from ".."
import { minimumLines } from "./minimum-lines"

/**
 *
 * @param nodes The mobile nodes that are available
 * @param holes The holes present in the FOI
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function hba(matrix: number[][]) {
	let modified = matrix

	debug(`Distance matrix:\n${stringify(modified)}`)

	modified = withTransposed(modified, subtractColumns)

	debug(`Subtracted row:\n${stringify(modified)}`)

	modified = subtractColumns(modified)

	debug(`Subtracted column:\n${stringify(modified)}`)

	reduceMatrixWithLines(modified)

	debug(`Final matrix:\n${stringify(modified)}`)

	const zeros = findZeros({ matrix: modified, original: matrix })

	checkAndCrossZeros({ ...getZeroFrequencies(zeros), maxThreshold: modified.length })

	debug(`Zeros:`, zeros)

	if (verbosity === "debug") {
		// Fill the matrix with zeros
		modified = modified.map((column) => column.map(() => 0))

		// Put 1s in the result spots
		zeros
			.filter(({ checked }) => checked)
			.forEach(({ column, row }) => (modified[column][row] = 1))

		// Result
		debug(`Result:\n${stringify(modified)}`)
	}

	return modified
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

export function getIndicesOfZeros(set: number[]) {
	return set
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
	rowFrequencies,
	maxThreshold
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
	maxThreshold: number
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

	function isItEmpty(map: FrequencyMap) {
		return Object.values(map).length === 0
	}

	let threshold = 1
	let moreZerosAtThisThreshold =
		hasWithin(colFrequencies, threshold) || hasWithin(rowFrequencies, threshold)
	let isEmpty = isItEmpty(colFrequencies) && isItEmpty(rowFrequencies)

	while (moreZerosAtThisThreshold || !isEmpty) {
		if (!moreZerosAtThisThreshold) {
			if (threshold < maxThreshold) {
				threshold++
			} else {
				break
			}
		} else {
			doCheckFor(colFrequencies, threshold)
			doCheckFor(rowFrequencies, threshold)
			isEmpty = isItEmpty(colFrequencies) && isItEmpty(rowFrequencies)
		}

		moreZerosAtThisThreshold =
			hasWithin(colFrequencies, threshold) || hasWithin(rowFrequencies, threshold)
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
