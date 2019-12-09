import { asTuple, isDefined } from "./functions"
import { findCover } from "./find-cover"

export interface Line {
	/** Whether this is a row or a column. */
	isColumn: boolean
	/** The row/column index of this line. */
	index: number
}

export function minimumLines<T>(matrix: T[][], eligible: (value: T) => boolean): Line[] {
	const size = matrix.length
	const edges = matrix
		.flatMap((col, i) =>
			col.map((value, j) => (eligible(value) ? asTuple([i, j]) : undefined))
		)
		.filter(isDefined)

	const cover = findCover(size, size, edges)

	const lines: Line[] = [
		...cover[0].map((index) => ({
			isColumn: true,
			index
		})),
		...cover[1].map((index) => ({
			isColumn: false,
			index
		}))
	]

	return lines
}
