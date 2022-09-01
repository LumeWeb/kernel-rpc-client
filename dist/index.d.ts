/// <reference types="node" />
import { ErrTuple } from "libskynet";
import type { RPCRequest, RPCResponse } from "@lumeweb/relay-types";
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
  private _def;
  constructor(def?: boolean);
  private _networkId;
  get networkId(): number;
  get ready(): Promise<ErrTuple>;
  private static deleteItem;
  addRelay(pubkey: string): void;
  removeRelay(pubkey: string): void;
  clearRelays(): void;
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
  get result(): Promise<RPCResponse>;
  run(): this;
}
export declare class SimpleRpcQuery extends RpcQueryBase {
  protected _relay: string | Buffer;
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: RpcQueryOptions
  );
  run(): this;
}
export declare class StreamingRpcQuery extends SimpleRpcQuery {
  protected _options: StreamingRpcQueryOptions;
  private _sendUpdate?;
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: StreamingRpcQueryOptions
  );
  cancel(): void;
  run(): this;
  get result(): Promise<RPCResponse>;
}
export declare class WisdomRpcQuery extends RpcQueryBase {
  constructor(
    network: RpcNetwork,
    query: RPCRequest,
    options?: RpcQueryOptions
  );
}
//# sourceMappingURL=index.d.ts.map
