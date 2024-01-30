/*
   Copyright 2023 WasabiThumb

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import WarpIconRenderer from "./renderer";
import {LazyImage} from "../../struct/asset";
import {CursorTracker} from "../../util/input";
import {Vector2, Vector3} from "../../math/vector";
import Quaternion from "../../math/quaternion";

const nonPowerTwo = ((value: number) => (value & (value - 1)));
const SQRT3_3: number = Math.sqrt(3.0) / 3.0;

const shaderVertex: string = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

varying vec2 vTextureCoord;

void main() {
    gl_Position = vec4(aVertexPosition, 0, 1);
    vTextureCoord = aTextureCoord;
}
`;

const shaderFragment: string = `
precision mediump float;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float p;
uniform float o;
uniform float u;
uniform float t;
uniform float l;
uniform float k;
uniform float j;
uniform float h;
uniform int vert;
uniform float light;

float sampleU(vec2 uvCoord)
{
    float v = uvCoord.x;
    if (vert == 1) return (v - p) / (t - p);
    float b = uvCoord.y;

    float v6 = (h - j) * o - (h - j) * p - (k - l) * t + (k - l) * u;
    if (v6 == 0.0) return -1.0;

    float b2 = b * b;
    float j2 = j * j;
    float h2 = h * h;
    float l2 = l * l;
    float k2 = k * k;

    float two = 2.0;

    float v1 = b2 - two * b * h;
    float v5  = (b2 - two * b * j + j2) * (o * o) - two * (b2 - b * h - (b - h) * j) * o * p
    + (v1 + h2) * (p * p) + (b2 - two * b * l + l2) * (t * t) + (b2 - two * b * k + k2) * (u * u)
    + (h2 - two * h * j + j2 - two * (h - j) * k + k2 + two * (h - j - k) * l + l2) * (v * v)
    - two * ((b2 - b * j - (b - j) * l) * o - (b2 + b * h - two * b * j - two * (b - j) * k
    + (b - h) * l) * p) * t + two * ((v1 + b * j + (b - j) * k - two * (b - h) * l) * o
    - (b2 - b * h - (b - h) * k) * p - (b2 - b * k - (b - k) * l) * t) * u + two * ((b * h - (b - h) * j - j2
    - (b - j) * k + (b - two * h + j) * l) * o - (b * h + h2 - (b + h) * j - (b + h - two * j) * k
    + (b - h) * l) * p - (b * h - b * j - (b - two * j) * k + (b - h - j - k) * l + l2) * t
    + (b * h - b * j - (b - h - j) * k - k2 + (b - two * h + k) * l) * u) * v;

    if (v5 < 0.0) return -1.0;

    float v2 = (b - j) * o - (b + h - two * j) * p - (b - l) * t;
    float v3 = (b + k - two * l) * u;
    float v4 = (h - j - k + l) * v;
    float v7 = v2 + v3 + v4;

    v5 = sqrt(v5);

    float ret = 0.5 * (v7 - v5) / v6;
    if (ret >= 0.0 && ret <= 1.0) return ret;

    ret = 0.5 * (v7 + v5) / v6;
    if (ret == 0.0/0.0) return -1.0;
    return ret;
}

float sampleV(vec2 uvCoord, float su)
{
    float v = uvCoord.x;
    float b = uvCoord.y;

    float tx = p + (o - p) * su;
    float bx = u + (t - u) * su;

    float diffX = bx - tx;
    if (abs(diffX) < 0.01) {
        float ty = l + (k - l) * su;
        float by = j + (h - j) * su;
        return (b - ty) / (by - ty);
    }
    return (v - tx) / diffX;
}

void main() {
    float u = sampleU(vTextureCoord);
    if (u >= 0.0 && u <= 1.0) {
        float v = sampleV(vTextureCoord, u);
        if (v >= 0.0 && v <= 1.0) {
            gl_FragColor = texture2D(uSampler, vec2(u,v)) * light;
            return;
        }
    }
    gl_FragColor = vec4(0, 0, 0, 0);
}
`;

type GLWarpParams = { [k in "p" | "o" | "u" | "t" | "l" | "k" | "j" | "h" | "vert" | "light"]: WebGLUniformLocation };
type GLParams = {
    tex: WebGLTexture,
    shaders: WebGLShader[],
    program: WebGLProgram,
    vertexBuffer: WebGLBuffer,
    texCoordBuffer: WebGLBuffer,
    aVertexPosition: GLint,
    aTextureCoord: GLint,
    uSampler: WebGLUniformLocation,
    warpParams: GLWarpParams
};

export default class GLWarpIconRenderer extends WarpIconRenderer<WebGLRenderingContext> {

    private _params: GLParams | null = null;
    constructor(canvas: HTMLCanvasElement, ctx: WebGLRenderingContext, icon: LazyImage, cursor: CursorTracker) {
        super(canvas, ctx, icon, cursor);
    }

    protected onImageReady(): void {
        const gl: WebGLRenderingContext = this.ctx;
        const image: HTMLImageElement = this.icon.get();

        const tex: WebGLTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (nonPowerTwo(image.naturalWidth) | nonPowerTwo(image.naturalHeight)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        } else {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const vs: WebGLShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, shaderVertex);
        gl.compileShader(vs);

        const fs: WebGLShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, shaderFragment);
        gl.compileShader(fs);

        const program: WebGLProgram = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);

        const vertices: Float32Array = new Float32Array([
            -1,  1,  1,  1,  1, -1, // Tri 1
            -1,  1,  1, -1, -1, -1  // Tri 2
        ]);
        const texCoords: Float32Array = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        const vertexBuffer: WebGLBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const texCoordBuffer: WebGLBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        const getAndEnableVAB = ((name: string) => {
            const v: GLint = gl.getAttribLocation(program, name);
            gl.enableVertexAttribArray(v);
            return v;
        });

        const warpParams: Partial<GLWarpParams> = {};
        for (let k of ["p", "o", "u", "t", "l", "k", "j", "h", "vert", "light"]) {
            warpParams[k as keyof GLWarpParams] = gl.getUniformLocation(program, k)!;
        }

        this._params = {
            tex,
            shaders: [ vs, fs ],
            program, vertexBuffer, texCoordBuffer,
            aVertexPosition: getAndEnableVAB("aVertexPosition"),
            aTextureCoord: getAndEnableVAB("aTextureCoord"),
            uSampler: gl.getUniformLocation(program, "uSampler")!,
            warpParams: warpParams as GLWarpParams
        };
    }

    protected renderBeforeReady(delta: number): void {
        const gl: WebGLRenderingContext = this.ctx;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    protected renderAfterReady(delta: number): void {
        const gl: WebGLRenderingContext = this.ctx;
        const { tex, vertexBuffer, texCoordBuffer, aVertexPosition, aTextureCoord, uSampler } = this._params!;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(aTextureCoord, 2, gl.FLOAT, false, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(uSampler, 0);
        this._setupRect();

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private _setupRect(): void {
        let { influence } = this;
        let power: number = 0.5;
        let fx: number = -influence.x * power;
        let fy: number = influence.y * power;
        let fz: number = -Math.sqrt(1 - Math.pow(fx, 2) - Math.pow(fy, 2));

        const fwd: Vector3 = new Vector3(fx, fy, fz);
        const inward: Vector3 = new Vector3(0, 0, -1);
        const cross: Vector3 = inward.cross(fwd);
        let rotation: Quaternion = new Quaternion(1 + fwd.dot(inward), cross.x, cross.y, cross.z);
        rotation = rotation.normalize();

        const quadPoint = ((x: number, y: number) => {
            let ret: Vector3 = new Vector3(x, y, 0);
            ret = rotation.rotate(ret);
            ret = ret.add(new Vector3(0, 0, 0.7));
            return this.projectPoint(ret);
        });

        const lightDir: Vector3 = new Vector3(SQRT3_3, -SQRT3_3, -SQRT3_3);

        this._setupVars(
            quadPoint(1, -1),
            quadPoint(-1, -1),
            quadPoint(1, 1),
            quadPoint(-1, 1),
            (fwd.dot(lightDir) + 1) / 2
        );
    }

    private _setupVars(tl: Vector2, tr: Vector2, bl: Vector2, br: Vector2, light: number): void {
        const gl: WebGLRenderingContext = this.ctx;
        const params: GLWarpParams = this._params!.warpParams;

        const set = ((k: keyof GLWarpParams, v: number) => {
            gl.uniform1f(params[k], v as GLfloat);
        });

        set("p", tl.x); set("o", tr.x); set("u", bl.x); set("t", br.x);
        set("l", tl.y); set("k", tr.y); set("j", bl.y); set("h", br.y);
        set("light", light);
        gl.uniform1i(params.vert, Math.abs(tl.x - bl.x) < 1e-4 ? 1 : 0);
    }

    destroy(): void {
        const gl: WebGLRenderingContext = this.ctx;
        if (!!this._params) {
            gl.deleteTexture(this._params.tex);
            gl.deleteProgram(this._params.program);
            for (let shader of this._params.shaders) gl.deleteShader(shader);
            gl.deleteBuffer(this._params.vertexBuffer);
            gl.deleteBuffer(this._params.texCoordBuffer);
        }
        this._params = null;
    }

}
