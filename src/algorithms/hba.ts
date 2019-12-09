import {
	stringify,
	withTransposed,
	asTuple,
	minimumLines,
	makeDispatchMatrix
} from "../helpers"
import { debug } from "../index"

/**
 * Calculate how to dispatch the nodes based on HBA.
 * @param distanceMatrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function hba(distanceMatrix: number[][]) {
	if (debug) {
		console.log(`Start HBA`)
	}

	let matrix = distanceMatrix.map((col) => col.slice(0))

	if (debug) {
		console.log(`Distance matrix:\n${stringify(matrix)}`)
	}

	withTransposed(matrix, subtractColumns)

	if (debug) {
		console.log(`Subtracted row:\n${stringify(matrix)}`)
	}

	subtractColumns(matrix)

	if (debug) {
		console.log(`Subtracted column:\n${stringify(matrix)}`)
	}

	reduceMatrixWithLines(matrix)

	if (debug) {
		console.log(`Final matrix:\n${stringify(matrix)}`)
	}

	const result = makeDispatchMatrix(matrix, (v) => !isFinite(v) || v === 0)

	if (debug) {
		console.log(`Result:\n${stringify(result)}`)
	}

	return result
}

/**
 * Return a matrix where every value in each column is reduced by the lowest value in that column.
 * @param matrix The matrix to reduce each column by the min of that column.
 */
export function subtractColumns(matrix: number[][]) {
	return matrix.forEach((col, i) => {
		const min = Math.min(...col.filter(isFinite))

		return col.forEach((_, j) => (matrix[i][j] -= min))
	})
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
	let lines = minimumLines(matrix, (v) => !isFinite(v) || v === 0)

	if (debug) {
		console.log(`Lines are:`, lines)
	}

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

		if (uncoveredMin === 0) {
			const uncoveredZeros = matrix
				.flatMap((col, i) =>
					col
						.map((value, j) => ({
							value,
							position: asTuple([i, j]),
							covered: colLinesByIndex[i] || rowLinesByIndex[j]
						}))
						.filter(({ value, covered }) => value === 0 && !covered)
				)
				.map(({ position }) => position)
			throw new Error(
				`Uncovered min should not be zero. Check line cover algorithm. ${uncoveredZeros.join(
					" "
				)}`
			)
		}

		if (debug) {
			console.log(`Uncovered min is ${uncoveredMin}`)
		}

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

		if (debug) {
			console.log(`Updated matrix:\n${stringify(matrix)}`)
		}

		lines = minimumLines(matrix, (v) => !isFinite(v) || v === 0)

		if (debug) {
			console.log(`Lines are now:`, lines)
		}
	}
}
