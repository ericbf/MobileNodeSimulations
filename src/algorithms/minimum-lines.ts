import { Line, getIndicesOfZeros } from "./hba"
import { transposed, omit, ValueOrFunction } from "../helpers"

export function minimumLines(matrix: number[][]): Line[] {
	const greedy = greedyLines(matrix)
	const wiki = wikiLines(matrix)

	return greedy.length < wiki.length ? greedy : wiki
}

/**
 * Get the minimal number of lines to cover all the zeros. Do this by selecting the lines that cover the most uncovered zeros in turn until there are no uncovered zeros. If any line is superfluous though (its zeros are covered by lesser lines), remove it.
 * @param matrix The matrix wherein to find the least lines.
 */
function greedyLines(matrix: number[][]): Line[] {
	interface MaybeLine extends Line {
		/** The index of the zeros in this line. */
		zeros: number[]
		allZeros: number[]
	}

	const inColumns: MaybeLine[] = matrix
		.map((column, index) => ({
			isColumn: true,
			index,
			zeros: getIndicesOfZeros(column)
		}))
		.filter(({ zeros }) => zeros.length > 0)
		.map((col) => ({ ...col, allZeros: col.zeros.slice(0) }))

	const inRows: MaybeLine[] = transposed(matrix)
		.map((row, index) => ({
			isColumn: false,
			index,
			zeros: getIndicesOfZeros(row)
		}))
		.filter(({ zeros }) => zeros.length > 0)
		.map((row) => ({ ...row, allZeros: row.zeros.slice(0) }))

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

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const superfluous = line.allZeros.every((zeroIndex) =>
			lines.some((other) => line.isColumn !== other.isColumn && other.index === zeroIndex)
		)

		if (superfluous) {
			lines.splice(i--, 1)
		}
	}

	return lines.map((line) => omit(line, "zeros", "allZeros"))
}

interface Map<T> {
	[key: number]: T
}

function getMap<T>(length: number, initialValue: ValueOrFunction<T>): Map<T> {
	return Array.from({ length }).reduce<Map<T>>(
		(trans, _, index) => (
			(trans[index] = initialValue instanceof Function ? initialValue() : initialValue),
			trans
		),
		{}
	)
}

/**
 * Get the minimal number of lines to cover all the zeros. Do this by selecting the lines that cover the most uncovered zeros in turn until there are no uncovered zeros.
 * @param matrix The matrix wherein to find the least lines.
 */
function wikiLines(matrix: number[][]): Line[] {
	const assignments = matrix.map((column) =>
		column.map((value) => ({ value, check: false, cross: false }))
	)

	for (const column of assignments) {
		for (const [j, slot] of column.entries()) {
			if (!slot.value && !slot.check && !slot.cross) {
				slot.check = true

				for (const otherSlot of column) {
					if (!otherSlot.value && otherSlot !== slot) {
						otherSlot.cross = true
					}
				}

				for (const otherColumn of assignments) {
					const otherSlot = otherColumn[j]

					if (!otherSlot.value && otherSlot !== slot) {
						otherSlot.cross = true
					}
				}

				break
			}
		}
	}

	const colMarks = getMap(matrix.length, false)
	const rowMarks = getMap(matrix.length, false)

	let wasMarkingColumns = false
	let newlyMarked: number[] = []

	for (let j = 0; j < assignments.length; j++) {
		const row = assignments.map((column) => column[j])
		if (row.every(({ check }) => !check)) {
			rowMarks[j] = true
			newlyMarked.push(j)
		}
	}

	while (newlyMarked.length) {
		let lastNewlyMarked = newlyMarked

		newlyMarked = []

		if (wasMarkingColumns) {
			for (const marked of lastNewlyMarked) {
				for (const [j, slot] of assignments[marked].entries()) {
					if (slot.check && !rowMarks[j] && !newlyMarked.includes(j)) {
						rowMarks[j] = true
						newlyMarked.push(j)
					}
				}
			}
		} else {
			for (const marked of lastNewlyMarked) {
				for (const [i, column] of assignments.entries()) {
					if (!column[marked].value && !colMarks[i] && !newlyMarked.includes(i)) {
						colMarks[i] = true
						newlyMarked.push(i)
					}
				}
			}
		}

		wasMarkingColumns = !wasMarkingColumns
	}

	const lines = [
		...Object.entries(colMarks)
			.filter(([, marked]) => marked)
			.map(([i]) => ({
				isColumn: true,
				index: parseInt(i, 10)
			})),
		...Object.entries(rowMarks)
			.filter(([, marked]) => !marked)
			.map(([i]) => ({
				isColumn: false,
				index: parseInt(i, 10)
			}))
	]

	return lines
}
