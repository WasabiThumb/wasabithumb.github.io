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

import {Howl, HowlOptions} from "howler";
import {request} from "./request";
import KeyStore from "../struct/keystore";
import * as base64 from "@stablelib/base64";


/*
 * Howler recommends that sounds are distributed as both WEBM with cues and MP3. For this site, sounds also typically
 * have a common path. This centralizes that common logic.
 */
export default class SoundUtil {

    static async getBasic(path: string): Promise<Clip[]> {
        const full = `assets/sound/${path}`;
        const ret: Clip[] = [
            { src: `${full}.webm`, format: "webm", private: false },
            { src: `${full}.mp3`, format: "mp3", private: false }
        ];

        if (!!window.pages) {
            const pc = await window.pages.getPrivateContents();
            for (let i=0; i < ret.length; i++) {
                const clip: Clip = ret[i];
                for (let z=0; z < pc.length; z++) {
                    if (clip.src.endsWith(pc[z])) {
                        clip.private = true;
                        break;
                    }
                }
                ret[i] = clip;
            }
        }

        return ret;
    }

    static async getHowl(path: string, options?: Partial<Omit<HowlOptions, "src" | "format">>): Promise<Howl> {
        const clips: Clip[] = await this.getBasic(path);

        let formats: string[] = [];
        let sources: string[] = [];
        let obj: boolean = typeof URL === "function" && !!URL["createObjectURL"];

        for (let i=0; i < clips.length; i++) {
            const clip = clips[i];
            formats[i] = clip.format;

            let { src } = clip;
            if (clip.private) {
                const dat = await request.getPrivate(src, KeyStore.getKey()!, undefined, "bytes");
                const mime = clip.format === "mp3" ? "mpeg" : clip.format;
                if (obj) {
                    src = URL.createObjectURL(new Blob([ dat ], { type: `audio/${mime}` }));
                } else {
                    src = `data:audio/${mime};charset=utf-8;base64,${base64.encode(dat)}`;
                }
            }
            sources[i] = src;
        }

        const ret: Howl = new Howl({
            ...(typeof options === "object" ? options : {}),
            src: sources,
            format: formats
        });
        if (obj) (ret as unknown as ExtendedHowl)._ownedObjectURLs = sources.filter((source) => source.toLowerCase().startsWith("blob:"));
        return ret;
    }

    static getHowlSync(path: string, options?: Partial<Omit<HowlOptions, "src" | "format">>): HowlSync {
        return new HowlSync(this.getHowl(path, options));
    }

}

export class HowlSync {

    private readonly promise: Promise<Howl>
    private valid: boolean = true;
    private value: Howl | null = null;
    private loaded: boolean = false;
    private playing: boolean = false;
    private playSpriteOrId: string | number | undefined = undefined;
    private volume: number = -1;
    constructor(promise: Promise<Howl>) {
        this.promise = promise;

        const me = this;
        promise.then((h) => {
            if (!me.valid) return;
            me.value = h;
            me.loaded = true;
            if (me.volume >= 0) h.volume(me.volume);
            if (me.playing) h.play(me.playSpriteOrId);
        });

        promise.catch((e) => {
            console.warn(e);
            me.valid = false;
        });
    }

    play(spriteOrId?: string | number) {
        if (!this.valid) return;
        this.playSpriteOrId = spriteOrId;
        if (this.loaded) this.value!.play(spriteOrId);
        this.playing = true;
    }

    setVolume(volume: number) {
        if (!this.valid) return;
        if (this.loaded) this.value!.volume(volume);
        this.volume = volume;
    }

    stop() {
        if (!this.valid) return;
        if (this.loaded) this.value!.stop();
        this.playing = false;
    }

    get(): Promise<Howl> {
        return this.promise;
    }

    state(): "unloaded" | "loading" | "loaded" {
        if (!this.valid) return "unloaded";
        if (this.loaded) {
            return this.value!.state();
        }
        return "loading";
    }

    unload() {
        if (!this.valid) return;
        this.valid = false;
        try {
            if (this.loaded) {
                HowlSync._unloadValue(this.value!);
                return;
            }
            this.promise.then((h) => {
                HowlSync._unloadValue(h);
            });
        } finally {
            this.loaded = false;
            this.value = null;
        }
    }

    private static _unloadValue(value: Howl) {
        value.unload();
        const objectURLs: string[] | undefined = (value as unknown as ExtendedHowl)._ownedObjectURLs;
        if (!objectURLs) return;
        for (let url of objectURLs) URL.revokeObjectURL(url);
    }

}

export type Clip = {
    src: string,
    format: "webm" | "mp3",
    private: boolean
}

type ExtendedHowl = Howl & { _ownedObjectURLs: string[] | undefined };
