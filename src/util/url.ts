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

export const absoluteURL: ((rel: string) => string) = (() => {

    if (typeof URL === "function") {
        return ((rel: string) => {
            return (new URL(rel, document.baseURI)).href;
        });
    } else {
        return ((rel: string) => {
            const link = document.createElement("a");
            link.href = rel;
            return link.protocol + "//" + link.host + link.pathname;
        });
    }

})();