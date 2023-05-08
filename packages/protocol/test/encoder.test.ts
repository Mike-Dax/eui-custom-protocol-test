import { CancellationToken } from "@electricui/async-utilities";
import { describe, expect, it } from "@jest/globals";

import { ProtocolEncoderPipeline } from "../src/encoder";
import * as sinon from "sinon";
import { Message } from "@electricui/core";
import {
  addressAndChannelToMessageID,
  COMMAND_CHANNELS,
  COMMAND_BYTE_TO_NAME,
  FRAMING_END,
  FRAMING_START,
  MessageMetadata,
  COMMAND_NAMES,
  COMMAND_NAME_TO_BYTE,
} from "../src/common";

function generateEncoderEqualityTest(
  generateMessage: () => Message<number, MessageMetadata>,
  referenceBytes: [
    FRAMING_START: number,
    ADDRESS: number,
    COMMAND: number,
    DATA: number,
    FRAMING_END: number
  ]
) {
  return async () => {
    const spy = sinon.spy();

    const pipeline = new ProtocolEncoderPipeline();

    pipeline.push = async (
      packet: Buffer,
      cancellationToken: CancellationToken
    ) => {
      spy(packet);
    };

    await pipeline.receive(
      generateMessage(),
      new CancellationToken().deadline(1000)
    );

    const packet: Buffer = spy.getCall(0).args[0];

    expect(packet).toEqual(Buffer.from(referenceBytes));

    // The decoder should be called as many times as there are reference calls
    expect(spy.getCalls().length).toBe(1);
  };
}


describe("Protocol Encoder", () => {
  it(
    "handles a golden packet #1",
    generateEncoderEqualityTest(() => {
      const msg = new Message<number, MessageMetadata>(
        addressAndChannelToMessageID(0x02, COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR),
        0x88
      );
      msg.metadata.channel = COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR
      msg.metadata.address = 0x02
      msg.metadata.commandName = COMMAND_NAMES.CMD_PULSE_AMP_B_SET
      return msg;
    }, [FRAMING_START, 0x02,  COMMAND_NAME_TO_BYTE[COMMAND_NAMES.CMD_PULSE_AMP_B_SET], 0x88, FRAMING_END])
  );
  it(
    "handles a golden packet #2",
    generateEncoderEqualityTest(() => {
      const msg = new Message<number, MessageMetadata>(
        addressAndChannelToMessageID(0x01, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION),
        0x00
      );
      msg.metadata.channel = COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION
      msg.metadata.address = 0x01
      msg.metadata.commandName = COMMAND_NAMES.CMD_RD_VERSION
      return msg;
    }, [
      FRAMING_START,
      0x01,
      COMMAND_NAME_TO_BYTE[COMMAND_NAMES.CMD_RD_VERSION],
      0x00,
      FRAMING_END,
    ])
  );
});
