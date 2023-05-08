import { CancellationToken } from "@electricui/async-utilities";
import { describe, expect, it } from "@jest/globals";

import { ProtocolEncoderPipeline } from "../src/encoder";
import * as sinon from "sinon";
import { Message } from "@electricui/core";
import {
  addressAndChannelToMessageID,
  COMMAND_CHANNEL,
  COMMAND_CHANNELS,
  messageIDToAddressAndChannel,
} from "../src/common";

function generateRoundTrip(inputAddress: number, inputChannel: COMMAND_CHANNEL) {
  const { address, channel } = messageIDToAddressAndChannel(addressAndChannelToMessageID(inputAddress, inputChannel))

  expect(address).toBe(inputAddress)
  expect(channel).toBe(inputChannel)
}

describe("MessageID Generation", () => {
  it(
    "can round trip some messageIDs",
    () => {
      generateRoundTrip(0x00, COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION)
      generateRoundTrip(0x01, COMMAND_CHANNELS.LAMP_ADDRESS)
      generateRoundTrip(0x10, COMMAND_CHANNELS.OPTIONS)
      generateRoundTrip(0x50, COMMAND_CHANNELS.CALIBRATION_OFFSET)
      generateRoundTrip(0xf0, COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR)
      generateRoundTrip(0xff, COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE)
    }
  );
  it(
    "throws on incorrect address",
    () => {
      expect(() => {
        addressAndChannelToMessageID(-1, COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE)
      }).toThrow()
    }
  );
});
