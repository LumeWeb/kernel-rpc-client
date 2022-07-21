const RPC_MODULE = "AQDaEPIo_lpdvz7AKbeafERBHR331RiyvweJ6OrFTplzyg";
let callModule, connectModule;
async function loadLibs() {
    if (callModule && connectModule) {
        return;
    }
    if (typeof window !== "undefined" && window?.document) {
        const pkg = await import("libkernel");
        callModule = pkg.callModule;
        connectModule = pkg.connectModule;
    }
    else {
        const pkg = await import("libkmodule");
        callModule = pkg.callModule;
        connectModule = pkg.connectModule;
    }
}
export class RpcNetwork {
    _actionQueue = [];
    _addQueue = [];
    _removeQueue = [];
    get ready() {
        return loadLibs().then(() => callModule(RPC_MODULE, "ready"));
    }
    addRelay(pubkey) {
        this._addQueue.push(pubkey);
        this._addQueue = [...new Set(this._addQueue)];
        RpcNetwork.deleteItem(this._removeQueue, pubkey);
    }
    removeRelay(pubkey) {
        this._removeQueue.push(pubkey);
        this._removeQueue = [...new Set(this._removeQueue)];
        RpcNetwork.deleteItem(this._addQueue, pubkey);
    }
    clearRelays() {
        this._actionQueue.push(["clearRelays", {}]);
    }
    static deleteItem(array, item) {
        if (array.includes(item)) {
            let queue = new Set(array);
            queue.delete(item);
            array = [...queue];
        }
    }
    query(query, chain, data = {}, force = false) {
        return new RpcQuery(this, {
            query,
            chain,
            data,
            force: force,
        });
    }
    async processQueue() {
        await loadLibs();
        for (const action of this._actionQueue) {
            try {
                await callModule(RPC_MODULE, action[0], action[1]);
            }
            catch (e) { }
        }
        await Promise.allSettled(this._removeQueue.map((item) => callModule(RPC_MODULE, "removeRelay", { pubkey: item })));
        await Promise.allSettled(this._addQueue.map((item) => callModule(RPC_MODULE, "addRelay", { pubkey: item })));
        this._actionQueue = [];
        this._removeQueue = [];
        this._addQueue = [];
    }
}
export class RpcQuery {
    _promise;
    constructor(network, query) {
        this._promise = network
            .processQueue()
            .then(() => callModule(RPC_MODULE, "query", query));
    }
    get result() {
        return this._promise.then((result) => {
            if (result[1]) {
                throw new Error(result[1]);
            }
            return result[0];
        });
    }
}
