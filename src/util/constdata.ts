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

import {LoaderDOMContentToken} from "./loader";
import * as base64 from "@stablelib/base64";
import * as utf8 from "@stablelib/utf8";
import {LIB_VERSION} from "./version";


export type ConstantDataMap = {
    VERSION: string,
    EMPTY_GIF: string,
    LOADING_GRID_SVG: string,
    LOGO_SVG: string,
    BACK_SVG: string,
};

export const ConstantData: ConstantDataMap = {
    VERSION: LIB_VERSION,
    EMPTY_GIF: `data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIBAAA=`,
    LOADING_GRID_SVG: `data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGZpbGw9IiNmZmYiIHZpZXdCb3g9IjAgMCAxMDUgMTA1IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjEyLjUiIGN5PSIxMi41IiByPSIxMi41Ij48YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJmaWxsLW9wYWNpdHkiIGJlZ2luPSIwcyIgY2FsY01vZGU9ImxpbmVhciIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHZhbHVlcz0iMTsuMjsxIi8+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjUyLjUiIHI9IjEyLjUiIGZpbGwtb3BhY2l0eT0iLjUiPjxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImZpbGwtb3BhY2l0eSIgYmVnaW49IjEwMG1zIiBjYWxjTW9kZT0ibGluZWFyIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgdmFsdWVzPSIxOy4yOzEiLz4NCjwvY2lyY2xlPjxjaXJjbGUgY3g9IjUyLjUiIGN5PSIxMi41IiByPSIxMi41Ij48YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJmaWxsLW9wYWNpdHkiIGJlZ2luPSIzMDBtcyIgY2FsY01vZGU9ImxpbmVhciIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHZhbHVlcz0iMTsuMjsxIi8+PC9jaXJjbGU+PGNpcmNsZSBjeD0iNTIuNSIgY3k9IjUyLjUiIHI9IjEyLjUiPjxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImZpbGwtb3BhY2l0eSIgYmVnaW49IjYwMG1zIiBjYWxjTW9kZT0ibGluZWFyIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgdmFsdWVzPSIxOy4yOzEiLz48L2NpcmNsZT48Y2lyY2xlIGN4PSI5Mi41IiBjeT0iMTIuNSIgcj0iMTIuNSI+PGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iZmlsbC1vcGFjaXR5IiBiZWdpbj0iODAwbXMiIGNhbGNNb2RlPSJsaW5lYXIiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE7LjI7MSIvPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjkyLjUiIGN5PSI1Mi41IiByPSIxMi41Ij48YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJmaWxsLW9wYWNpdHkiIGJlZ2luPSI0MDBtcyIgY2FsY01vZGU9ImxpbmVhciIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHZhbHVlcz0iMTsuMjsxIi8+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjkyLjUiIHI9IjEyLjUiPjxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9ImZpbGwtb3BhY2l0eSIgYmVnaW49IjcwMG1zIiBjYWxjTW9kZT0ibGluZWFyIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgdmFsdWVzPSIxOy4yOzEiLz48L2NpcmNsZT48Y2lyY2xlIGN4PSI1Mi41IiBjeT0iOTIuNSIgcj0iMTIuNSI+PGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iZmlsbC1vcGFjaXR5IiBiZWdpbj0iNTAwbXMiIGNhbGNNb2RlPSJsaW5lYXIiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiB2YWx1ZXM9IjE7LjI7MSIvPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjkyLjUiIGN5PSI5Mi41IiByPSIxMi41Ij48YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJmaWxsLW9wYWNpdHkiIGJlZ2luPSIyMDBtcyIgY2FsY01vZGU9ImxpbmVhciIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIHZhbHVlcz0iMTsuMjsxIi8+PC9jaXJjbGU+PC9zdmc+`,
    LOGO_SVG: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIyLjE3IiBoZWlnaHQ9IjMyMi4xNyIgdmlld0JveD0iMCAwIDg1LjI0IDg1LjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtZmFtaWx5PSJVYnVudHUiPjxwYXRoIHN0eWxlPSItaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOidVYnVudHUsIEJvbGQnO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWVhc3QtYXNpYW46bm9ybWFsIiBkPSJNNTIuMzIgNjcuMzdjMS41MiA5IDMuMjUgMTguMTMgNS4yIDI3LjM4YTQ3Ny4yNCA0NzcuMjQgMCAwIDAgNi40MiAyNi4zN2g5LjI4YTM0OS4yNCAzNDkuMjQgMCAwIDAgNC4zNC0xNS41OWw0LjE1LTE2LjQ0YzEuMzkgNS40OCAyLjggMTAuOTYgNC4yMiAxNi40NGE0MTYuNyA0MTYuNyAwIDAgMCA0LjQxIDE1LjZoOS4yOGMuODEtMi45NCAxLjU5LTUuOTYgMi4zNi05YTE5LjQyIDIxLjQxIDAgMCAxLTMuMTktMTEuNzMgMTkuNDIgMjEuNDEgMCAwIDEgOS44Mi0xOC41NiA2MDMuNyA2MDMuNyAwIDAgMCAyLjYzLTE0LjQ3aC0xMC41MWMtLjQ0IDMuMDUtLjkxIDYuMjMtMS40MyA5LjU0LS40OCAzLjI2LS45OCA2LjU0LTEuNSA5Ljg1LS41MSAzLjMxLTEuMDggNi41Mi0xLjY4IDkuNjItLjU2IDMuMS0xLjEzIDUuOTctMS42OSA4LjYxLS42OS0yLjQzLTEuNC01LjA3LTIuMTQtNy45MWwtMi4yLTguNTMtMi4wMi04LjIzYy0uNi0yLjY4LTEuMTYtNS4wOS0xLjY4LTcuMmgtOC42M2wtMS42MiA3LjA1YTI5NSAyOTUgMCAwIDEtMS44OSA4LjIyYy0uNjkgMi44NS0xLjQgNS42OS0yLjE0IDguNTMtLjczIDIuODUtMS40OSA1LjU0LTIuMjcgOC4wNy0uNi0yLjY0LTEuMjEtNS41LTEuODItOC42YTg4OS41NSA4ODkuNTUgMCAwIDEtNC43My0yOS4wMnoiIGZvbnQtc2l6ZT0iNzAuOTQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC00Ny4yMSAtNTEuNzQpIi8+PHBhdGggZD0iTTExNi42MyAxMTcuNjNxLTguMDQgMC0xMi4yNy00LjQ3LTQuMTgtNC40Ny00LjE4LTEyLjcgMC00LjA4IDEuMjgtNy4yNyAxLjI5LTMuMjMgMy41Mi01LjQyIDIuMjQtMi4yMyA1LjMyLTMuMzcgMy4xLTEuMTQgNi43LTEuMTQgMi4xIDAgMy44MS4zMyAxLjcxLjI5IDMgLjcxIDEuMjguMzggMi4xMy44MS44Ni40MyAxLjI0LjY3bC0yLjE0IDUuOTlxLTEuNTItLjgxLTMuNTYtMS4zOC0yLS41Ny00LjU3LS41Ny0xLjcgMC0zLjM3LjU3LTEuNjIuNTctMi45IDEuODUtMS4yNCAxLjI0LTIgMy4yNHQtLjc2IDQuODRxMCAyLjI5LjQ4IDQuMjguNTIgMS45NSAxLjYxIDMuMzggMS4xNCAxLjQyIDIuOTUgMi4yOCAxLjguOCA0LjM3LjggMS42MiAwIDIuOS0uMTggMS4yOS0uMiAyLjI4LS40MyAxLS4yOSAxLjc2LS42MnQxLjM4LS42MmwyLjA1IDUuOTVxLTEuNTcuOTUtNC40MyAxLjctMi44NS43Ny02LjYuNzd6IiBzdHlsZT0iLWlua3NjYXBlLWZvbnQtc3BlY2lmaWNhdGlvbjonVWJ1bnR1LCBCb2xkJyIgdHJhbnNmb3JtPSJtYXRyaXgoMS4wMDY3IDAgMCAuOTkzMzQgLTQ3LjIxIC01MS43NCkiIGFyaWEtbGFiZWw9IkMiIGZvbnQtc2l6ZT0iNDcuNTQiIGZpbGw9IiMxYTFhMWEiLz48L2c+PC9zdmc+`,
    BACK_SVG: `data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUxMiIgd2lkdGg9IjUxMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtMzUyIDEyOC0zMi0zMi0xNjAgMTYwIDE2MCAxNjAgMzItMzItMTI3LTEyOHoiLz48L3N2Zz4=`,
};

(() => {
    if (typeof URL !== "function") return;
    if (!URL["createObjectURL"]) return;
    if (typeof Blob !== "function") return;

    for (let keyRaw in ConstantData) {
        let key: keyof ConstantDataMap = keyRaw as keyof ConstantDataMap;
        if (key === "EMPTY_GIF") continue;
        const url: string = ConstantData[key];
        if (!url.startsWith("data:")) continue;

        let mime: string = "";
        let head: number = 5;
        let readingMime: boolean = true;
        let base: boolean = false;
        while (head < url.length) {
            const char = url.charAt(head++);
            if (readingMime) {
                if (char === ";") {
                    readingMime = false;
                } else {
                    mime += char;
                }
            } else if (char === "b") {
                const rest = "ase64";
                let all: boolean = true;
                for (let z=0; z < rest.length; z++) {
                    if (url.charAt(head++) !== rest.charAt(z)) {
                        all = false;
                        break;
                    }
                }
                if (all) base = true;
                continue;
            }
            if (char === ",") break;
        }

        const blob = new Blob([
            base ? base64.decode(url.substring(head)) : utf8.encode(url.substring(head))
        ], { type: mime.length > 0 ? mime : undefined });
        const objectURL: string = URL.createObjectURL(blob);
        ConstantData[key] = objectURL;

        if (mime.startsWith("image/")) {
            window.loader.onRemoveToken(LoaderDOMContentToken, () => {
                const el = (typeof Image === "function") ? new Image() : document.createElement("img");
                el.onerror = function () {
                    ConstantData[key] = ConstantData.EMPTY_GIF;
                    URL.revokeObjectURL(objectURL);
                };
                el.src = objectURL;
            });
        }
    }
})();
