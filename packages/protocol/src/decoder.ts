import { Message, Pipeline } from '@electricui/core'
import { CancellationToken } from '@electricui/async-utilities'

import { timing } from '@electricui/timing'
import { debug as d } from 'debug'

import {
  addressAndChannelToMessageID,
  byteToHexString,
  COMMAND_BYTE_TO_NAME,
  COMMAND_CHANNEL,
  COMMAND_CHANNELS,
  COMMAND_NAMES,
  MessageMetadata,
  ProtocolPipelineOptions,
} from './common'

const debug = d('protocol:decoder')

export const readCommandToCommandChannel = {
  [COMMAND_NAMES.CMD_PULSE_AMP_B_RD]: COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR,
  [COMMAND_NAMES.CMD_PULSE_AMP_T_RD]: COMMAND_CHANNELS.PULSE_INTENSITY_TOP_WHITE,
  [COMMAND_NAMES.CMD_STRB_PW_RD]: COMMAND_CHANNELS.STROBE_PULSE_WIDTH,
  [COMMAND_NAMES.CMD_STRB_DELAY_RD]: COMMAND_CHANNELS.STROBE_PULSE_DELAY,
  [COMMAND_NAMES.CMD_READ_ERRORS]: COMMAND_CHANNELS.HEALTH_STATUS,
  [COMMAND_NAMES.CMD_RD_VERSION]: COMMAND_CHANNELS.LAMP_FIRMWARE_VERSION,
  [COMMAND_NAMES.CMD_OFFSET_RD]: COMMAND_CHANNELS.CALIBRATION_OFFSET,
  [COMMAND_NAMES.CMD_SCALE_RD]: COMMAND_CHANNELS.CALIBRATION_SCALE,
  [COMMAND_NAMES.CMD_ENGR_RD]: COMMAND_CHANNELS.ENGINEERING_DATA,
} as const

export function decode(packet: Buffer) {
  // After framing, pick the data out
  const packetAddress = packet[1] // prettier-ignore
  const packetCommand = packet[2] // prettier-ignore
  const packetData =    packet[3] // prettier-ignore

  const commandName = COMMAND_BYTE_TO_NAME.get(packetCommand)

  if (!commandName) {
    throw new Error(`Unknown packet command: ${byteToHexString(packetCommand)}`)
  }

  const channel: COMMAND_CHANNEL =
    readCommandToCommandChannel[
      commandName as keyof typeof readCommandToCommandChannel
    ]

  if (!channel) {
    throw new Error(`Unknown packet command: ${byteToHexString(packetCommand)}`)
  }

  const messageID = addressAndChannelToMessageID(packetAddress, channel)

  const message = new Message<number, MessageMetadata>(messageID, packetData)
  message.metadata.address = packetAddress
  message.metadata.commandName = commandName
  message.metadata.channel = channel

  debug(() => `Decoded message ${messageID}`)

  return message
}

export class ProtocolDecoderPipeline extends Pipeline {
  generateTimestamp = timing.now

  constructor(options: ProtocolPipelineOptions = {}) {
    super()
    this.generateTimestamp = options.generateTimestamp ?? this.generateTimestamp
  }

  receive(packet: Buffer, cancellationToken: CancellationToken) {
    const decoded = decode(packet)
    decoded.metadata.timestamp = this.generateTimestamp()

    return this.push(decoded, cancellationToken)
  }
}
