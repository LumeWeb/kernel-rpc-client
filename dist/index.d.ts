import { ErrTuple } from "libskynet";
import type { RPCRequest } from "@lumeweb/dht-rpc-client";
export declare class RpcNetwork {
    private _actionQueue;
    private _addQueue;
    private _removeQueue;
    get ready(): Promise<ErrTuple>;
    addRelay(pubkey: string): void;
    removeRelay(pubkey: string): void;
    clearRelays(): void;
    private static deleteItem;
    query(query: string, chain: string, data?: object | any[], force?: boolean): RpcQuery;
    processQueue(): Promise<void>;
}
export declare class RpcQuery {
    private _promise;
    constructor(network: RpcNetwork, query: RPCRequest);
    get result(): Promise<any>;
}
//# sourceMappingURL=index.d.ts.map