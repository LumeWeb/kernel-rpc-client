/// <reference types="node" />
import { ErrTuple } from "libskynet";
import type {
  RPCRequest,
  RPCResponse,
  ClientRPCRequest,
} from "@lumeweb/interface-relay";
import { RpcQueryOptions } from "@lumeweb/rpc-client";
import { Buffer } from "buffer";
import { Client } from "@lumeweb/libkernel-universal";
export declare class RpcNetwork extends Client {
  private _def;
  constructor(def?: boolean);
  private _networkId;
  get networkId(): number;
  get ready(): Promise<ErrTuple>;
  simpleQuery({
    relay,
    query,
    options,
  }: {
    relay?: Buffer | string;
    query: ClientRPCRequest;
    options?: RpcQueryOptions;
  }): SimpleRpcQuery;
}
export declare abstract class RpcQueryBase extends Client {
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
  protected _relay?: string | Buffer;
  constructor({
    network,
    relay,
    query,
    options,
  }: {
    network: RpcNetwork;
    relay?: string | Buffer;
    query: RPCRequest;
    options?: RpcQueryOptions;
  });
  run(): this;
}
export declare const createClient: (...args: any) => RpcNetwork;
//# sourceMappingURL=index.d.ts.map
