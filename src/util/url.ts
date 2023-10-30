
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