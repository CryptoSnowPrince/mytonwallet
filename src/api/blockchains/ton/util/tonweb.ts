import TonWeb from 'tonweb';

import BN from 'bn.js';
import { OperationCode } from '../constants';
import { MyTonWeb, TokenTransferBodyParams } from '../types';
import { ApiNetwork } from '../../../types';

const { Cell } = TonWeb.boc;
const { Address } = TonWeb.utils;

const TONHTTPAPI_MAINNET_URL = process.env.TONHTTPAPI_MAINNET_URL || 'https://toncenter.com/api/v2/jsonRPC';
const TONHTTPAPI_TESTNET_URL = process.env.TONHTTPAPI_TESTNET_URL || 'https://testnet.toncenter.com/api/v2/jsonRPC';

const tonwebByNetwork = {
  mainnet: new TonWeb(new TonWeb.HttpProvider(TONHTTPAPI_MAINNET_URL)) as MyTonWeb,
  testnet: new TonWeb(new TonWeb.HttpProvider(TONHTTPAPI_TESTNET_URL)) as MyTonWeb,
};

export function getTonWeb(network: ApiNetwork = 'mainnet') {
  return tonwebByNetwork[network];
}

export function oneCellFromBoc(boc: Uint8Array) {
  return TonWeb.boc.Cell.oneFromBoc(boc);
}

export function toBase64Address(address: string) {
  return new TonWeb.utils.Address(address).toString(true, true, true);
}

export function buildTokenTransferBody(params: TokenTransferBodyParams) {
  console.log("TG_LOG buildTokenTransferBody", params)
  const cell = new Cell();
  cell.bits.writeUint(OperationCode.requestTransfer, 32);
  cell.bits.writeUint(params.queryId || 0, 64);
  cell.bits.writeCoins(new BN(params.tokenAmount));
  cell.bits.writeAddress(new Address(params.toAddress));
  cell.bits.writeAddress(new Address(params.responseAddress));
  cell.bits.writeBit(false); // null custom_payload
  cell.bits.writeCoins(new BN(params.forwardAmount || '0'));

  if (!params.forwardPayload || params.forwardPayload.bits.length <= cell.bits.getFreeBits()) {
    cell.bits.writeBit(false);
    if (params.forwardPayload) {
      cell.bits.writeBytes(params.forwardPayload.bits.array);
    }
  } else {
    cell.bits.writeBit(true);
    cell.refs.push(params.forwardPayload);
  }

  console.log("TG_LOG buildTokenTransferBody cell", cell)
  return cell;
}

export function bnToAddress(value: BN) {
  return new Address(`0:${value.toString('hex', 64)}`).toString(true, true, true);
}
