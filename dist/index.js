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
            [].splice.apply(array, [0, array.length].concat([...queue]));
        }
    }
    wisdomQuery(method, module, data = {}, bypassCache = false, options = {}) {
        return new WisdomRpcQuery(this, {
            method,
            module,
            data,
            bypassCache,
        }, options).run();
    }
    streamingQuery(relay, method, module, streamHandler, data = {}, options = {}) {
        return new StreamingRpcQuery(this, relay, { method, module, data }, { streamHandler, ...options }).run();
    }
    simpleQuery(relay, method, module, data = {}, options = {}) {
        return new SimpleRpcQuery(this, relay, {
            method,
            module,
            data,
        }, options).run();
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
export class RpcQueryBase {
    _promise;
    _network;
    _query;
    _options;
    _queryType;
    constructor(network, query, options = {}, queryType) {
        this._network = network;
        this._query = query;
        this._options = options;
        this._queryType = queryType;
    }
    run() {
        this._promise = this._network.processQueue().then(() => callModule(RPC_MODULE, this._queryType, {
            query: this._query,
            options: this._options,
        }));
        return this;
    }
    get result() {
        return this._promise.then((result) => {
            if (result[1]) {
                return { error: result[1] };
            }
            return result[0];
        });
    }
}
export class SimpleRpcQuery extends RpcQueryBase {
    constructor(network, relay, query, options) {
        super(network, query, options, "simpleQuery");
    }
}
export class StreamingRpcQuery extends RpcQueryBase {
    _options;
    constructor(network, relay, query, options) {
        super(network, query, options, "streamingQuery");
        this._options = options;
    }
    run() {
        this._promise = this._network.processQueue().then(() => connectModule(RPC_MODULE, this._queryType, {
            query: this._query,
            options: this._options,
        }, this._options.streamHandler));
        return this;
    }
}
export class WisdomRpcQuery extends RpcQueryBase {
    constructor(network, query, options = {}) {
        super(network, query, options, "wisdomQuery");
    }
}
