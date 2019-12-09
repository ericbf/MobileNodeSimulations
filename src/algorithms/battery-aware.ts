import { stringify, debug } from "../helpers"
import { hba } from "./hba"
import { Node } from "../models/node"
import { Hole } from "../models/hole"

/**
 *
 * @param nodes The mobile nodes that are available
 * @param holes The holes present in the FOI
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 * @param method The method to run with the battery aware matrix.
 */
export function batteryAware(
	matrix: number[][],
	nodes: (Node | undefined)[],
	holes: Hole[],
	method: (matrix: number[][]) => number[][]
) {
	debug(`Start Battery Aware`)
	debug(`Nodes:\n${JSON.stringify(nodes, undefined, 4)}`)
	debug(`Distance matrix:\n${stringify(matrix)}`)

	// Transform the matrix to what the battery of each node will be after moving that amount

	matrix = matrix.map((col, i) =>
		col.map((distance) => (nodes[i]?.battery ?? distance) - distance)
	)

	debug(`Battery matrix:\n${stringify(matrix)}`)

	// Find the current maximum value in the matrix

	const max = Math.max(...matrix.flat())

	// Transform again so the nodes with the highest battery will have the least weight

	matrix = matrix.map((col) => col.map((value) => max - value))

	// Find the new maximum value in the matrix

	const newMax = 0 // Math.max(...matrix.flat())

	// Make sure that the virtual nodes and holes have the maximum value set as their value

	if (nodes.length > holes.length) {
		for (const column of matrix) {
			for (let j = holes.length; j < nodes.length; j++) {
				column[j] = newMax
			}
		}
	} else if (holes.length > nodes.length) {
		for (let i = nodes.length; i < holes.length; i++) {
			for (let j = 0; j < matrix.length; j++) {
				matrix[i][j] = newMax
			}
		}
	}

	debug(`Inverse battery matrix: ↴`)

	return method(matrix)
}
