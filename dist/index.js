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
    _def;
    constructor(def = true) {
        this._def = def;
    }
    _networkId = 0;
    get networkId() {
        return this._networkId;
    }
    get ready() {
        let promise = loadLibs();
        if (this._def) {
            this._networkId = 1;
        }
        else {
            promise = promise
                .then(() => callModule(RPC_MODULE, "createNetwork"))
                .then((ret) => (this._networkId = ret[0]));
        }
        return promise.then(() => callModule(RPC_MODULE, "ready", { network: this._networkId }));
    }
    static deleteItem(array, item) {
        if (array.includes(item)) {
            let queue = new Set(array);
            queue.delete(item);
            [].splice.apply(array, [0, array.length].concat([...queue]));
        }
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
                await callModule(RPC_MODULE, action[0], {
                    ...action[1],
                    network: this._networkId,
                });
            }
            catch (e) { }
        }
        await Promise.allSettled(this._removeQueue.map((item) => callModule(RPC_MODULE, "removeRelay", {
            pubkey: item,
            network: this._networkId,
        })));
        await Promise.allSettled(this._addQueue.map((item) => callModule(RPC_MODULE, "addRelay", {
            pubkey: item,
            network: this._networkId,
        })));
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
    get result() {
        return this._promise.then((result) => {
            if (result[1]) {
                return { error: result[1] };
            }
            return result[0];
        });
    }
    run() {
        this._promise = this._network.processQueue().then(() => callModule(RPC_MODULE, this._queryType, {
            query: this._query,
            options: this._options,
            network: this._network.networkId,
        }));
        return this;
    }
}
export class SimpleRpcQuery extends RpcQueryBase {
    _relay;
    constructor(network, relay, query, options) {
        super(network, query, options, "simpleQuery");
        this._relay = relay;
    }
    run() {
        this._promise = this._network.processQueue().then(() => callModule(RPC_MODULE, this._queryType, {
            relay: this._relay,
            query: this._query,
            options: this._options,
            network: this._network.networkId,
        }));
        return this;
    }
}
export class StreamingRpcQuery extends SimpleRpcQuery {
    _options;
    _sendUpdate;
    constructor(network, relay, query, options) {
        super(network, relay, query, options);
        this._options = options;
        this._queryType = "streamingQuery";
    }
    cancel() {
        if (this._sendUpdate) {
            this._sendUpdate({ cancel: true });
        }
    }
    run() {
        this._promise = this._network.processQueue().then(() => {
            const ret = connectModule(RPC_MODULE, this._queryType, {
                relay: this._relay,
                query: this._query,
                options: { ...this._options, streamHandler: true },
                network: this._network.networkId,
            }, this._options.streamHandler);
            this._sendUpdate = ret[0];
            return ret[1];
        });
        return this;
    }
    get result() {
        return this._promise
            .then((result) => result)
            .then((response) => {
            if (response[1]) {
                return { error: response[1] };
            }
            return response[0];
        });
    }
}
export class WisdomRpcQuery extends RpcQueryBase {
    constructor(network, query, options = {}) {
        super(network, query, options, "wisdomQuery");
    }
}
