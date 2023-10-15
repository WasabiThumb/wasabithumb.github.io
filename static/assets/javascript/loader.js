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

(() => {

    // LOADER

    let tokens; // add, has, delete
    let tokensCount;
    const initToken = "dom-content";
    if (typeof Set === "function") {
        tokens = new Set();
        tokens.add(initToken);
        tokensCount = (() => { return tokens.size; });
    } else {
        const arr = [initToken];
        tokens = {
            add: ((token) => {
                if (arr.indexOf(token) < 0) arr.push(token);
            }),
            has: ((token) => {
                return arr.indexOf(token) >= 0;
            }),
            delete: ((token) => {
                let idx = arr.indexOf(token);
                if (idx >= 0) {
                    arr.splice(idx, 1);
                    return true;
                } else {
                    return false;
                }
            })
        };
        tokensCount = (() => { return arr.length; });
    }

    let expireDelay = 500;
    let tokenExpireTimeout = -1;
    let loadCallbacks = [];
    let didLoad = false;

    const doLoad = (() => {
        if (didLoad) return;
        didLoad = true;
        for (let cb of loadCallbacks) {
            try {
                cb();
            } catch (e) {
                console.error(e);
            }
        }
        loadCallbacks = [];
    });

    const loader = {
        addToken: ((token) => {
            if (didLoad) return;
            tokens.add(token);
        }),
        removeToken: ((token) => {
            if (didLoad) return false;
            if (tokens.delete(token)) {
                clearTimeout(tokenExpireTimeout);
                tokenExpireTimeout = setTimeout(() => {
                    if (tokensCount() > 0) return;
                    doLoad();
                }, expireDelay);
                return true;
            }
            return false;
        }),
        isLoaded: (() => {
            return didLoad;
        }),
        forceLoad: doLoad,
        onLoad: ((cb) => {
            if (didLoad) return cb();
            loadCallbacks.push(cb);
        }),
        getExpireDelay: (() => {
            return expireDelay;
        }),
        setExpireDelay: ((d) => {
            expireDelay = Math.max(d, 1);
        })
    };

    window.addEventListener("DOMContentLoaded", () => {
        loader.removeToken("dom-content");
    });
    window["loader"] = loader;

    // VISUAL EFFECTS



})();