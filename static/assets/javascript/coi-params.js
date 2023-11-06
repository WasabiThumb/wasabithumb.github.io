(() => {

    const DO_NOT_RETRY = "coi-dnr";
    window.coi = {
        shouldRegister: () => {
            if (!window["sessionStorage"]) return false;
            let register = !window.sessionStorage.getItem(DO_NOT_RETRY);
            window.sessionStorage.removeItem(DO_NOT_RETRY);
            return register;
        },
        coepCredentialless: () => {
            if (window["chrome"] !== undefined || window["netscape"] !== undefined) return true;
            const test = /firefox(\/(\d+))?/i;
            try {
                const match = test.exec(window.navigator.userAgent);
                if (match && match[2]) {
                    const n = parseInt(match[2]);
                    if (!isNaN(n) && n >= 119) return true;
                }
            } catch (e) { }
            return false;
        },
        doReload: () => {
            window.sessionStorage.setItem(DO_NOT_RETRY, "true");
            window.location.reload()
        }
    };

})();
