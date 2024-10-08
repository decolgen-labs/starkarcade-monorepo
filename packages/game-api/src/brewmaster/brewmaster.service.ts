import { ChainDocument, Chains } from '@app/shared/models/schemas';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { getRandomInt } from './game/math';
import { getClaimPointMessage } from '@app/shared/utils';
import { Web3Service } from '@app/web3/web3.service';
import { Account, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';
import configuration from '@app/shared/configuration';
import * as dotenv from 'dotenv';

export type StarkSweepParam = {
  socket: Socket;
  collectedCoin: number;
  numberOfSpawnedCustomer: number;
  numberOfCustomerToCoin: number;
  numberOfCoinCanClaim: number;
  savedData: string;
  totalPoint: number;
};

@Injectable()
export class BrewMasterService {
  constructor(
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
    private readonly web3Service: Web3Service,
  ) {}
  private sockets: StarkSweepParam[] = [];

  private async sign_transaction(client: StarkSweepParam, address: string) {
    const chainDocument = await this.chainModel.findOne();
    const time = Math.round(new Date().getTime() / 1e3);
    let typedDataValidate = getClaimPointMessage(
      address,
      client.collectedCoin,
      time,
      chainDocument.name,
    );
    const provider = this.web3Service.getProvider(chainDocument.rpc);
    const signerAccount = new Account(
      provider,
      configuration().signer_wallet.address,
      configuration().signer_wallet.private_key,
    );
    const signature2 = await signerAccount.signMessage(typedDataValidate);
    const proof = stark.formatSignature(signature2);

    return {
      address,
      point: client.collectedCoin,
      timestamp: time,
      proof: proof,
    };
  }

  handleConnection(socket: Socket) {
    this.sockets.push({
      socket,
      collectedCoin: 0,
      numberOfCoinCanClaim: 0,
      numberOfSpawnedCustomer: 0,
      numberOfCustomerToCoin: 0,
      savedData: '',
      totalPoint: 0,
    });

    setTimeout(() => {
      socket.emit('connection', {
        date: new Date().getTime(),
        data: 'Hello Unity',
      });
    }, 1000);

    dotenv.config();
  }

  disconnectGame(socket: Socket) {
    this.sockets = this.sockets.filter((sk) => sk.socket !== socket);
  }

  handleSpawnCustomer(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    client.numberOfSpawnedCustomer++;
    if (client.numberOfSpawnedCustomer >= client.numberOfCustomerToCoin) {
      client.socket.emit('spawnCoin');
      console.log('spawnCoin');
      client.numberOfCoinCanClaim++;
      client.numberOfSpawnedCustomer = 0;
      client.numberOfCustomerToCoin = getRandomInt(10, 20);
    }
  }

  handleCoinCollect(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    console.log('Current collect coin: ' + client.collectedCoin);
    if (client.collectedCoin < client.numberOfCoinCanClaim) {
      client.collectedCoin++;
      console.log('Collected coin: ' + client.collectedCoin);
      client.socket.emit('updateCoin', client.collectedCoin.toString());
    }
  }

  async handleClaim(socket: Socket, address: string) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    const proof = await this.sign_transaction(client, address);
    client.socket.emit('updateProof', JSON.stringify(proof));
  }

  async handleAfterClaim(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    client.collectedCoin = 0;
    client.socket.emit('updateCoin', client.collectedCoin.toString());
  }

  async handleAnonymousLogin(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;

    console.log("Anonymous login: " + client.socket.id);

    // reset collected coin
    client.collectedCoin = 0;
    client.numberOfCoinCanClaim = 0;
    client.numberOfCustomerToCoin = 0;
    client.numberOfSpawnedCustomer = 0;
 
    // connect provider
    const chainDocument = await this.chainModel.findOne();
    const provider = new RpcProvider({ nodeUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7'});
    // const provider = new RpcProvider({ nodeUrl: chainDocument.rpc});

    //new Argent X account v0.3.0
    const argentXaccountClassHash = '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003';

    // Generate public and private key pair.
    const privateKeyAX = stark.randomAddress();
    console.log('AX_ACCOUNT_PRIVATE_KEY=', privateKeyAX);
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);
    console.log('AX_ACCOUNT_PUBLIC_KEY=', starkKeyPubAX);

    // Calculate future address of the ArgentX account
    const AXConstructorCallData = CallData.compile({
      owner: starkKeyPubAX,
      guardian: '0',
    });
    const AXcontractAddress = hash.calculateContractAddressFromHash(
      starkKeyPubAX,
      argentXaccountClassHash,
      AXConstructorCallData,
      0
    );
    console.log('Precalculated account address=', AXcontractAddress);

    const str = JSON.stringify([AXcontractAddress, privateKeyAX]);
    client.socket.emit('updateAnonymous', str)
  }

  async handleSaveDataRequest(socket: Socket, data: string){
   // Save this data to server 
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    console.log("loadDataRequest");
    client.savedData = data;
    console.log(data);
  }

  async handleLoadDataRequest(socket: Socket) {
    // Load data
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;
    client.socket.emit('loadCallback', client.savedData);
  }

  async handleUpdateTotalPoint(socket: Socket){
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;

    client.socket.emit('totalPointCallback', client.totalPoint);
  }

  async handleShareToTwitterRequest(socket: Socket, message: string){
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;

    // currently will show message that is sent by client directly. Future will get content from server
    client.socket.emit('twitterRequestCallback', message);
  }

  async handlePlayerInputLink(socket: Socket, url: string) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (client == undefined) return;

    // Save the link to server

  }
}
