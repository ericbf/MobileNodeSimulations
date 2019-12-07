import { Node } from "../models/node"
import { Hole } from "../models/hole"
import { distanceBetween, stringify, transposed, omit, debug } from "../helpers"
import { verbosity, numberStaticNodes } from ".."
import { reduceMatrixWithLines } from "./hba"

export function tba(nodes: Node[], holes: Hole[]) {
	/**
	 * The coefficient matrix, `matrix[i][j]`. The `i`s are node index, and the `j`s are the hole index.
	 */
	let matrix = createDistanceMatrix(nodes, holes)

	//for testing
	// let matrix = [
	// 	[1, 2, 3],
	// 	[2, 4, 3],
	// 	[4, 1, 2]
	// ]

	const original = matrix

	let positionMatrix = makePositionMatrix(matrix)

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	matrix = transposed(matrix)
	positionMatrix = transposed(positionMatrix)
	identifyColumnMinimum(matrix, positionMatrix)
	matrix = transposed(matrix)
	positionMatrix = transposed(positionMatrix)

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	debug(`Position matrix:\n${stringify(positionMatrix, 1)}`)

	identifyColumnMinimum(matrix, positionMatrix)

	debug(`Distance matrix:\n${stringify(matrix, 1)}`)

	debug(`Position matrix:\n${stringify(positionMatrix, 1)}`)

	let testLines = getLines(positionMatrix)

	while (testLines.length < matrix.length) {
		addUnaddedMin(matrix, positionMatrix)
		debug(`Distance matrix:\n${stringify(matrix, 1)}`)
		debug(`Position matrix:\n${stringify(positionMatrix, 1)}`)
		testLines = getLines(positionMatrix)
		debug(`lines: `, testLines)
	}

	let zRowCol = allTheSingleZeros(positionMatrix)

	while (stillZeros(positionMatrix)) {
		adjustPositionMatrix(zRowCol, positionMatrix)
		zRowCol = allTheSingleZeros(positionMatrix)
	}

	positionMatrix = convertToOhWon(positionMatrix)

	debug(`Position matrix:\n${stringify(positionMatrix, 1)}`)

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

		for (const [index, value] of column.entries()) {
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

		for (const [index, value] of column.entries()) {
			column[index] = 1
		}
	}

	return zMatrix
}

export interface Line {
	/** Whether this is a row or a column. */
	isColumn: boolean
	/** The row/column index of this line. */
	index: number
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

/**
 * Get the minimal number of lines to cover all the zeros. Do this by selecting the lines that cover the most uncovered zeros in turn until there are no uncovered zeros.
 * @param matrix The matrix wherein to find the least lines.
 */
export function getLines(matrix: number[][]): Line[] {
	interface MaybeLine extends Line {
		/** The index of the zeros in this line. */
		zeros: number[]
	}

	const inColumns: MaybeLine[] = matrix
		.map((column, index) => ({
			isColumn: true,
			index,
			zeros: getIndicesOfZeros(column)
		}))
		.filter(({ zeros }) => zeros.length > 0)

	const inRows: MaybeLine[] = transposed(matrix)
		.map((row, index) => ({
			isColumn: false,
			index,
			zeros: getIndicesOfZeros(row)
		}))
		.filter(({ zeros }) => zeros.length > 0)

	const lines: MaybeLine[] = []

	let allLines = [...inColumns, ...inRows].sort(lineSorter)

	while (allLines.length > 0) {
		const next = allLines.shift()!

		lines.push(next)

		allLines
			.filter(({ isColumn: column }) => column !== next.isColumn)
			.forEach(({ zeros }) => zeros.remove(next.index))

		allLines = allLines.filter(({ zeros }) => zeros.length > 0).sort(lineSorter)
	}

	function lineSorter(a: MaybeLine, b: MaybeLine) {
		return b.zeros.length - a.zeros.length
	}

	return lines.map((line) => omit(line, "zeros"))
}

export function getIndicesOfZeros(column: number[]) {
	return column
		.map((value, index) => ({ value, index }))
		.filter(({ value }) => value === 0)
		.map(({ index }) => index)
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
