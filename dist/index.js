import { Client, factory } from "@lumeweb/libkernel-universal";
const RPC_MODULE = "fABwqlUwrGUj4q1UI5mIkJRBzc0lFkL5V92NqdFf9WZUHw";
export class RpcNetwork extends Client {
    _def;
    constructor(def = true) {
        super();
        this._def = def;
    }
    _networkId = 0;
    get networkId() {
        return this._networkId;
    }
    get ready() {
        if (this._def) {
            this._networkId = 1;
        }
        else {
            Promise.resolve()
                .then(() => this.callModuleReturn(RPC_MODULE, "createNetwork"))
                .then((ret) => (this._networkId = ret[0]));
        }
        return this.callModuleReturn("ready", {
            network: this._networkId,
        });
    }
    simpleQuery({ relay, query, options = {}, }) {
        return createSimpleRpcQuery({
            network: this,
            relay,
            query,
            options,
        }).run();
    }
}
export class RpcQueryBase extends Client {
    _promise;
    _network;
    _query;
    _options;
    _queryType;
    constructor(network, query, options = {}, queryType) {
        super();
        this._network = network;
        this._query = query;
        this._options = options;
        this._queryType = queryType;
    }
    get result() {
        return this._promise
            .then((result) => {
            return result[0];
        })
            .catch((error) => {
            return { error: error.message };
        });
    }
    run() {
        this._promise = this.callModule(this._queryType, {
            query: this._query,
            options: this._options,
            network: this._network.networkId,
        });
        return this;
    }
}
export class SimpleRpcQuery extends RpcQueryBase {
    _relay;
    constructor({ network, relay, query, options, }) {
        super(network, query, options, "simpleQuery");
        this._relay = relay;
    }
    run() {
        this._promise = this.callModule(this._queryType, {
            relay: this._relay,
            query: this._query,
            options: this._options,
            network: this._network.networkId,
        });
        return this;
    }
}
export const createClient = factory(RpcNetwork, RPC_MODULE);
const createSimpleRpcQuery = factory(SimpleRpcQuery, RPC_MODULE);
