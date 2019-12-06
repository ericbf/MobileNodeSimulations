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

tba()

export function tba() {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	// let matrix = createDistanceMatrix(nodes, holes)

	// for testing
	let matrix = [
		[1, 2, 4],
		[2, 4, 1],
		[3, 3, 2]
	]

	const original = matrix

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	matrix = withTransposed(matrix, identifyColumnMinimum)

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	matrix = identifyColumnMinimum(matrix)

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)
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

/** Identifies lowest value in each column of a matrix
 * @param matrix The matrix, of which, to identify the column minimums
 */
export function identifyColumnMinimum(matrix: number[][]) {
	matrix = matrix.map((col) => col.slice(0))

	for (const column of matrix) {
	}

	return matrix
}
