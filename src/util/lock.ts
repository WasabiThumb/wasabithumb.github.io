
export class AsyncLock {

    private _promise: Promise<void> = Promise.resolve();
    private _resolve: () => void = (() => {});

    async lock(): Promise<void> {
        await this._promise;
        const me = this;
        this._promise = new Promise<void>((res) => {
            me._resolve = (() => { res(); });
        });
    }

    unlock(): void {
        this._resolve();
    }

}
