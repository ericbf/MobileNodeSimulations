import {
	stringify,
	transpose,
	debug,
	minimumLines,
	withTransposed,
	makeDispatchMatrix
} from "../helpers"

interface TbaSlot {
	value: number
	circled: boolean
}

/**
 * Calculate how to dispatch the nodes based on TBA.
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function tba(distanceMatrix: number[][]) {
	debug(`Start TBA`)

	let matrix = distanceMatrix.map((col) =>
		col.map<TbaSlot>((value) => ({ value, circled: false }))
	)

	withTransposed(matrix, circleLowestInEachColumn)
	circleLowestInEachColumn(matrix)

	let result = makeDispatchMatrix(matrix, (v) => v.circled)

	while (!result.every((col) => col.some((v) => v === 1))) {
		circleNextLowest(matrix)
		result = makeDispatchMatrix(matrix, (v) => v.circled)
	}

	return result
}

/** Identifies lowest value in each column of a position matrix and adjusts the position matrix to note position of column minimum in distance matrix
 * @param matrix The matrix in which to circle the column minimums
 */
export function circleLowestInEachColumn(matrix: TbaSlot[][]) {
	matrix.forEach(
		(column) =>
			(column.reduce((trans, next) =>
				next.value < trans.value ? next : trans
			).circled = true)
	)
}

/**
 * Circle the lowest value that isn't already circled
 * @param matrix The matrix in which to circle the lowest uncircled value
 */
export function circleNextLowest(matrix: TbaSlot[][]) {
	matrix
		.flat()
		.filter(({ circled }) => !circled)
		.reduce((trans, next) => (next.value < trans.value ? next : trans)).circled = true
}
