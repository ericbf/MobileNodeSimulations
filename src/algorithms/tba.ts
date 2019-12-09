import { stringify, withTransposed, makeDispatchMatrix } from "../helpers"
import { debug } from "../index"

interface TbaSlot {
	value: number
	circled: boolean
}

/**
 * Calculate how to dispatch the nodes based on TBA.
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function tba(distanceMatrix: number[][]) {
	if (debug) {
		console.log(`Start TBA`)
		console.log(`Distance matrix:\n${stringify(distanceMatrix)}`)
	}

	let matrix = distanceMatrix.map((col) =>
		col.map<TbaSlot>((value) => ({ value, circled: !isFinite(value) }))
	)

	withTransposed(matrix, circleLowestInEachColumn)

	if (debug) {
		console.log(
			`Circled row:\n${matrix
				.map((col, i) =>
					col
						.map((_, j) => {
							const { circled, value } = matrix[j][i]

							return (circled ? `   (${value})` : `   ${value} `).slice(-5)
						})
						.join("")
				)
				.join("\n")}`
		)
	}

	circleLowestInEachColumn(matrix)

	if (debug) {
		console.log(
			`Circled column:\n${matrix
				.map((col, i) =>
					col
						.map((_, j) => {
							const { circled, value } = matrix[j][i]

							return (circled ? `   (${value})` : `   ${value} `).slice(-5)
						})
						.join("")
				)
				.join("\n")}`
		)
	}

	let result = makeDispatchMatrix(matrix, (v) => v.circled)

	while (!result.every((col) => col.some((v) => v === 1))) {
		circleNextLowest(matrix)

		if (debug) {
			console.log(
				`Circled next:\n${matrix
					.map((col, i) =>
						col
							.map((_, j) => {
								const { circled, value } = matrix[j][i]

								return (circled ? `   (${value})` : `   ${value} `).slice(-5)
							})
							.join("")
					)
					.join("\n")}`
			)
		}

		result = makeDispatchMatrix(matrix, (v) => v.circled)
	}

	if (debug) {
		console.log(`Result:\n${stringify(result)}`)
	}

	return result
}

/** Identifies lowest value in each column of a position matrix and adjusts the position matrix to note position of column minimum in distance matrix
 * @param matrix The matrix in which to circle the column minimums
 */
export function circleLowestInEachColumn(matrix: TbaSlot[][]) {
	matrix.forEach(
		(column) =>
			(column
				.filter(({ circled }) => !circled)
				.reduce((trans, next) => (next.value < trans.value ? next : trans), {
					value: Infinity,
					circled: false
				}).circled = true)
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
