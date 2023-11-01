
export type RGB = [number, number, number];

export namespace RGB {

    export function white(): RGB {
        return [ 255, 255, 255 ];
    }

    export function fromInt(int: number): RGB {
        return [ (int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff ];
    }

    export function random(): RGB {
        return fromInt(Math.floor(Math.random() * 16777216));
    }

    export function toCSS(rgb: RGB): string {
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }

    export function lerp(a: RGB, b: RGB, d: number): RGB {
        d = Math.min(Math.max(d, 0), 1);
        let v: number = 1 - d;
        const nl: ((idx: 0 | 1 | 2) => number) = ((idx) => (v * a[idx]) + (d * b[idx]));
        return [ nl(0), nl(1), nl(2) ];
    }

}

export type HSV = [number, number, number];

export namespace HSV {

    export function random(): HSV {
        return [ Math.random(), Math.random(), Math.random() ];
    }

    export function randomHue(saturation: number = 1, value: number = 1): HSV {
        return [ Math.random(), saturation, value ];
    }

    export function toRGB(hsv: HSV): RGB {
        const [ h, s, v ] = hsv;
        let r: number = 0;
        let g: number = 0;
        let b: number = 0;

        const i: number = Math.floor(h * 6);
        const f: number = h * 6 - i;
        const p: number = v * (1 - s);
        const q: number = v * (1 - f * s);
        const t: number = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: [ r, g, b ] = [v, t, p]; break;
            case 1: [ r, g, b ] = [q, v, p]; break;
            case 2: [ r, g, b ] = [p, v, t]; break;
            case 3: [ r, g, b ] = [p, q, v]; break;
            case 4: [ r, g, b ] = [t, p, v]; break;
            case 5: [ r, g, b ] = [v, p, q]; break;
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

}
