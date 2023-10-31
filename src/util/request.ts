import nacl from "tweetnacl";
import * as utf8 from "@stablelib/utf8";


type XHRAgent = {
    readyState: number,
    status: number,
    response: any,
    responseText: string,
    responseType: XMLHttpRequest["responseType"],
    onreadystatechange: (this: XHRAgent, event: Event) => any | null,
    open: (method: "GET" | "POST", url: string | URL, async?: boolean) => void,
    send: (body?: any) => void
};

const createXHRAgent: (() => XHRAgent) = (() => {
    if (!!window["XMLHttpRequest"]) {
        return (() => {
            return new XMLHttpRequest() as unknown as XHRAgent;
        });
    } else {
        return (() => {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP") as unknown as XHRAgent;
            } catch (ignored) {
                return new ActiveXObject("Microsoft.XMLHTTP") as unknown as XHRAgent;
            }
        });
    }
})();
const hasFetch: boolean = !!window.fetch;


type RequestDataType = "json" | "bytes" | "text" | undefined;
type RequestData<T extends RequestDataType> = T extends "json" ? any :
    (T extends "bytes" ? Uint8Array : string);

interface RequestFunction {
    <T extends RequestDataType>(method: "GET" | "POST", url: string | URL, data?: any, type?: T): Promise<RequestData<T>>;
}

type Request = RequestFunction & {
    get<T extends RequestDataType>(url: string | URL, data?: any, type?: T): Promise<RequestData<T>>;
    getPrivate<T extends RequestDataType>(url: string | URL, key: Uint8Array, data?: any, type?: T): Promise<RequestData<T>>;
    post<T extends RequestDataType>(url: string | URL, data?: any, type?: T): Promise<RequestData<T>>;
};


const requestFunction: RequestFunction = (<T extends RequestDataType>(method: "GET" | "POST", url: string | URL, data?: any, type?: T) => {
    if (hasFetch) {
        return fetch(url, { method: method, body: data }).then((res) => {
            if (res.status < 200 || res.status > 299) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            switch (type) {
                case "json":
                    return res.json();
                case "bytes":
                    return res.arrayBuffer().then((ab) => new Uint8Array(ab));
                default:
                    return res.text();
            }
        });
    } else {
        return new Promise<RequestData<T>>((res, rej) => {
            const xhr: XHRAgent = createXHRAgent();

            switch (type) {
                case "bytes":
                    xhr.responseType = "arraybuffer";
                    break;
                default:
                    xhr.responseType = "text";
                    break;
            }
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                if (xhr.status < 200 || xhr.status > 299) {
                    console.warn(xhr);
                    rej("HTTP " + xhr.status);
                    return;
                }
                switch (type) {
                    case "json":
                        res(JSON.parse(xhr.responseText) as RequestData<T>);
                        break;
                    case "bytes":
                        res(new Uint8Array(xhr.response as unknown as ArrayBufferLike) as RequestData<T>);
                        break;
                    default:
                        res(xhr.responseText as RequestData<T>);
                        break;
                }
            }
            xhr.open(method, url);
            xhr.send(data);
        });
    }
});

const proto: Partial<Request> & RequestFunction = requestFunction;
proto.get = ((url, data, type) => {
    return requestFunction("GET", url, data, type);
});
proto.getPrivate = (async (url, key, data, type) => {
    const dat: Uint8Array = await requestFunction("GET", `${url}.private`, data, "bytes");
    const decrypted: Uint8Array | null = nacl.secretbox.open(dat.subarray(nacl.secretbox.nonceLength, dat.length), dat.subarray(0, nacl.secretbox.nonceLength), key);
    if (decrypted === null) throw new Error(`Failed to decrypt ${url}.private`);

    switch (type) {
        case "bytes":
            return decrypted;
        case "json":
            return JSON.parse(utf8.decode(decrypted));
        default:
            return utf8.decode(decrypted);
    }
});
proto.post = ((url, data, type) => {
    return requestFunction("POST", url, data, type);
});
export const request: Request = proto as unknown as Request;
