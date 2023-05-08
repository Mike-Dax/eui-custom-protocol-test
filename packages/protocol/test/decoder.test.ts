import { CancellationToken } from "@electricui/async-utilities";
import { describe, expect, it } from "@jest/globals";

import { ProtocolDecoderPipeline } from "../src/decoder";
import * as sinon from "sinon";
import { Message } from "@electricui/core";
import {
  addressAndChannelToMessageID,
  COMMAND_CHANNEL,
  COMMAND_CHANNELS,
  COMMAND_NAME,
  COMMAND_NAMES,
  COMMAND_NAME_TO_BYTE,
  FRAMING_END,
  FRAMING_START,
  MessageMetadata,
} from "../src/common";

function generateDecoderEqualityTest(
  testCase: Buffer,
  channel: COMMAND_CHANNEL,
  address: number,
  messagePayload: number,
  commandName: COMMAND_NAME,
) {
  return async () => {
    const spy = sinon.spy();

    const pipeline = new ProtocolDecoderPipeline();

    pipeline.push = async (
      packet: Buffer,
      cancellationToken: CancellationToken
    ) => {
      spy(packet);
    };

    await pipeline.receive(testCase, new CancellationToken().deadline(1000));

    const receivedMessage: Message<number, MessageMetadata> =
      spy.getCall(0).args[0];

    expect(receivedMessage).toBeTruthy();
    expect(receivedMessage.messageID).toBe(addressAndChannelToMessageID(address, channel));
    expect(receivedMessage.payload).toBe(messagePayload);
    expect(receivedMessage.metadata.address).toBe(address);
    expect(receivedMessage.metadata.channel).toBe(channel);
    expect(receivedMessage.metadata.commandName).toBe(commandName);

    // The decoder should be called as many times as there are reference calls
    expect(spy.getCalls().length).toBe(1);
  };
}

describe("Protocol Decoder", () => {
  it(
    "handles a golden packet #1",
    generateDecoderEqualityTest(
      Buffer.from([0xfe, 0x02, 0x53, 0x88, 0xfd]),
      COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR,
      0x02,
      0x88,
      COMMAND_NAMES.CMD_PULSE_AMP_B_RD
    )
  );
  it(
    "handles a golden packet #2",
    generateDecoderEqualityTest(
      Buffer.from([
        FRAMING_START,
        0x02,
        COMMAND_NAME_TO_BYTE[COMMAND_NAMES.CMD_RD_VERSION],
        0x1d,
        FRAMING_END,
      ]),
      COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
      0x02,
      0x1d,
      COMMAND_NAMES.CMD_RD_VERSION
    )
  );
});
