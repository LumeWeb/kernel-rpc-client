import { ErrTuple } from "libskynet";
import type { RPCRequest } from "@lumeweb/dht-rpc-client";

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

type PromiseCB = () => Promise<ErrTuple>;

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
        [].splice.apply(array, [0, array.length].concat([...queue]));
    }
  }

  public query(
    query: string,
    chain: string,
    data: object | any[] = {},
    force: boolean = false
  ): RpcQuery {
    return new RpcQuery(this, {
      query,
      chain,
      data,
      force: force,
    });
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

export class RpcQuery {
  private _promise: Promise<any>;

  constructor(network: RpcNetwork, query: RPCRequest) {
    this._promise = network
      .processQueue()
      .then(() => callModule(RPC_MODULE, "query", query));
  }

  get result(): Promise<any> {
    return this._promise.then((result) => {
      if (result[1]) {
        throw new Error(result[1]);
      }
      return result[0];
    });
  }
}
