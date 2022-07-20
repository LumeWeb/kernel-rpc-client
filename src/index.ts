import {
  callModule as callModuleKernel,
  connectModule as connectModuleKernel,
} from "libkernel";
import {
  callModule as callModuleModule,
  connectModule as connectModuleModule,
} from "libkmodule";
import { ErrTuple } from "libskynet";
import type { RPCRequest } from "@lumeweb/dht-rpc-client";

const RPC_MODULE = "AQDaEPIo_lpdvz7AKbeafERBHR331RiyvweJ6OrFTplzyg";

let callModule: typeof callModuleModule,
  connectModule: typeof connectModuleModule;

if (typeof window !== "undefined" && window?.document) {
  callModule = callModuleKernel;
  connectModule = connectModuleKernel;
} else {
  callModule = callModuleModule;
  connectModule = connectModuleModule;
}

type PromiseCB = () => Promise<ErrTuple>;

export class RpcNetwork {
  private _actionQueue: PromiseCB[] = [];

  get ready(): Promise<ErrTuple> {
    return callModule(RPC_MODULE, "ready");
  }

  public addRelay(pubkey: string): void {
    this._actionQueue.push(() =>
      callModule(RPC_MODULE, "addRelay", { pubkey })
    );
  }

  public removeRelay(pubkey: string): void {
    this._actionQueue.push(() =>
      callModule(RPC_MODULE, "removeRelay", { pubkey })
    );
  }

  public clearRelays(): void {
    this._actionQueue.push(() => callModule(RPC_MODULE, "clearRelays"));
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
    for (const promise of this._actionQueue.reverse()) {
      try {
        const p = promise();
        await p;
      } catch (e: any) {}
    }

    this._actionQueue = [];
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
