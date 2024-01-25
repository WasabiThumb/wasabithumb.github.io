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


export type ProjectList = ProjectListEntry[];

export type ProjectListEntry = {
    title: string,
    id: string,
    langs?: ProjectListLang[],
    description?: string | ProjectListDescriptionItem[],
    meta?: ProjectListMeta,
    thumbnails?: ProjectListThumbnail[]
};

export type ProjectListLang = "C" | "Java" | "JavaScript" | "Lua" | "PHP" | "Python" | "Rust" | "TypeScript" | "Kotlin" | "NodeJS";

export type ProjectListDescriptionItem = string | ProjectListDescriptionItemPlain | ProjectListDescriptionItemLink;
export type ProjectListDescriptionItemPlain = {
    type: "plain",
    content: string
};
export type ProjectListDescriptionItemLink = {
    type: "link",
    content: string,
    href: string
};

export type ProjectListMeta = {
    last_updated?: string,
    contributors?: string[],
    license?: string
};

export type ProjectListThumbnail = string | { src: string, size?: [number, number] };
