import { CancellationToken } from "@electricui/async-utilities";
import { describe, expect, it } from "@jest/globals";

import { ProtocolEncoderPipeline } from "../src/encoder";
import * as sinon from "sinon";
import { Message } from "@electricui/core";
import {
  addressAndCommandToMessageID,
  COMMAND_NAME,
  COMMAND_NAMES,
  COMMAND_NAME_TO_BYTE,
  FRAMING_END,
  FRAMING_START,
  messageIDToAddressAndCommand,
  MessageMetadata,
} from "../src/common";

function generateRoundTrip(inputAddress: number, inputCommand: COMMAND_NAME) {
  const { address, commandName: command } = messageIDToAddressAndCommand(addressAndCommandToMessageID(inputAddress, inputCommand))

  expect(address).toBe(inputAddress)
  expect(command).toBe(inputCommand)
}

describe("MessageID Generation", () => {
  it(
    "can round trip some messageIDs",
    () => {
      generateRoundTrip(0x00, COMMAND_NAMES.CMD_RD_VERSION)
      generateRoundTrip(0x01, COMMAND_NAMES.CMD_SET_ADDRESS)
      generateRoundTrip(0x10, COMMAND_NAMES.CMD_RD_MODE)
      generateRoundTrip(0x50, COMMAND_NAMES.CMD_JMP_BOOT)
      generateRoundTrip(0xf0, COMMAND_NAMES.CMD_PULSE_AMP_SET)
      generateRoundTrip(0xff, COMMAND_NAMES.CMD_TRIGGER_NOW)
    }
  );
  it(
    "throws on incorrect address",
    () => {
      expect(() => {
        addressAndCommandToMessageID(-1, COMMAND_NAMES.CMD_RD_VERSION)
      }).toThrow()
    }
  );
});
