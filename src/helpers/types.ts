export type Flatten<T> = T extends Array<infer U> ? U[] : T[]

export type Unbox<T> = T extends (infer U)[]
	? U
	: T extends (...args: any[]) => infer U
	? U
	: T extends Promise<infer U>
	? U
	: T
