
export abstract class Vector {

    private _components: number[] = [];
    abstract readonly dimensions: number;

    abstract copy(): Vector;
    protected _callOnModified() { };

    get components(): number[] {
        if (this._components.length === this.dimensions) return [...this._components];
        let ret: number[] = (new Array(this.dimensions)).fill(0) as number[];
        for (let i = 0; i < Math.min(this._components.length, this.dimensions); i++) ret[i] = this._components[i];
        return ret;
    }

    set components(v: number[]) {
        try {
            if (v.length === this.dimensions) {
                this._components = [...v];
                return;
            }
            let nc: number[] = (new Array(this.dimensions)).fill(0) as number[];
            for (let i = 0; i < Math.min(v.length, this.dimensions); i++) {
                nc[i] = v[i];
            }
            this._components = nc;
        } finally {
            this._callOnModified();
        }
    }

    getComponent(index: number): number {
        if (index < 0 || index >= this.dimensions) throw new Error(`Index ${index} out of bounds for ${this.dimensions}-dimensional vector`);
        return this._components[index];
    }

    setComponent(index: number, value: number): void {
        if (index < 0 || index >= this.dimensions) throw new Error(`Index ${index} out of bounds for ${this.dimensions}-dimensional vector`);
        if (this._components.length < this.dimensions) this._components = this.components;
        this._components[index] = value;
        this._callOnModified();
    }

    reduce<T>(map: (component: number) => T, merge: (a: T, b: T) => T): T {
        const c = this.components;
        let ret: T = map(c[0]);
        for (let i=1; i < c.length; i++) {
            ret = merge(ret, map(c[i]));
        }
        return ret;
    }

    normSqr(): number {
        return this.reduce((c) => c * c, (a, b) => a + b);
    }

    norm(): number {
        const sqr: number = this.normSqr();
        if (Math.abs(sqr - 1) <= Number.EPSILON) return 1;
        return Math.sqrt(sqr);
    }

    normalize(): this {
        let norm: number = this.normSqr();
        if (Math.abs(norm - 1) <= Number.EPSILON) return this;
        if (Math.abs(norm) <= Number.EPSILON) return this;
        norm = Math.sqrt(norm);
        for (let i=0; i < this._components.length; i++) this._components[i] = this._components[i] / norm;
        this._callOnModified();
        return this;
    }

    unary(other: Vector | number, operation: (a: number, b: number) => number): this {
        try {
            const ac = this.components;
            if (typeof other === "object") {
                const oc = other.components;
                for (let i = 0; i < Math.min(oc.length, this.dimensions); i++) ac[i] = operation(ac[i], oc[i]);
            } else {
                for (let i = 0; i < this.dimensions; i++) ac[i] = operation(ac[i], other as number);
            }
            this._components = ac;
        } finally {
            this._callOnModified();
        }
        return this;
    }

    add(other: Vector | number): this {
        return this.unary(other, (a, b) => a + b);
    }

    static sum<T extends Vector>(a: T, b: T | number): T {
        const ac: T = a.copy() as T;
        ac.add(b);
        return ac;
    }

    subtract(other: Vector | number): this {
        return this.unary(other, (a, b) => a - b);
    }

    static difference<T extends Vector>(a: T, b: T | number): T {
        const ac: T = a.copy() as T;
        ac.subtract(b);
        return ac;
    }

    multiply(other: Vector | number): this {
        return this.unary(other, (a, b) => a * b);
    }

    static product<T extends Vector>(a: T, b: T | number): T {
        const ac: T = a.copy() as T;
        ac.multiply(b);
        return ac;
    }

    divide(other: Vector | number): this {
        return this.unary(other, (a, b) => a / b);
    }

    static quotient<T extends Vector>(a: T, b: T | number): T {
        const ac: T = a.copy() as T;
        ac.divide(b);
        return ac;
    }

    static lerp<T extends Vector>(a: T, b: T, u: number): T {
        u = Math.min(Math.max(u, 0), 1);
        let v: number = 1 - u;

        const ret: T = a.copy() as T;
        return ret.unary(b, (a, b) => {
            return (a * v) + (b * u);
        });
    }

    dot(other: Vector): number {
        const mc = this._components;
        const oc = other._components;

        let sum: number = 0;
        for (let i=0; i < Math.min(mc.length, oc.length); i++) sum += (mc[i] * oc[i]);
        return sum;
    }

    negate(): this {
        for (let i=0; i < this._components.length; i++) this._components[i] = -this._components[i];
        this._callOnModified();
        return this;
    }

}


export class Vector2 extends Vector {

    static fromAngle(angle: number, magnitude: number = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }

    static xyLerp(a: Vector2, b: Vector2, d: Vector2): Vector2 {
        let { x, y } = d;
        x = Math.min(Math.max(x, 0), 1);
        let nx: number = 1 - x;
        y = Math.min(Math.max(y, 0), 1);
        let ny: number = 1 - y;

        return new Vector2(
            (nx * a.x) + (x * b.x),
            (ny * a.y) + (y * b.y)
        );
    }

    readonly dimensions: number = 2;
    constructor(x?: number, y?: number) {
        super();
        this.components = [ x || 0, y || 0 ];
    }

    get x(): number { return this.getComponent(0); }
    set x(x: number) { this.setComponent(0, x); }
    get y(): number { return this.getComponent(1); }
    set y(y: number) { this.setComponent(1, y); }

    get angle(): number {
        return Math.atan2(this.y, this.x);
    }

    set angle(radians: number) {
        const norm = this.norm();
        this.x = Math.cos(radians) * norm;
        this.y = Math.sin(radians) * norm;
    }

    copy(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    getRight(): Vector2 {
        return new Vector2(this.y, -this.x);
    }

}


export class Vector3 extends Vector {

    readonly dimensions: number = 3;
    constructor(x?: number, y?: number, z?: number) {
        super();
        this.components = [ x || 0, y || 0, z || 0 ];
    }

    get x(): number { return this.getComponent(0); }
    set x(x: number) { this.setComponent(0, x); }
    get y(): number { return this.getComponent(1); }
    set y(y: number) { this.setComponent(1, y); }
    get z(): number { return this.getComponent(2); }
    set z(z: number) { this.setComponent(2, z); }

    copy(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    cross(other: Vector3): Vector3 {
        return new Vector3(
            (this.y * other.z) - (this.z * other.y),
            (this.z * other.x) - (this.x * other.z),
            (this.x * other.y) - (this.y * other.x)
        );
    }

}
