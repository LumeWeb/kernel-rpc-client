/// <reference types="node" />
import { ErrTuple } from "libskynet";
import type { RPCRequest } from "@lumeweb/relay-types";
import {
  RpcQueryOptions,
  StreamHandlerFunction,
  StreamingRpcQueryOptions,
} from "@lumeweb/dht-rpc-client";
import { Buffer } from "buffer";
export declare class RpcNetwork {
  private _actionQueue;
  private _addQueue;
  private _removeQueue;
  get ready(): Promise<ErrTuple>;
  addRelay(pubkey: string): void;
  removeRelay(pubkey: string): void;
  clearRelays(): void;
  private static deleteItem;
  wisdomQuery(
    method: string,
    module: string,
    data?: object | any[],
    bypassCache?: boolean,
    options?: RpcQueryOptions
  ): WisdomRpcQuery;
  streamingQuery(
    relay: Buffer | string,
    method: string,
    module: string,
    streamHandler: StreamHandlerFunction,
    data?: object | any[],
    options?: RpcQueryOptions
  ): StreamingRpcQuery;
  simpleQuery(
    relay: Buffer | string,
    method: string,
    module: string,
    data?: object | any[],
    options?: RpcQueryOptions
  ): SimpleRpcQuery;
  processQueue(): Promise<void>;
}
export declare abstract class RpcQueryBase {
  protected _promise?: Promise<any>;
  protected _network: RpcNetwork;
  protected _query: RPCRequest;
  protected _options: RpcQueryOptions;
  protected _queryType: string;
  constructor(
    network: RpcNetwork,
    query: RPCRequest,
    options: RpcQueryOptions | undefined,
    queryType: string
  );
  run(): this;
  get result(): Promise<any>;
}
export declare class SimpleRpcQuery extends RpcQueryBase {
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: RpcQueryOptions
  );
}
export declare class StreamingRpcQuery extends RpcQueryBase {
  protected _options: StreamingRpcQueryOptions;
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: StreamingRpcQueryOptions
  );
  run(): this;
}
export declare class WisdomRpcQuery extends RpcQueryBase {
  constructor(
    network: RpcNetwork,
    query: RPCRequest,
    options?: RpcQueryOptions
  );
}
//# sourceMappingURL=index.d.ts.map
