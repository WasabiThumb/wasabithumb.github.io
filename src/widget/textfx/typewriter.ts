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

import {TextEffect, TextEffectTarget, TextEffectType} from "../textfx";

export default class TypewriterTextEffect implements TextEffect {

    readonly type: TextEffectType = "typewriter";
    private _targetContent: string = "";
    private _revealed: number = 0;
    private _oldStyle: RetainedStyles | null = null;
    private _facade: TextEffectTarget | null = null;

    init(target: TextEffectTarget): void {
        const facade: TextEffectTarget = document.createElement(target.tagName) as TextEffectTarget;

        const computed: CSSStyleDeclaration = window.getComputedStyle(target);
        facade.style.font = computed.font;
        facade.style.margin = computed.margin;
        facade.style.padding = computed.padding;
        facade.style.color = computed.color;
        facade.style.background = computed.background;
        facade.style.position = "fixed";
        let n = parseInt(computed.zIndex);
        facade.style.zIndex = `${isNaN(n) ? "700" : n + 1}`;
        this._position(target, facade);
        document.body.appendChild(facade);
        this._facade = facade;

        this._oldStyle = substitute(target.style);
        this._revealed = 0;
        this._targetContent = target.innerText;
    }

    render(target: TextEffectTarget, delta: number): boolean {
        const facade: TextEffectTarget = this._facade!;
        facade.style.fontSize = window.getComputedStyle(target).fontSize;
        this._position(target, facade);

        let speed: number = delta * this._targetContent.length * 0.8;
        let revealed: number = Math.floor(this._revealed += speed);

        if (revealed >= this._targetContent.length) {
            facade.innerText = this._targetContent;
            return false;
        }

        facade.innerText = this._targetContent.substring(0, revealed);
        return true;
    }

    destroy(target: TextEffectTarget): void {
        document.body.removeChild(this._facade!);
        restore(target.style, this._oldStyle!);
    }

    private _position(target: TextEffectTarget, facade: TextEffectTarget) {
        const rect: DOMRect = target.getBoundingClientRect();
        facade.style.left = `${rect.left}px`;
        facade.style.top = `${rect.top}px`;
        facade.style.width = `${rect.width}px`;
        facade.style.height = `${rect.height}px`;
    }

}

//

const RetainedStyleKeys = ["opacity", "pointerEvents"] as const;
type RetainedStyles = { [k in typeof RetainedStyleKeys[number]]: CSSStyleDeclaration[k] };
const SubstituteStyles: RetainedStyles = { opacity: "0", pointerEvents: "none" };

const substitute = ((style: CSSStyleDeclaration) => {
    const ret: Partial<RetainedStyles> = {};
    for (let k of RetainedStyleKeys) {
        ret[k] = style[k];
        style[k] = SubstituteStyles[k];
    }
    return ret as RetainedStyles;
});

const restore = ((style: CSSStyleDeclaration, styles: RetainedStyles) => {
    for (let k of RetainedStyleKeys) style[k] = styles[k];
});
