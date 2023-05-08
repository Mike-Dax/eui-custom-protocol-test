import { Message, Pipeline, DuplexPipeline } from '@electricui/core'
import { COMMAND_NAME, COMMAND_NAMES, messageIDToAddressAndCommand, MessageMetadata } from './common'
import { CancellationToken } from '@electricui/async-utilities'

function map(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  commandName: COMMAND_NAME,
) {
  if (x < inMin || x > inMax) {
    throw new Error(
      `Incorrect data for ${commandName}, must be between ${inMin} and ${inMax}`,
    )
  }

  const mapped = ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

  // Return an integer
  return Math.round(mapped)
}

export function encodeData(commandName: COMMAND_NAME, data: number) {
  switch (commandName) {
    case COMMAND_NAMES.CMD_SET_ADDRESS:
      return map(data, 1, 252, 0x01, 0xfc, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_SET:
      return map(data, 0, 100, 0x00, 0xff, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_B_SET:
      return map(data, 0, 100, 0x00, 0xff, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_T_SET:
      // Note: this goes from 0x00 to 0x1f
      return map(data, 0, 100, 0x00, 0x1f, commandName)

    case COMMAND_NAMES.CMD_STRB_PW_SET:
      return map(data, 100, 500, 0x32, 0xfa, commandName)

    case COMMAND_NAMES.CMD_STRB_DELAY_SET:
      return map(data, 0, 65280, 0x00, 0xff, commandName)

    case COMMAND_NAMES.CMD_SET_MODE:
      return map(data, 0x00, 0x26, 0x00, 0x26, commandName)

    default:
      return map(data, 0x00, 0xff, 0x00, 0xff, commandName)
  }
}

export function decodeData(commandName: COMMAND_NAME, data: number) {
  switch (commandName) {
    case COMMAND_NAMES.CMD_PULSE_AMP_RD:
      return map(data, 0x00, 0xff, 0, 100, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_B_RD:
      return map(data, 0x00, 0xff, 0, 100, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_T_RD:
      return map(data, 0x00, 0x1f, 0, 100, commandName)

    case COMMAND_NAMES.CMD_PULSE_AMP_TB_RD:
      throw new Error(`CMD_PULSE_AMP_TB_RD has 6 bytes, so this'll never pass the framing pipeline`)

    case COMMAND_NAMES.CMD_STRB_PW_RD:
      return map(data, 0x32, 0xfa, 100, 500, commandName)

    case COMMAND_NAMES.CMD_STRB_DELAY_RD:
      return map(data, 0x00, 0xff, 0, 65280, commandName)

    default:
      return map(data, 0x00, 0xff, 0x00, 0xff, commandName)
  }
}

export class CodecEncoderPipeline extends Pipeline {
  receive(
    message: Message<number, MessageMetadata>,
    cancellationToken: CancellationToken
  ) {
    const { commandName } = messageIDToAddressAndCommand(message.messageID)
    const encoded = encodeData(commandName, message.payload ?? 0x00);
    // Mutate the payload
    message.payload = encoded

    return this.push(message, cancellationToken);
  }
}

export class CodecDecoderPipeline extends Pipeline {
  receive(message: Message, cancellationToken: CancellationToken) {
    const { commandName } = messageIDToAddressAndCommand(message.messageID)

    const decoded = decodeData(commandName, message.payload);
    message.payload = decoded

    return this.push(message, cancellationToken);
  }
}

export class CodecPipeline extends DuplexPipeline {
  readPipeline: CodecDecoderPipeline
  writePipeline: CodecEncoderPipeline
  constructor() {
    super()

    this.readPipeline = new CodecDecoderPipeline()
    this.writePipeline = new CodecEncoderPipeline()
  }
}
