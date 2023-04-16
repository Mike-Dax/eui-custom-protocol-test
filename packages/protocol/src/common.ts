import { MessageMetadata as CoreMessageMetadata } from "@electricui/core";

export const FRAMING_START = 0xfe;
export const FRAMING_END = 0xfd;
export const BROADCAST_ADDRESS = 0xff;
export const MASTER_ADDRESS = 0x00;

// 5 byte messages
// [FRAMING_START, ADDRESS, COMMAND, DATA, FRAMING_END]
// ADDRESS and COMMAND must not be 0xFE or 0xFD
// DATA may be 0xFE or 0xFD
// ADDRESS of 0xFF is all lamps
// ADDRESS of 0x00 is master controller

/**
 * Command names from the PDF
 *
 * | Command Name        | CMD Byte (hex) | Command Description              | Data Byte (Range) | Parameter Range |
 * | ------------------- | -------------- | -------------------------------- | ----------------- | --------------- |
 * | CMD_SET_ADDRESS     | 0x8E           | Set Lamp Address                 | 0x01-0xFC         | 1-252           |
 * | CMD_PULSE_AMP_SET   | 0x83           | Set Pulse Intensity              | 0x00-0xFF         | 0-100%          |
 * | CMD_PULSE_AMP_RD    | 0x13           | Read Pulse Intensity             | 0x00              | N/A             |
 * | CMD_PULSE_AMP_B_SET | 0xC3           | Set Pulse Intensity Bottom IR    | 0x00-0xFF         | 0-100%          |
 * | CMD_PULSE_AMP_B_RD  | 0x53           | Read Pulse Intensity Bottom IR   | 0x00              | N/A             |
 * | CMD_PULSE_AMP_T_SET | 0xA3           | Set Pulse Intensity Top White    | 0x00-0x1F         | 0-100%          |
 * | CMD_PULSE_AMP_T_RD  | 0x93           | Read Pulse Intensity Top White   | 0x00              | N/A             |
 * | CMD_PULSE_AMP_TB_RD | 0xD3           | Read Pulse Intensity Top and Bot | 0x00              | N/A             |
 * | CMD_STRB_PW_SET     | 0x85           | Set Strobe Pulse Width           | 0x32-0xFA         | 100-500 us      |
 * | CMD_STRB_PW_RD      | 0x15           | Read Strobe Pulse Width          | 0x00              | N/A             |
 * | CMD_STRB_DELAY_SET  | 0x87           | Set Strobe Pulse Delay           | 0x00-0xFF         | 0-65280 us      |
 * | CMD_STRB_DELAY_RD   | 0x17           | Read Strobe Pulse Delay          | 0x00              | N/A             |
 * | CMD_READ_ERRORS     | 0x11           | Read Health Status               | 0x00              | N/A             |
 * | CMD_TRIGGER_NOW     | 0x20           | Trigger Strobe                   | 0x00              | N/A             |
 * | CMD_SET_MODE        | 0x81           | Enable/Disable options           | 0x00-0x26         | N/A             |
 * | CMD_RD_MODE         | 0x10           | Read option settings             | 0x00              | N/A             |
 * | CMD_RD_VERSION      | 0xE3           | Read Lamp FW version             | 0x00              | N/A             |
 * | CMD_JMP_BOOT        | 0x1F           | Jump to the Bootloader           | 0x00              | N/A             |
 * | CMD_JMP_APP         | 0x0C           | Jump to the application          | 0x00              | N/A             |
 * | CMD_OFFSET_RD       | 0x31           | Read Calibration Offset          | 0x00              | N/A             |
 * | CMD_SCALE_RD        | 0x32           | Read Calibration Scale           | 0x00              | N/A             |
 * | CMD_ENGR_RD         | 0x60           | Read Engineering Data            | 0x00              | N/A             |
 */
export const COMMAND_NAME_TO_BYTE = {
  /**
   * @CommandDescription: Set Lamp Address
   * @DataByteRange: 0x01-0xFC
   * @ParameterRange: 1-252
   */
  CMD_SET_ADDRESS: 0x8e,

  /**
   * @CommandDescription: Set Pulse Intensity
   * @DataByteRange: 0x00-0xFF
   * @ParameterRange: 0-100%
   */
  CMD_PULSE_AMP_SET: 0x83,

  /**
   * @CommandDescription: Read Pulse Intensity
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_PULSE_AMP_RD: 0x13,

  /**
   * @CommandDescription: Set Pulse Intensity Bottom IR
   * @DataByteRange: 0x00-0xFF
   * @ParameterRange: 0-100%
   */
  CMD_PULSE_AMP_B_SET: 0xc3,

  /**
   * @CommandDescription: Read Pulse Intensity Bottom IR
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_PULSE_AMP_B_RD: 0x53,

  /**
   * @CommandDescription: Set Pulse Intensity Top White
   * @DataByteRange: 0x00-0x1F
   * @ParameterRange: 0-100%
   */
  CMD_PULSE_AMP_T_SET: 0xa3,

  /**
   * @CommandDescription: Read Pulse Intensity Top White
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_PULSE_AMP_T_RD: 0x93,

  /**
   * @CommandDescription: Read Pulse Intensity Top and Bot
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_PULSE_AMP_TB_RD: 0xd3,

  /**
   * @CommandDescription: Set Strobe Pulse Width
   * @DataByteRange: 0x32-0xFA
   * @ParameterRange: 100-500 us
   */
  CMD_STRB_PW_SET: 0x85,

  /**
   * @CommandDescription: Read Strobe Pulse Width
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_STRB_PW_RD: 0x15,

  /**
   * @CommandDescription: Set Strobe Pulse Delay
   * @DataByteRange: 0x00-0xFF
   * @ParameterRange: 0-65280 us
   */
  CMD_STRB_DELAY_SET: 0x87,

  /**
   * @CommandDescription: Read Strobe Pulse Delay
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_STRB_DELAY_RD: 0x17,

  /**
   * @CommandDescription: Read Health Status
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_READ_ERRORS: 0x11,

  /**
   * @CommandDescription: Trigger Strobe
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_TRIGGER_NOW: 0x20,

  /**
   * @CommandDescription: Enable/Disable options
   * @DataByteRange: 0x00-0x26
   * @ParameterRange: N/A
   */
  CMD_SET_MODE: 0x81,

  /**
   * @CommandDescription: Read option settings
   * * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_RD_MODE: 0x10,

  /**
   * @CommandDescription: Read Lamp FW version
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_RD_VERSION: 0xe3,

  /**
   * @CommandDescription: Jump to the Bootloader
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_JMP_BOOT: 0x1f,

  /**
   * @CommandDescription: Jump to the application. Jump is automatic if FW update completes and passes verification.
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_JMP_APP: 0x0c,

  /**
   * @CommandDescription: Read Calibration Offset
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_OFFSET_RD: 0x31,

  /**
   * @CommandDescription: Read Calibration Scale
   * @DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_SCALE_RD: 0x32,

  /**
   * CommandDescription: Read Engineering Data
   * DataByteRange: 0x00
   * @ParameterRange: N/A
   */
  CMD_ENGR_RD: 0x60,
};

