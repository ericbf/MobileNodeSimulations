import { asTuple } from "./functions"
import { findMatching } from "./find-matching"

interface MatchVertex {
	isLeft: boolean
	index: number
	matched: boolean
	neighbors: number[]
	match?: number
	inCover?: boolean
}

type MatchMap = Record<number, MatchVertex>

export function findCover(
	countLeft: number,
	countRight: number,
	edges: [number, number][]
) {
	const matches = findMatching(countLeft, countRight, edges)

	return convertToMinimalCover(edges, matches)
}

function convertToMinimalCover(edges: [number, number][], matches: [number, number][]) {
	const leftMap = matches.reduce<MatchMap>(
		(trans, match) => (
			(trans[match[0]] = {
				isLeft: true,
				index: match[0],
				matched: true,
				match: match[1],
				neighbors: []
			}),
			trans
		),
		{}
	)

	const rightMap = matches.reduce<MatchMap>(
		(trans, match) => (
			(trans[match[1]] = {
				isLeft: false,
				index: match[1],
				matched: true,
				match: match[0],
				neighbors: []
			}),
			trans
		),
		{}
	)

	for (const [left, right] of edges) {
		if (!leftMap[left]) {
			leftMap[left] = {
				isLeft: true,
				index: left,
				matched: false,
				neighbors: [right]
			}
		} else {
			leftMap[left].neighbors.push(right)
		}

		if (!rightMap[right]) {
			rightMap[right] = {
				isLeft: false,
				index: right,
				matched: false,
				neighbors: [left]
			}
		} else {
			rightMap[right].neighbors.push(left)
		}
	}

	function getNeighborAtIndex(vertex: MatchVertex) {
		return (index: number) => (vertex.isLeft ? rightMap : leftMap)[index]
	}

	function getNeighbors(vertex: MatchVertex) {
		return vertex.neighbors.map(getNeighborAtIndex(vertex))
	}

	const vertices = [...Object.values(leftMap), ...Object.values(rightMap)]

	let unmatched: MatchVertex | undefined

	while (
		(unmatched = vertices.find(
			({ matched, inCover }) => !matched && inCover == undefined
		))
	) {
		unmatched.inCover = false

		for (const neighbor of getNeighbors(unmatched)) {
			if (neighbor.inCover != undefined) {
				// Don't reprocess what we've already seen
				continue
			}

			if (neighbor.matched) {
				neighbor.inCover = true

				const mate = getNeighborAtIndex(neighbor)(neighbor.match!)

				mate.matched = false
			}
		}
	}

	for (const vertex of Object.values(leftMap)) {
		if (vertex.inCover == undefined) {
			vertex.inCover = true
		}
	}

	return asTuple([
		Object.values(leftMap)
			.filter(({ inCover }) => inCover)
			.map(({ index }) => index),
		Object.values(rightMap)
			.filter(({ inCover }) => inCover)
			.map(({ index }) => index)
	])
}
