import { stringify } from "../helpers"
import { Node } from "../models/node"
import { debug } from "../index"

/**
 *
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 * @param nodes The mobile nodes that are available
 * @param method The method to run with the battery aware matrix.
 */
export function batteryAware(
	matrix: number[][],
	nodes: (Node | undefined)[],
	method: (matrix: number[][]) => number[][]
) {
	if (debug) {
		console.log(`Start Battery Aware`)
		console.log(`Distance matrix:\n${stringify(matrix)}`)
	}

	// Transform the matrix to what the battery of each node will be after moving that amount

	matrix = matrix.map((col, i) =>
		col.map((distance) => (nodes[i]?.battery ?? distance) - distance)
	)

	if (debug) {
		console.log(`Battery matrix:\n${stringify(matrix)}`)
	}

	// Find the current maximum value in the matrix

	const max = Math.max(...matrix.flat().filter(isFinite))

	// Transform again so the nodes with the highest battery will have the least weight

	matrix = matrix.map((col) => col.map((value) => max - value))

	if (debug) {
		console.log(`Inverse battery matrix: ↴`)
	}

	return method(matrix)
}
