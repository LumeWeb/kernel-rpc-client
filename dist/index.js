import { callModule as callModuleKernel, connectModule as connectModuleKernel, } from "libkernel";
import { callModule as callModuleModule, connectModule as connectModuleModule, } from "libkmodule";
const RPC_MODULE = "AQDaEPIo_lpdvz7AKbeafERBHR331RiyvweJ6OrFTplzyg";
let callModule, connectModule;
if (typeof window !== "undefined" && window?.document) {
    callModule = callModuleKernel;
    connectModule = connectModuleKernel;
}
else {
    callModule = callModuleModule;
    connectModule = connectModuleModule;
}
export class RpcNetwork {
    _actionQueue = [];
    get ready() {
        return callModule(RPC_MODULE, "ready");
    }
    addRelay(pubkey) {
        this._actionQueue.push(() => callModule(RPC_MODULE, "addRelay", { pubkey }));
    }
    removeRelay(pubkey) {
        this._actionQueue.push(() => callModule(RPC_MODULE, "removeRelay", { pubkey }));
    }
    clearRelays() {
        this._actionQueue.push(() => callModule(RPC_MODULE, "clearRelays"));
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
        for (const promise of this._actionQueue.reverse()) {
            try {
                const p = promise();
                await p;
            }
            catch (e) { }
        }
        this._actionQueue = [];
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
