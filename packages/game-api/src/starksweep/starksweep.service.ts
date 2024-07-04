import { ChainDocument, Chains } from '@app/shared/models/schemas';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import {
  distance_between_two_point,
  rotatePointWithRadius,
} from './game/brush';
import { add_two_vectors } from './game/vector';
import { getClaimPointMessage } from '@app/shared/utils';
import { Web3Service } from '@app/web3/web3.service';
import { Account, stark } from 'starknet';
import configuration from '@app/shared/configuration';

export type StarkSweepParam = {
  socket: Socket;
  deltaTime: number;
  mainBrush: { x: number; y: number };
  otherBrush: { x: number; y: number };
  currentTime: number;
  rotateSpeed: number;
  radius: number;
  platformOffset: { x: number; y: number };
  level: number;
  isCoinCollected: boolean;
  collectedCoin: number;
  levelCoin: number;
  inLevelCollectCoin: number;
  direction: number;
};

@Injectable()
export class StarkSweepService {
  constructor(
    @InjectModel(Chains.name)
    private readonly chainModel: Model<ChainDocument>,
    private readonly web3Service: Web3Service,
  ) {}
  private sockets: StarkSweepParam[] = [];

  private change_direction(client: StarkSweepParam) {
    client.direction *= -1;
  }

  private updateCalculate(client: StarkSweepParam) {
    client.mainBrush = add_two_vectors(
      client.mainBrush.x,
      client.mainBrush.y,
      client.platformOffset.x,
      client.platformOffset.y,
    );
    this.rotateBrush(client);
  }

  private rotateBrush(client: StarkSweepParam) {
    let angle = client.deltaTime * client.rotateSpeed;
    client.otherBrush = rotatePointWithRadius(
      client.otherBrush.x,
      client.otherBrush.y,
      client.mainBrush.x,
      client.mainBrush.y,
      angle,
      client.radius,
      client.direction,
    );
  }

  private playerTouch(client: StarkSweepParam) {
    this.change_direction(client);
    let temp = client.mainBrush;
    client.mainBrush = client.otherBrush;
    client.otherBrush = temp;
  }

  private check_true(
    client: StarkSweepParam,
    position: { x: number; y: number },
  ) {
    let distance = distance_between_two_point(
      position.x,
      position.y,
      client.mainBrush.x,
      client.mainBrush.y,
    );
    // console.log("distance: " + distance);
    return distance <= client.radius + 2;
  }

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
      deltaTime: 0,
      mainBrush: { x: 0, y: 0 },
      otherBrush: { x: 0, y: 0 },
      currentTime: 0,
      rotateSpeed: 0.2,
      radius: 4,
      platformOffset: { x: 0, y: 0 },
      level: 0,
      isCoinCollected: true,
      collectedCoin: 0,
      levelCoin: 0,
      inLevelCollectCoin: 0,
      direction: 1,
    });

    setTimeout(() => {
      socket.emit('connection', {
        date: new Date().getTime(),
        data: 'Hello Unity',
      });
    }, 1000);
  }

  disconnectGame(socket: Socket) {
    this.sockets = this.sockets.filter((sk) => sk.socket !== socket);
  }

  handleUpdate(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    client.deltaTime = (new Date().getTime() - client.currentTime) * 0.01;
    this.updateCalculate(client);
    // console.log(client.mainBrush.x + " " + client.mainBrush.y + " " + client.otherBrush.x + " " + client.otherBrush.y);

    let stringData = JSON.stringify({
      mainBrush: client.mainBrush,
      otherBrush: client.otherBrush,
    });

    // console.log(stringData);
    client.socket.emit('updateBrushPosition', stringData);
    client.currentTime = new Date().getTime();
  }

  handleSetBrushPosition(
    socket: Socket,
    x1: string,
    y1: string,
    x2: string,
    y2: string,
  ) {
    const client = this.sockets.find((i) => i.socket == socket);

    // console.log("Set Brush position " + x1 + " " + y1 + " " + x2 + " " + y2);
    client.mainBrush = { x: parseFloat(x1), y: parseFloat(y1) };
    client.otherBrush = { x: parseFloat(x2), y: parseFloat(y2) };
  }

  handlePlayerTouch(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    this.playerTouch(client);
  }

  handleUpdatePlatformPosition(
    socket: Socket,
    positionX: string,
    positionY: string,
  ) {
    const client = this.sockets.find((i) => i.socket == socket);

    client.platformOffset = {
      x: parseFloat(positionX),
      y: parseFloat(positionY),
    };
  }

  handleUpdateLevel(socket: Socket, level: number) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (level == 0) {
      client.level = level;
      client.levelCoin = 0;
    }
    // update levelCoin
    if (level != client.level) {
      client.level = level;
      if (level < 5) {
        client.levelCoin = level;
      } else if (5 <= level && level <= 10) {
        client.levelCoin = 5;
      } else {
        const temp = level / 10;
        client.levelCoin = parseInt(temp.toString()) * 10;
      }
      client.inLevelCollectCoin = 0;
    }
    console.log('Level: ' + level);
    console.log('Level Coin: ' + client.levelCoin);
    client.socket.emit('updateLevelCoin', client.levelCoin.toString());
  }

  handleCoinCollect(socket: Socket, positionX: string, positionY: string) {
    const client = this.sockets.find((i) => i.socket == socket);

    if (
      this.check_true(client, {
        x: parseFloat(positionX),
        y: parseFloat(positionY),
      })
    ) {
      if (client.inLevelCollectCoin < client.levelCoin) {
        client.isCoinCollected = true;
        client.collectedCoin++;
        client.inLevelCollectCoin++;
        client.socket.emit('updateCoin', client.collectedCoin.toString());
      }
    }
  }

  async handleClaim(socket: Socket, address: string) {
    const client = this.sockets.find((i) => i.socket == socket);

    const proof = await this.sign_transaction(client, address);
    client.socket.emit('updateProof', JSON.stringify(proof));
  }

  async handleAfterClaim(socket: Socket) {
    const client = this.sockets.find((i) => i.socket == socket);

    client.collectedCoin = 0;
    client.socket.emit('updateCoin', client.collectedCoin.toString());
  }
}
