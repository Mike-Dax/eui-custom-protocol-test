import { Message, Pipeline } from "@electricui/core";
import { CancellationToken } from "@electricui/async-utilities";

import { timing } from "@electricui/timing";
import { debug as d } from "debug";

import {
  addressAndCommandToMessageID,
  byteToHexString,
  COMMAND_BYTE_TO_NAME,
  MessageMetadata,
  ProtocolPipelineOptions,
} from "./common";

const debug = d("protocol:decoder");

export function decode(packet: Buffer) {
  // After framing, pick the data out
  const packetAddress = packet[1] // prettier-ignore
  const packetCommand = packet[2] // prettier-ignore
  const packetData =    packet[3] // prettier-ignore

  const commandName = COMMAND_BYTE_TO_NAME.get(packetCommand);

  if (!commandName) {
    throw new Error(
      `Unknown packet command: ${byteToHexString(packetCommand)}`
    );
  }

  const messageID = addressAndCommandToMessageID(packetAddress, commandName)

  const message = new Message<number, MessageMetadata>(messageID, packetData);
  message.metadata.address = packetAddress; // If reading these out directly, at least they'll be correct
  message.metadata.commandName = commandName;

  debug(() => `Decoded message ${messageID}`);

  return message;
}

export class ProtocolDecoderPipeline extends Pipeline {
  generateTimestamp = timing.now;

  constructor(options: ProtocolPipelineOptions = {}) {
    super();
    this.generateTimestamp =
      options.generateTimestamp ?? this.generateTimestamp;
  }

  receive(packet: Buffer, cancellationToken: CancellationToken) {
    const decoded = decode(packet);
    decoded.metadata.timestamp = this.generateTimestamp();

    return this.push(decoded, cancellationToken);
  }
}
