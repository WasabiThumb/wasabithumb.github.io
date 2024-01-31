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
import {decompress} from "lzutf8-light";

const nonPowerTwo = ((value: number) => (value & (value - 1)));
const SQRT3_3: number = Math.sqrt(3.0) / 3.0;
const decompressSBS = ((dat: string) => decompress(dat, { inputEncoding: "StorageBinaryString" }) as string);
const shaderVertex: string = decompressSBS(`ズᴜ䴬❗〈Ǚ䫆㈠カᥜ二垅ͻ䶥棒潮ᶅ㐈ઌ垇⎫䦕۞潲㈝䊂仌ᜧ䭋㦟఺盐ື婙Ѝ嘖䭱₤䃶ਠတ࠙涋粅夁眐橨⣏㤖ࠌք̒䧞ᒿ᪢‽栿ὀ耀`);
const shaderFragment: string = decompressSBS(`㠹ᥘ洮㚖筱Ƶ䫈極㚸࠙䶍瘗⇘⧙䋤祩㜳䠝䲬㌢β冕烨畲㊡寛湌䎰厫㦥䳞牭္塛⸍䙗ᆒႁ檧䘋攎ㅑ搎ഁ୾䁅殠ᅴ栈嬴ȭ㴁ୖ䁅冔ᅩ㜺ࠝ䲮ⴥ㍋ᶡ桶૆۳2⪥๐ݫ嗛䨁朩ွ䊈Є౲箱÷ဲ⹸ᷢ䙚Ⳅʌ⋑ô穀ㄩ္ᥝຮ⛢Ń墀婀瀩ဗ䠊ຘ催ㅮᤙ䖖䙹昌嶍䐇刂䍁´䃔⤠ᔐᯈֹョؠ㦬䁚⁬戇ᴈչョ⽘Ȱ淈᠗఺‑䋓ॱ䌵繤‽ေࠊ䐌ⳁ㍖ၙ呀⫤£犅䴘䅦䄁⮐ʙ䨖㙢֛Ѕ⹀ಮ⡙垈ᙫပ㤀㍙Ⅷㆎᆸ摀ⴠᤗఱ຺ӗㆩΐǭ伣㔐ૈെ⹀ۡ↿䠂଩撏ㆊ墨繀࢓ࢀ婀棄ᑳ䁌敄܌⫩Ⲁ僬ㄠᖐᨱ䢮ు䥎ၛỒ氠ᖐᬱ䒎乀૆傑噀⬠㗣झ㲀ᛢ乃ণᑑ搁ዳ-㤢㺠෦ᤄ䁗䴙ဖ䠚碃庰Г墀呀盆⽤兺䀞ృᜨσ઩攁糲䂈汘䖮䀈䞰ʇ䥄撚嫺⺐াᔝ懐ɓ携㥀❸摜㥮᣿Ყ䩁㟢嘹䀑佀೯ᐃ及˂撐焓ᢤ᱑昪᧓ࠊ痫C璒㲀ൖ冖▻堂懅ݣບᲀᢞ砉᜜⿊Ƴᐱ㄂夊ౠ癉矴ɓ䩋瞀攳ޙᎏ』ᷓᒹ卉疁ോ㳀⍜嬇ဃהİ㫢ŝ嵠㿃⤁珴߶盤Ǒ窀⛜瀑侈Ϸ丁曨ȵ獐䙸搢彘࠳堉χጚ㩁᤼䀌⼠ϫ嘁⯇ማ䠏㲀ऒ帢催䃬㓆ົൈޤܷஓ傡汫洅ᬹᥝМ䁍䦯ᐌ剮‭ျ൹¬ᝣ㝐Їࡈ㻄ኘࠉ䓘匣懩Ç嘂ᅲ㋳䀳娉抽㩷᠕ᡟ瘁⫦ᕟ㶠摕㝨ᤔ姎Ã㦺翁䧿灢ᎡǑ灀㴠㡲ᲀᯎ⠝巏娂穢成礀桼偧䜨ࢇ᱂摩㌳ᘹ²㞂ũǓ嘍䕡ㄹ䨱⎥Ṡሩ䞠ř䭾㳲䅾ᶀ枬䋮⢕䖈◥ț穀奙䉞䀹ސҾ瑹犃䢘伸惌ㄫ瞰ʷ攇␺ḱӼ倉朠֡泞楤ံ塚ⷅ໠ੳ垐ѳ标懶Ȫ磫Ṁܫ垬о痩Ď簀ᴜ䀙䘲⥛ᲔⰠ㫣卲ਮ沵ஶ䵇ࠂ杬⾣Ი⳨㛶捻䢀穀瓆⢙ᄊᴁጂ木▀僪ⱶᓲ䃷᳁ड़戟᠄ᾔᓦ熁姫睦⬙傠恘⃇Ɣ仂侠耀`);

const GLWarpParamKeys = ["p", "o", "u", "t", "l", "k", "j", "h", "vert", "light"] as const;
type GLWarpParam = typeof GLWarpParamKeys[number];
type GLWarpParams = { [k in GLWarpParam]: WebGLUniformLocation };
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
        for (let k of GLWarpParamKeys) {
            warpParams[k as GLWarpParam] = gl.getUniformLocation(program, k)!;
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

    private _pulseTimer: number = 0;
    protected renderBeforeReady(delta: number): void {
        let v: number = 0.15 + 0.1 * Math.sin(this._pulseTimer += delta * 6);
        const gl: WebGLRenderingContext = this.ctx;
        gl.clearColor(v, v, v, 1);
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
            (fwd.dot(lightDir) * 2 + 1) / 3
        );
    }

    private _setupVars(tl: Vector2, tr: Vector2, bl: Vector2, br: Vector2, light: number): void {
        const gl: WebGLRenderingContext = this.ctx;
        const params: GLWarpParams = this._params!.warpParams;

        const set = ((k: GLWarpParam, v: number) => {
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
