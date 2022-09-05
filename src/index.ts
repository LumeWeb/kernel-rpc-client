import { ErrTuple } from "libskynet";
import type { RPCRequest, RPCResponse } from "@lumeweb/relay-types";
import {
  RpcQueryOptions,
  StreamHandlerFunction,
  StreamingRpcQueryOptions,
} from "@lumeweb/dht-rpc-client";
import { Buffer } from "buffer";
import { DataFn } from "libskynet/dist";

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
  private _def: boolean;

  constructor(def: boolean = true) {
    this._def = def;
  }

  private _networkId: number = 0;

  get networkId(): number {
    return this._networkId;
  }

  get ready(): Promise<ErrTuple> {
    let promise = loadLibs();

    if (this._def) {
      this._networkId = 1;
    } else {
      promise = promise
        .then(() => callModule(RPC_MODULE, "createNetwork"))
        .then((ret: ErrTuple) => (this._networkId = ret[0]));
    }

    return promise.then(() =>
      callModule(RPC_MODULE, "ready", { network: this._networkId })
    );
  }

  private static deleteItem(array: Array<any>, item: string): void {
    if (array.includes(item)) {
      let queue = new Set(array);
      queue.delete(item);
      [].splice.apply(array, [0, array.length].concat([...queue]) as any);
    }
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
        await callModule(RPC_MODULE, action[0], {
          ...action[1],
          network: this._networkId,
        });
      } catch (e: any) {}
    }

    await Promise.allSettled(
      this._removeQueue.map((item: string) =>
        callModule(RPC_MODULE, "removeRelay", {
          pubkey: item,
          network: this._networkId,
        })
      )
    );
    await Promise.allSettled(
      this._addQueue.map((item: string) =>
        callModule(RPC_MODULE, "addRelay", {
          pubkey: item,
          network: this._networkId,
        })
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

  get result(): Promise<RPCResponse> {
    return (this._promise as Promise<any>).then((result): RPCResponse => {
      if (result[1]) {
        return { error: result[1] };
      }
      return result[0];
    });
  }

  public run(): this {
    this._promise = this._network.processQueue().then(() =>
      callModule(RPC_MODULE, this._queryType, {
        query: this._query,
        options: this._options,
        network: this._network.networkId,
      })
    );

    return this;
  }
}

export class SimpleRpcQuery extends RpcQueryBase {
  protected _relay: string | Buffer;
  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: RpcQueryOptions
  ) {
    super(network, query, options, "simpleQuery");
    this._relay = relay;
  }
  public run(): this {
    this._promise = this._network.processQueue().then(() =>
      callModule(RPC_MODULE, this._queryType, {
        relay: this._relay,
        query: this._query,
        options: this._options,
        network: this._network.networkId,
      })
    );

    return this;
  }
}

export class StreamingRpcQuery extends SimpleRpcQuery {
  protected _options: StreamingRpcQueryOptions;
  private _sendUpdate?: DataFn;

  constructor(
    network: RpcNetwork,
    relay: string | Buffer,
    query: RPCRequest,
    options: StreamingRpcQueryOptions
  ) {
    super(network, relay, query, options);
    this._options = options;
    this._queryType = "streamingQuery";
  }

  public cancel() {
    if (this._sendUpdate) {
      this._sendUpdate({ cancel: true });
    }
  }

  public run(): this {
    this._promise = this._network.processQueue().then(() => {
      const ret = connectModule(
        RPC_MODULE,
        this._queryType,
        {
          relay: this._relay,
          query: this._query,
          options: { ...this._options, streamHandler: true },
          network: this._network.networkId,
        },
        this._options.streamHandler
      );
      this._sendUpdate = ret[0];
      return ret[1];
    });

    return this;
  }

  get result(): Promise<RPCResponse> {
    return (this._promise as Promise<any>)
      .then((result): Promise<ErrTuple> => result)
      .then((response: ErrTuple) => {
        if (response[1]) {
          return { error: response[1] };
        }
        return response[0];
      });
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
