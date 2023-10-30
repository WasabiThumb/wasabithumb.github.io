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
    const initTokens = ["dom-content", "bundle-load"];
    if (typeof Set === "function") {
        tokens = new Set();
        for (let tk of initTokens) tokens.add(tk);
        tokensCount = (() => { return tokens.size; });
    } else {
        const arr = [...initTokens];
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

    let expireDelay = 200;
    let tokenExpireTimeout = -1;
    let loadCallbacks = [];
    let tokenRemoveCallbacks = {};
    let didLoad = false;
    let forceCallback = (() => {});

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
                const cbs = tokenRemoveCallbacks[token];
                if (!!cbs) {
                    for (let cb of cbs) {
                        try {
                            cb();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    delete tokenRemoveCallbacks[token];
                }

                clearTimeout(tokenExpireTimeout);
                tokenExpireTimeout = setTimeout(() => {
                    if (tokensCount() > 0) return;
                    doLoad();
                }, expireDelay);
                return true;
            }
            return false;
        }),
        hasToken: ((token) => {
            if (didLoad) return false;
            return tokens.has(token);
        }),
        isLoaded: (() => {
            return didLoad;
        }),
        forceLoad: (() => {
            doLoad();
            forceCallback();
        }),
        onLoad: ((cb) => {
            if (didLoad) return cb();
            loadCallbacks.push(cb);
        }),
        onRemoveToken: ((token, cb) => {
            if (didLoad || (!tokens.has(token))) {
                try {
                    cb();
                } catch (e) {
                    console.error(e);
                }
            } else {
                let cbs = tokenRemoveCallbacks[token];
                if (!cbs) cbs = [];
                cbs.push(cb);
                tokenRemoveCallbacks[token] = cbs;
            }
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
    let letterContainer;
    const dummyLetters = [];
    const animLetters = [];
    let firstFrame = true;
    let animationProgress = 0;
    let lastRound = false;
    let clockwise = false;

    const arrayRotate = ((arr, count) => {
        const len = arr.length
        arr.push(...arr.splice(0, (-count % len + len) % len))
        return arr
    });

    const arrayShuffle = ((arr) => {
        for (let i=(arr.length - 1); i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    });

    const shuffleLetterTargets = ((shuffleFrom) => {
        const size = dummyLetters.length;
        const tos = [];
        for (let i=0; i < size; i++) {
            tos.push(i);
        }
        arrayShuffle(tos);
        const froms = arrayRotate([...tos], Math.floor(Math.random() * (size - 1)) + 1);

        for (let i=0; i < Math.min(animLetters.length, size); i++) {
            const anim = animLetters[i];

            let fromIndex;
            if (!!shuffleFrom) {
                fromIndex = froms[i];
                anim.setAttribute("data-from", `${fromIndex}`);
            } else {
                const str = anim.getAttribute("data-from");
                try {
                    fromIndex = parseInt(str);
                } catch (_) {
                    fromIndex = froms[i];
                }
            }

            const toIndex = tos[i];
            anim.setAttribute("data-to", `${toIndex}`);
        }
    });

    const animateLetters = ((delta) => {
        if (firstFrame) {
            for (let i=0; i < dummyLetters.length; i++) {
                const dummyLetter = dummyLetters[i];
                const newLetter = document.createElement("p");
                newLetter.classList.add("anim");
                dummyLetter.classList.add("dummy");
                newLetter.innerText = dummyLetter.innerText;
                letterContainer.appendChild(newLetter);
                animLetters.push(newLetter);
            }
            shuffleLetterTargets(true);
            firstFrame = false;
        }

        let effProg = Math.min(animationProgress / 0.85, 1);
        effProg = (Math.pow(effProg, 2) * 3) - (Math.pow(effProg, 3) * 2);
        let invProg = 1 - effProg;
        let zoom = lastRound ? (() => {
            let pc = Math.min(Math.max((animationProgress - 0.6) / 0.4, 0), 1);
            let t = 6.75 * pc * pc;
            return t - (t * pc);
        })(): 0;
        for (let i=0; i < animLetters.length; i++) {
            const letter = animLetters[i];

            const aIndex = parseInt(letter.getAttribute("data-from"));
            const a = dummyLetters[aIndex];
            const aRect = a.getBoundingClientRect();
            const bIndex = parseInt(letter.getAttribute("data-to"));
            const b = dummyLetters[bIndex];
            const bRect = b.getBoundingClientRect();

            const al = aRect.left;
            const bl = bRect.left;
            let hl = (bl - al) / 2;
            const ml = al + hl;
            hl = Math.abs(hl);

            let fromAng;
            let toAng;
            if (al < bl) {
                fromAng = Math.PI * (clockwise ? -1 : 1);
                toAng = 0;
            } else {
                fromAng = 0;
                toAng = Math.PI * (clockwise ? 1 : -1);
            }
            let progAng = toAng * effProg + fromAng * invProg;

            const nl = ml + (hl * Math.cos(progAng));
            const nt = aRect.top + (hl * Math.sin(progAng))

            letter.style.left = `${nl}px`;
            letter.style.top = `${nt}px`;
            letter.style.opacity = `${Math.abs(effProg - 0.5) + 0.5}`;
            if (lastRound) {
                letter.style.transform = `scale(${1 + (zoom * 0.2)})`;
            }
        }

        animationProgress += (delta / 750);
        if (animationProgress > 1) {
            clockwise = !clockwise;
            if (lastRound) {
                letterContainer.classList.add("done");
                for (let i=0; i < animLetters.length; i++) {
                    dummyLetters[i].classList.remove("dummy");
                    letterContainer.removeChild(animLetters[i]);
                }
                setTimeout(() => {
                    document.body.removeChild(letterContainer);
                }, 5000);
                return;
            }
            lastRound = loader.isLoaded();
            for (let i=0; i < animLetters.length; i++) {
                const letter = animLetters[i];
                letter.setAttribute("data-from", letter.getAttribute("data-to"));
                if (lastRound) letter.setAttribute("data-to", i.toString());
            }
            if (!lastRound) shuffleLetterTargets(false);
            animationProgress = 0;
        }

        animationFramePolyfill(animateLetters);
    });

    const hasPerformance = !!window["performance"];
    const timestamp = (() => {
        if (hasPerformance) {
            return window.performance.now();
        } else {
            return Date.now();
        }
    })

    const hasRequestAnimationFrame = !!window["requestAnimationFrame"];
    const animationFramePolyfill = ((cb) => {
        const start = timestamp();
        if (hasRequestAnimationFrame) {
            window.requestAnimationFrame(() => {
                cb(timestamp() - start);
            });
        } else {
            setTimeout(() => {
                cb(timestamp() - start);
            }, 20);
        }
    });

    window.addEventListener("DOMContentLoaded", () => {
        const el = document.querySelector('[data-role="loader"]');
        if (!el) return;
        letterContainer = el;

        forceCallback = (() => {
            letterContainer.style.display = "none";
            letterContainer.style.pointerEvents = "none";
        });

        const letterElements = el.querySelectorAll("p");
        for (let i=0; i < letterElements.length; i++) {
            dummyLetters.push(letterElements.item(i));
        }

        animationFramePolyfill(animateLetters);
    });

})();