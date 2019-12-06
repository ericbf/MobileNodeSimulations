import { stringify, debug, withTransposed } from "../helpers"
import { verbosity } from ".."
import {
	findZeros,
	getZeroFrequencies,
	FrequencyMap,
	checkZeros,
	reduceMatrixWithLines,
	subtractColumns
} from "./hba"

/**
 *
 * @param nodes The mobile nodes that are available
 * @param holes The holes present in the FOI
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function novel(matrix: number[][]) {
	let modified = matrix.map((col) => col.slice(0))

	// The above matrix is the one from the paper, for testing purposes. It looks transposed, but that's because of the way that it works. It's indexed correctly now – matrix[x][y].

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

export function checkAndCrossZeros({
	colFrequencies,
	rowFrequencies,
	maxThreshold
}: {
	colFrequencies: FrequencyMap
	rowFrequencies: FrequencyMap
	maxThreshold: number
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

			if (zeros.length === 0 && threshold === maxThreshold) {
				break
			}
		}

		checkZeros({ colFrequencies, rowFrequencies, zeros })

		zeros = getZerosInThreshold(threshold)
	}
}
