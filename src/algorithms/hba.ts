import { Node } from "../models/node"
import { Hole } from "../models/hole"
import { distanceBetween, stringify, withTransposed } from "../helpers"

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

export function hba(nodes: Node[], holes: Hole[]): Node[] {
	// const size = Math.max(nodes.length, holes.length)

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

	return []
}
