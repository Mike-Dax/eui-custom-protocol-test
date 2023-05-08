import { Message, Pipeline } from "@electricui/core";
import { CancellationToken } from "@electricui/async-utilities";

import { debug as d } from "debug";

import {
  COMMAND_BYTE_TO_NAME,
  COMMAND_NAME_TO_BYTE,
  MessageMetadata,
  COMMAND_NAME,
  FRAMING_START,
  FRAMING_END,
  ProtocolPipelineOptions,
  messageIDToAddressAndChannel,
} from "./common";

const debug = d("protocol:encoder");

export function encode(message: Message<number, MessageMetadata>) {
  const packetAddress = message.metadata.address
  const packetCommand = COMMAND_NAME_TO_BYTE[message.metadata.commandName];

  if (packetCommand === undefined) {
    throw new Error(`Unknown packet command: ${message.messageID}`);
  }

  // If the payload is null, set it to 0x00
  const packetData = message.payload ?? 0x00;

  const packet = Buffer.from([
    FRAMING_START,
    packetAddress,
    packetCommand,
    packetData,
    FRAMING_END,
  ]);

  return packet;
}

export class ProtocolEncoderPipeline extends Pipeline {
  constructor(options: ProtocolPipelineOptions = {}) {
    super();
  }

  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken
  ) {
    const encoded = encode(message);
    return this.push(encoded, cancellationToken);
  }
}
