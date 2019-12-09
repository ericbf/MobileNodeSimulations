export const findMatching = require("bipartite-matching") as (
	numberOfVerticesOnLeft: number,
	numberOfVerticesOnRight: number,
	edges: [number, number][]
) => [number, number][]
