import { ErrTuple } from "libskynet";
import type { RPCRequest } from "@lumeweb/relay-types";
import {
  RpcQueryOptions,
  StreamHandlerFunction,
  StreamingRpcQueryOptions,
} from "@lumeweb/dht-rpc-client";
import { Buffer } from "buffer";

const RPC_MODULE = "AQDaEPIo_lpdvz7AKbeafERBHR331RiyvweJ6OrFTplzyg";

let callModule: any, connectModule: any;

async function loadLibs() {
  if (callModule && connectModule) {
    return;
  }

  if (typeof window !== "undefined" && window?.document) {
    const pkg = await import("libkernel");
    callModule = pkg.callModule;
    connectModule = pkg.connectModule;
  } else {
    const pkg = await import("libkmodule");
    callModule = pkg.callModule;
    connectModule = pkg.connectModule;
  }
}

export class RpcNetwork {
  private _actionQueue: [string, any][] = [];
  private _addQueue: string[] = [];
  private _removeQueue: string[] = [];

  get ready(): Promise<ErrTuple> {
    return loadLibs().then(() => callModule(RPC_MODULE, "ready"));
  }

  public addRelay(pubkey: string): void {
    this._addQueue.push(pubkey);
    this._addQueue = [...new Set(this._addQueue)];
    RpcNetwork.deleteItem(this._removeQueue, pubkey);
  }

  public removeRelay(pubkey: string): void {
    this._removeQueue.push(pubkey);
    this._removeQueue = [...new Set(this._removeQueue)];
    RpcNetwork.deleteItem(this._addQueue, pubkey);
  }

  public clearRelays(): void {
    this._actionQueue.push(["clearRelays", {}]);
  }

  private static deleteItem(array: Array<any>, item: string): void {
    if (array.includes(item)) {
      let queue = new Set(array);
      queue.delete(item);
      [].splice.apply(array, [0, array.length].concat([...queue]) as any);
    }
  }

  public wisdomQuery(
    method: string,
    module: string,
    data: object | any[] = {},
    bypassCache: boolean = false,
    options: RpcQueryOptions = {}
  ): WisdomRpcQuery {
    return new WisdomRpcQuery(
      this,
      {
        method,
        module,
        data,
        bypassCache,
      },
      options
    ).run();
  }

  public streamingQuery(
    relay: Buffer | string,
    method: string,
    module: string,
    streamHandler: StreamHandlerFunction,
    data: object | any[] = {},
    options: RpcQueryOptions = {}
  ): StreamingRpcQuery {
    return new StreamingRpcQuery(
      this,
      relay,
      { method, module, data },
      { streamHandler, ...options }
    ).run();
  }

  public simpleQuery(
    relay: Buffer | string,
    method: string,
    module: string,
    data: object | any[] = {},
    options: RpcQueryOptions = {}
  ): SimpleRpcQuery {
    return new SimpleRpcQuery(
      this,
      relay,
      {
        method,
        module,
        data,
      },
      options
    ).run();
  }

  public async processQueue(): Promise<void> {
    await loadLibs();
    for (const action of this._actionQueue) {
      try {
        await callModule(RPC_MODULE, action[0], action[1]);
      } catch (e: any) {}
    }

    await Promise.allSettled(
      this._removeQueue.map((item: string) =>
        callModule(RPC_MODULE, "removeRelay", { pubkey: item })
      )
    );
    await Promise.allSettled(
      this._addQueue.map((item: string) =>
        callModule(RPC_MODULE, "addRelay", { pubkey: item })
      )
    );

    this._actionQueue = [];
    this._removeQueue = [];
    this._addQueue = [];
  }
}

export abstract class RpcQueryBase {
  protected _promise?: Promise<any>;
  protected _network: RpcNetwork;
  protected _query: RPCRequest;
  protected _options: RpcQueryOptions;
  protected _queryType: string;

  constructor(
    network: RpcNetwork,
    query: RPCRequest,
    options: RpcQueryOptions = {},
    queryType: string
  ) {
    this._network = network;
    this._query = query;
    this._options = options;
    this._queryType = queryType;
  }

  public run(): this {
    this._promise = this._network.processQueue().then(() =>
      callModule(RPC_MODULE, this._queryType, {
        query: this._query,
        options: this._options,
      })
    );

    return this;
  }

  get result(): Promise<any> {
    return (this._promise as Promise<any>).then((result) => {
      if (result[1]) {
        throw new Error(result[1]);
      }
      return result[0];
    });
  }
}

export class SimpleRpcQuery extends RpcQueryBase {
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: RpcQueryOptions
  ) {
    super(network, query, options, "simpleQuery");
  }
}

export class StreamingRpcQuery extends RpcQueryBase {
  protected _options: StreamingRpcQueryOptions;

  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: StreamingRpcQueryOptions
  ) {
    super(network, query, options, "streamingQuery");
    this._options = options;
  }

  public run(): this {
    this._promise = this._network.processQueue().then(() =>
      connectModule(
        RPC_MODULE,
        this._queryType,
        {
          query: this._query,
          options: this._options,
        },
        this._options.streamHandler
      )
    );

    return this;
  }
}

export class WisdomRpcQuery extends RpcQueryBase {
  constructor(
    network: RpcNetwork,
    query: RPCRequest,
    options: RpcQueryOptions = {}
  ) {
    super(network, query, options, "wisdomQuery");
  }
}
