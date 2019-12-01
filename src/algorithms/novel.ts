import { Node } from "../models/node"
import { Hole } from "../models/hole"
import { stringify, debug, withTransposed } from "../helpers"
import { verbosity } from ".."
import {
	createDistanceMatrix,
	getLines,
	findZeros,
	getZeroFrequencies,
	FrequencyMap,
	checkZeros,
	LineMap,
	getEmptyLineMap,
	subtractColumns,
	reduceMatrixWithLines
} from "./hba"

export function novel(nodes: Node[], holes: Hole[]): Node[] {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	const original = matrix.map((col) => col.slice(0))

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	// matrix = withTransposed(matrix, subtractColumns)

	// debug(`Subtracted row:\n${stringify(matrix, 1)}`)

	// matrix = subtractColumns(matrix)

	// debug(`Subtracted column:\n${stringify(matrix, 1)}`)

	reduceMatrixWithLines(matrix, nodes, holes)

	debug(`Final matrix:\n${stringify(matrix, 1)}`)

	const zeros = findZeros({ matrix, original })

	checkAndCrossZeros(getZeroFrequencies(zeros))

	debug(`Zeros:`, zeros)

	if (verbosity === "debug") {
		// Fill the matrix with zeros
		matrix = matrix.map((column) => column.map(() => 0))

		// Put 1s in the result spots
		zeros
			.filter(({ checked }) => checked)
			.forEach(({ column, row }) => (matrix[column][row] = 1))

		// Result
		debug(`Result:\n${stringify(matrix, 1)}`)
	}

	return zeros
		.filter(({ checked }) => checked)
		.map(({ column, row }) => ({ ...nodes[column], ...holes[row] }))
}

export function checkAndCrossZeros({
	colFrequencies,
	rowFrequencies
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
}) {
	function getZerosInThreshold(threshold: number) {
		return [...Object.values(colFrequencies), ...Object.values(rowFrequencies)]
			.filter(({ frequency }) => frequency <= threshold)
			.flatMap(({ zeros }) => zeros)
			.sort((a, b) => a.value - b.value)
	}

	let threshold = 1
	let zeros = getZerosInThreshold(threshold)

	while (true) {
		if (zeros.length === 0) {
			threshold += 1

			zeros = getZerosInThreshold(threshold)

			if (zeros.length === 0) {
				break
			}
		}

		checkZeros({ colFrequencies, rowFrequencies, zeros })

		zeros = getZerosInThreshold(threshold)
	}
}