// It's annoying that we're redefining this, but it makes the TypeScript types more explicit
export const COMMAND_NAMES = {
  CMD_SET_ADDRESS: "CMD_SET_ADDRESS",
  CMD_PULSE_AMP_SET: "CMD_PULSE_AMP_SET",
  CMD_PULSE_AMP_RD: "CMD_PULSE_AMP_RD",
  CMD_PULSE_AMP_B_SET: "CMD_PULSE_AMP_B_SET",
  CMD_PULSE_AMP_B_RD: "CMD_PULSE_AMP_B_RD",
  CMD_PULSE_AMP_T_SET: "CMD_PULSE_AMP_T_SET",
  CMD_PULSE_AMP_T_RD: "CMD_PULSE_AMP_T_RD",
  CMD_PULSE_AMP_TB_RD: "CMD_PULSE_AMP_TB_RD",
  CMD_STRB_PW_SET: "CMD_STRB_PW_SET",
  CMD_STRB_PW_RD: "CMD_STRB_PW_RD",
  CMD_STRB_DELAY_SET: "CMD_STRB_DELAY_SET",
  CMD_STRB_DELAY_RD: "CMD_STRB_DELAY_RD",
  CMD_READ_ERRORS: "CMD_READ_ERRORS",
  CMD_TRIGGER_NOW: "CMD_TRIGGER_NOW",
  CMD_SET_MODE: "CMD_SET_MODE",
  CMD_RD_MODE: "CMD_RD_MODE",
  CMD_RD_VERSION: "CMD_RD_VERSION",
  CMD_JMP_BOOT: "CMD_JMP_BOOT",
  CMD_JMP_APP: "CMD_JMP_APP",
  CMD_OFFSET_RD: "CMD_OFFSET_RD",
  CMD_SCALE_RD: "CMD_SCALE_RD",
  CMD_ENGR_RD: "CMD_ENGR_RD",
} as const;

// Have a map to natively store the byte as a key. If we used an object it would be coerced to a string.
export const COMMAND_BYTE_TO_NAME = new Map<
  number,
  keyof typeof COMMAND_NAMES
>();

// Populate the map
for (const [commandName, commandByte] of Object.entries(COMMAND_NAME_TO_BYTE)) {
  COMMAND_BYTE_TO_NAME.set(
    commandByte,
    commandName as typeof COMMAND_NAMES[keyof typeof COMMAND_NAMES]
  );
}

export type COMMAND_NAME = typeof COMMAND_NAMES[keyof typeof COMMAND_NAMES];

export function byteToHexString(byte: number) {
  return Buffer.from([byte]).toString("hex");
}

export interface MessageMetadata extends CoreMessageMetadata {
  // Address byte, (not the source of truth, the MessageID is)
  address: number;
  // Command name, (not the source of truth, the MessageID is)
  commandName: COMMAND_NAME;
}

export interface ProtocolPipelineOptions {
  generateTimestamp?: () => number;
}

export function addressAndCommandToMessageID(
  address: number,
  commandName: COMMAND_NAME
) {
  if (!Number.isInteger(address) || address < 0 || address > 255) {
    throw new Error(
      `Address must be an integer between 0 and 255, was ${address}`
    );
  }

  return `${address}/${commandName}`;
}

export function messageIDToAddressAndCommand(messageID: string) {
  try {
    const split = messageID.split("/");

    if (split.length !== 2) {
      throw new Error(`MessageID did not contain the delimiter`)
    }

    const address = Number(split[0])

    if (!Number.isInteger(address)) {
      throw new Error(`Address was not an integer`)
    }

    const commandName = split[1] as COMMAND_NAME

    return {
      address: address,
      commandName: commandName,
    };
  } catch (e) {
    throw new Error(
      `Failed to deconstruct messageID ${messageID} due to ${e.message}`
    );
  }
}

export function broadcastMessageID(command: COMMAND_NAME) {
  // 0xFF is the br
  return addressAndCommandToMessageID(BROADCAST_ADDRESS, command);
}
