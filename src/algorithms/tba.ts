import { stringify, transposed, debug } from "../helpers"
import { minimumLines } from "./minimum-lines"

/**
 * Calculate how to dispatch the nodes based on TBA.
 * @param matrix The coefficient matrix, `matrix[i][j]` – The `i`s are node index, and the `j`s are the hole index
 */
export function tba(matrix: number[][]) {
	debug(`Start TBA`)

	let positionMatrix = makePositionMatrix(matrix)

	debug(`Distance matrix:\n${stringify(matrix)}`)

	matrix = transposed(matrix)
	positionMatrix = transposed(positionMatrix)
	identifyColumnMinimum(matrix, positionMatrix)
	matrix = transposed(matrix)
	positionMatrix = transposed(positionMatrix)

	debug(`Distance matrix:\n${stringify(matrix)}`)

	debug(`Position matrix:\n${stringify(positionMatrix)}`)

	identifyColumnMinimum(matrix, positionMatrix)

	debug(`Distance matrix:\n${stringify(matrix)}`)

	debug(`Position matrix:\n${stringify(positionMatrix)}`)

	let testLines = minimumLines(positionMatrix)

	while (testLines.length < matrix.length) {
		addUnaddedMin(matrix, positionMatrix)
		debug(`Distance matrix:\n${stringify(matrix)}`)
		debug(`Position matrix:\n${stringify(positionMatrix)}`)
		testLines = minimumLines(positionMatrix)
		debug(`lines: `, testLines)
	}

	let zRowCol = allTheSingleZeros(positionMatrix)

	while (stillZeros(positionMatrix)) {
		adjustPositionMatrix(zRowCol, positionMatrix)
		zRowCol = allTheSingleZeros(positionMatrix)
	}

	positionMatrix = convertToOhWon(positionMatrix)

	debug(`Position matrix:\n${stringify(positionMatrix)}`)

	return positionMatrix
}

export function convertToOhWon(position: number[][]) {
	for (let i = 0; i < position.length; i++) {
		for (let j = 0; j < position.length; j++) {
			position[i][j] -= 1
		}
	}

	return position
}

export function adjustPositionMatrix(zRowCol: number[], position: number[][]) {
	if (zRowCol.length === 3) {
		for (let col = 0; col < position.length; col++) {
			for (let row = 0; row < position.length; row++) {
				if (position[col][row] === 0) {
					for (let m = 0; m < position.length; m++) {
						position[col][m] = 1
					}
					for (let n = 0; n < position.length; n++) {
						position[n][row] = 1
					}
					position[col][row] = 2
				}
			}
		}
	} else if (zRowCol.length === 2) {
		let col = zRowCol[0]
		let row = zRowCol[1]
		for (let m = 0; m < position.length; m++) {
			position[col][m] = 1
		}
		for (let n = 0; n < position.length; n++) {
			position[n][row] = 1
		}
		position[col][row] = 2
	}

	return position
}

export function allTheSingleZeros(position: number[][]) {
	let colTracker = -1
	let rowTracker = -1
	for (let i = 0; i < position.length; i++) {
		let zeroCounter = 0
		for (let j = 0; j < position.length; j++) {
			if (position[i][j] === 0) {
				colTracker = i
				rowTracker = j
				zeroCounter++
			}
			if (zeroCounter === 1 && j === position.length - 1) {
				return [colTracker, rowTracker]
			}
		}
	}

	for (let i = 0; i < position.length; i++) {
		let zeroCounter = 0
		for (let j = 0; j < position.length; j++) {
			if (position[j][i] === 0) {
				colTracker = j
				rowTracker = i
				zeroCounter++
			}
			if (zeroCounter === 1 && j == position.length - 1) {
				return [colTracker, rowTracker]
			}
		}
	}

	return [0, 0, 0]
}

export function stillZeros(position: number[][]) {
	let zeroBeHereOh = false
	for (let i = 0; i < position.length; i++) {
		for (let j = 0; j < position.length; j++) {
			if (position[i][j] === 0) {
				zeroBeHereOh = true
			}
		}
	}
	return zeroBeHereOh
}

/** Identifies lowest value in each column of a position matrix and adjusts the position matrix to note position of column minimum in distance matrix
 * @param matrix The matrix, in which, to identify the column minimums
 * @param position The position recording matrix, should be made of 0s and a 1 will be subsituted if it corresponds to the location of a minumum
 */
export function identifyColumnMinimum(matrix: number[][], position: number[][]) {
	matrix = matrix.map((col) => col.slice(0))

	let colCounter = 0

	for (const column of matrix) {
		const eligible = column.filter(isFinite)

		if (eligible.length < 2) {
			continue
		}

		const min = Math.min(...column.filter(isFinite))

		for (const [index] of column.entries()) {
			if (column[index] === min) {
				position[colCounter][index] = 0
				break
			}
		}

		colCounter++
	}
}

export function makePositionMatrix(matrix: number[][]) {
	let zMatrix = matrix.map((col) => col.slice(0))

	for (const column of zMatrix) {
		const eligible = column.filter(isFinite)

		if (eligible.length < 2) {
			continue
		}

		for (let index = 0; index < column.length; index++) {
			column[index] = 1
		}
	}

	return zMatrix
}

export function addUnaddedMin(matrix: number[][], position: number[][]) {
	let minTracker = Infinity
	let colTracker = -1
	let rowTracker = -1
	for (let i = 0; i < matrix.length; i++) {
		for (let j = 0; j < matrix.length; j++) {
			if (position[i][j] != 0) {
				if (matrix[i][j] < minTracker) {
					minTracker = matrix[i][j]
					colTracker = i
					rowTracker = j
				}
			}
		}
	}
	if (colTracker > -1 && rowTracker > -1) {
		position[colTracker][rowTracker] = 0
	}
}
