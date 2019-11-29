import { Positionable } from "./positionable"

export interface Node extends Positionable {
	id: number
	battery: number
}
