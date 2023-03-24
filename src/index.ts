import { ErrTuple } from "libskynet";
import type {
  RPCRequest,
  RPCResponse,
  ClientRPCRequest,
} from "@lumeweb/interface-relay";
import { RpcQueryOptions } from "@lumeweb/rpc-client";
import { Buffer } from "buffer";
import { Client, factory } from "@lumeweb/libkernel-universal";

const RPC_MODULE = "fAAgZfXMqN3YOn0-b9DICt8OPsOFeWw3YKY2p84aytzBww";

export class RpcNetwork extends Client {
  private _def: boolean;

  constructor(def: boolean = true) {
    super();
    this._def = def;
  }

  private _networkId: number = 0;

  get networkId(): number {
    return this._networkId;
  }

  get ready(): Promise<ErrTuple> {
    if (this._def) {
      this._networkId = 1;
    } else {
      Promise.resolve()
        .then(() => this.callModuleReturn(RPC_MODULE, "createNetwork"))
        .then((ret: ErrTuple) => (this._networkId = ret[0]));
    }

    return this.callModuleReturn("ready", {
      network: this._networkId,
    });
  }
  public simpleQuery({
    relay,
    query,
    options = {},
  }: {
    relay?: Buffer | string;
    query: ClientRPCRequest;
    options?: RpcQueryOptions;
  }): SimpleRpcQuery {
    return createSimpleRpcQuery({
      network: this,
      relay,
      query,
      options,
    }).run();
  }
}

export abstract class RpcQueryBase extends Client {
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
    super();
    this._network = network;
    this._query = query;
    this._options = options;
    this._queryType = queryType;
  }

  get result(): Promise<RPCResponse> {
    return (this._promise as Promise<any>)
      .then((result: ErrTuple): RPCResponse => {
        return result[0];
      })
      .catch((error: Error) => {
        return { error: error.message };
      });
  }

  public run(): this {
    this._promise = this.callModule(this._queryType, {
      query: this._query,
      options: this._options,
      network: this._network.networkId,
    });

    return this;
  }
}

export class SimpleRpcQuery extends RpcQueryBase {
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
  }) {
    super(network, query, options, "simpleQuery");
    this._relay = relay;
  }
  public run(): this {
    this._promise = this.callModule(this._queryType, {
      relay: this._relay,
      query: this._query,
      options: this._options,
      network: this._network.networkId,
    });

    return this;
  }
}

export const createClient = factory<RpcNetwork>(RpcNetwork, RPC_MODULE);
const createSimpleRpcQuery = factory<SimpleRpcQuery>(
  SimpleRpcQuery,
  RPC_MODULE
);
