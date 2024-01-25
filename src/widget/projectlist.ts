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
import {request} from "../util/request";
import {ProjectList, ProjectListEntry, ProjectListMeta, ProjectListThumbnail} from "./projectlist/schema";


export default class ProjectListPageWidget implements PageWidget {

    readonly type: PageWidgetType = "project-list";
    readonly renders: boolean = false;

    private _listing: ProjectList = [];
    private _listingInit = false;
    private _controllers: AbortController[] = [];

    init(page: Page): void {
        this._controllers = [];
        const me = this;
        request.get("assets/data/project_listing.json", undefined, "json").then((d) => {
            me._listing = d as ProjectList;
            me._listingInit = true;
            me.refresh(page);
        }).catch(console.error);
    }

    refresh(page: Page): void {
        if (!this._listingInit) return;
        const element = page.root.querySelector('[data-role="project-list"]');
        if (!element) return;
        element.innerHTML = "";

        let entries: [ HTMLDivElement, Date ][] = [];
        for (const d of this._listing) {
            let entry = this._fillEntry(d);
            this._controllers.push(entry[1]);
            entries.push([ entry[0], entry[2] ]);
        }

        entries.sort((a, b) => {
            return b[1].getTime() - a[1].getTime();
        });

        let year: number = (new Date()).getFullYear();
        for (let entry of entries) {
            let entryYear: number = entry[1].getFullYear();
            if (entryYear !== year) {
                const sep = document.createElement("div");
                sep.classList.add("sep");
                sep.innerHTML = `<h3>${entryYear}</h3>`;
                element.appendChild(sep);
                year = entryYear;
            }
            element.appendChild(entry[0]);
        }
    }

    render(page: Page, delta: number): void {
    }

    destroy(page: Page): void {
        for (const con of this._controllers) con.abort();
    }

    private _fillEntry(data: ProjectListEntry): [ HTMLDivElement, AbortController, Date ] {
        const el: HTMLDivElement = document.createElement("div");
        el.classList.add("project");

        for (const dir of ["tl", "br"]) {
            const miter: HTMLDivElement = document.createElement("div");
            miter.classList.add("miter");
            miter.classList.add(dir);
            miter.setAttribute("aria-hidden", "true");
            el.appendChild(miter);
        }

        const inner: HTMLDivElement = document.createElement("div");
        inner.classList.add("inner");

        const columns: HTMLDivElement[] = new Array(3);
        for (let i=0; i < 3; i++) {
            const column: HTMLDivElement = document.createElement("div");
            column.classList.add("project-column");
            inner.appendChild(column);
            columns[i] = column;
        }

        const [ col1, col2, col3 ] = columns;

        const title = document.createElement("h3");
        title.innerText = data.title;
        col1.appendChild(title);

        const meta = this._parseEntryMeta(data.meta);
        for (let k in meta) {
            if (k === "date") continue;
            let start: boolean = true;
            let name: string = "";
            let char: string;
            for (let i=0; i < k.length; i++) {
                char = k.charAt(i);
                if (char == "_") {
                    name += " ";
                    start = true;
                    continue;
                }
                name += start ? char.toUpperCase() : char;
                start = false;
            }

            const metaTag = document.createElement("p");
            metaTag.classList.add("meta");
            metaTag.innerText = `${name}: ${meta[k as unknown as keyof ProjectListMeta]}`;
            col1.appendChild(metaTag);
        }

        if (!!data.langs) {
            for (const lang of data.langs) {
                const img = document.createElement("img");
                img.classList.add("lang");
                img.src = `assets/images/lang/${lang.toLowerCase()}.svg`;
                img.alt = lang;
                img.title = lang;
                col1.appendChild(img);
            }
        }

        const hint = document.createElement("span");
        hint.classList.add("hint");
        col1.appendChild(hint);

        const desc = data.description;
        const descEl = document.createElement("p");
        if (!desc) {
            descEl.innerText = "No Description";
        } else if (typeof desc === "string") {
            descEl.innerText = desc;
        } else {
            const tmp = document.createElement("p");
            for (let item of desc) {
                if (typeof item === "string") {
                    item = { type: "plain", content: item };
                }
                switch (item.type) {
                    case "plain":
                        tmp.innerText = item.content;
                        descEl.innerHTML += tmp.innerHTML;
                        break;
                    case "link":
                        const sub = document.createElement("a");
                        sub.target = "_blank";
                        sub.href = item.href;
                        sub.innerText = item.content;

                        tmp.innerHTML = "";
                        tmp.appendChild(sub);
                        descEl.innerHTML += tmp.innerHTML;
                        break
                }
            }
        }
        col2.appendChild(descEl);

        const { thumbnails, id } = data;
        this._updateImage(col3, thumbnails);
        const abort: AbortController = new AbortController();
        const me = this;
        window.addEventListener("resize", () => {
            me._updateImage(col3, thumbnails);
        }, { signal: abort.signal });
        el.addEventListener("click", () => {
            window.pages.navigate(`projects/${id}`);
        }, { signal: abort.signal });

        el.appendChild(inner);
        return [ el, abort, meta.date ];
    }

    private _updateImage(col3: HTMLDivElement, thumbnails: ProjectListThumbnail[] | undefined) {
        const matchRatio = (window.innerWidth * 0.33) / (window.innerHeight * 0.2);
        let min = Number.MAX_VALUE;
        let minIndex = -1;

        if (!!thumbnails) {
            for (let i=0; i < thumbnails.length; i++) {
                let g: ProjectListThumbnail = thumbnails[i];
                let ratio = 999999;
                let src: string;
                if (typeof g === "string") {
                    src = g;
                } else {
                    src = g.src;
                    if (!!g.size) {
                        ratio = g.size[0] / g.size[1];
                    }
                }
                let diff: number = Math.abs(ratio - matchRatio);
                if (diff < min) {
                    min = diff;
                    minIndex = i;
                }
            }
        }

        if (minIndex > -1) {
            const selected: ProjectListThumbnail = thumbnails![minIndex];
            const thumbnail = document.createElement("img");
            thumbnail.src = `assets/images/project-thumb/${typeof selected === "string" ? selected : selected.src}`;
            thumbnail.classList.add("thumbnail");
            col3.innerHTML = "";
            col3.appendChild(thumbnail);
        }
    }

    private _parseEntryMeta(data: ProjectListMeta | undefined): Omit<Required<ProjectListMeta>, "contributors"> & {contributors: string, date: Date} {
        const validStruct: boolean = !!data;
        const ref: ProjectListMeta = validStruct ? data as ProjectListMeta : {};

        let lastUpdated: string = "Unknown";
        let date: Date = new Date();
        if (validStruct && !!ref.last_updated) {
            date = new Date(ref.last_updated);
            const now: Date = new Date();
            if (now.getFullYear() === date.getFullYear()) {
                lastUpdated = date.toLocaleString("default", { month: "long", day: "numeric" });
            } else {
                lastUpdated = date.toLocaleString("default", { year: "numeric", month: "long" });
            }
        }

        let contributors: string = "None";
        if (validStruct && !!ref.contributors && ref.contributors.length > 0) {
            for (let i=0; i < ref.contributors.length; i++) {
                if (i == 0) {
                    contributors = ref.contributors[i];
                    continue;
                }
                if ((i + 1) == ref.contributors.length) {
                    contributors += " and ";
                } else {
                    contributors += ", ";
                }
                contributors += ref.contributors[i];
            }
        }

        let license: string = (validStruct && !!ref.license) ? ref.license : "Unlicensed";

        return { last_updated: lastUpdated, contributors, license, date };
    }

}
