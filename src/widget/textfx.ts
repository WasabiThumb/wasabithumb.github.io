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

import {PageWidget, PageWidgetType} from "../struct/widget";
import {Page} from "../struct/page";
import TypewriterTextEffect from "./textfx/typewriter";
import LoginTextEffect from "./textfx/login";

export default class TextEffectsPageWidget implements PageWidget {

    readonly type: PageWidgetType = "text-effects";
    readonly renders: boolean = true;
    private readonly _effects: [TextEffect, TextEffectTarget][] = [];

    init(page: Page): void {
        TextEffectsPageWidget.registerDefaults();

        const query = page.root.querySelectorAll("[data-text-effect]");
        for (let i=0; i < query.length; i++) {
            let el: Element = query.item(i);
            if (!TextEffectTargetPattern.test(el.tagName)) {
                console.log("Element marked as text effect does not match pattern:", TextEffectTargetPattern, el);
                continue;
            }

            const qual: TextEffectTarget = el as TextEffectTarget;
            const id: string = qual.getAttribute("data-text-effect")!;
            let con: { new(): TextEffect } | undefined = TextEffectsPageWidget.REGISTRY[id];
            if (!con) {
                console.log("Element marked as text effect has unknown ID:", id, qual);
                continue;
            }

            const effect: TextEffect = new con();
            effect.init(qual);
            this._effects.push([effect, qual]);
        }
    }

    refresh(page: Page): void {
        this.destroy(page);
        this.init(page);
    }

    render(page: Page, delta: number): void {
        let i: number = 0;
        let effect: [TextEffect, TextEffectTarget];
        while (i < this._effects.length) {
            effect = this._effects[i];
            if (effect[0].render(effect[1], delta)) {
                i++;
            } else {
                effect[0].destroy(effect[1]);
                this._effects.splice(i, 1);
            }
        }
    }

    destroy(page: Page): void {
        for (let effect of this._effects) {
            effect[0].destroy(effect[1]);
        }
        this._effects.splice(0);
    }

    private static REGISTRY: { [type: string]: { new(): TextEffect } } = {};
    private static REGISTERED_DEFAULTS: boolean = false;
    private static registerDefaults() {
        if (this.REGISTERED_DEFAULTS) return;
        try {
            this.register(
                TypewriterTextEffect,
                LoginTextEffect,
            );
        } finally {
            this.REGISTERED_DEFAULTS = true;
        }
    }

    private static register(...cons: { new(): TextEffect }[]) {
        for (let con of cons) this.REGISTRY[(new con()).type] = con;
    }

}

//

const TextEffectTargetPattern: RegExp = new RegExp("^(H[1-6]|P|SPAN|A)$", "i");
export type TextEffectTarget = HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement | HTMLAnchorElement;
export type TextEffectType = "typewriter" | "login";

export interface TextEffect {

    readonly type: TextEffectType;

    init(target: TextEffectTarget): void;

    render(target: TextEffectTarget, delta: number): boolean;

    destroy(target: TextEffectTarget): void;

}
