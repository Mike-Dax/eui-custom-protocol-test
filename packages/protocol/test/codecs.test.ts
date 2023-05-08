import { CancellationToken } from '@electricui/async-utilities'
import { describe, expect, it } from '@jest/globals'

import { encodeData, decodeData } from '../src/codecs'

import {
  COMMAND_CHANNELS,
  COMMAND_NAME_TO_BYTE,
  FRAMING_END,
  FRAMING_START,
  MessageMetadata,
} from '../src/common'

describe('Codecs Encode', () => {
    it('throws when data is out of range', () => {
      expect(() => {
        encodeData(COMMAND_CHANNELS.LAMP_ADDRESS, -100)
      }).toThrow()
  
      expect(() => {
        encodeData(COMMAND_CHANNELS.LAMP_ADDRESS, 0x00)
      }).toThrow()
  
      expect(() => {
        encodeData(COMMAND_CHANNELS.LAMP_ADDRESS, 0xffff)
      }).toThrow()
    })
    it('correctly maps data', () => {
      expect(encodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 512)).toBe(2)
      expect(encodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 515)).toBe(2)
      expect(encodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 1024)).toBe(4)
    })
  })

  describe('Codecs Decode', () => {
    it('throws when data is out of range', () => {
      expect(() => {
        decodeData(COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR, -100)
      }).toThrow()
  
      expect(() => {
        decodeData(COMMAND_CHANNELS.STROBE_PULSE_WIDTH, 0x00)
      }).toThrow()
  
      expect(() => {
        decodeData(COMMAND_CHANNELS.PULSE_INTENSITY_BOTTOM_IR, 0xffff)
      }).toThrow()
    })
    it('correctly maps data', () => {
      expect(decodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 0x00)).toBe(0)
      expect(decodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 0x01)).toBe(256)
      expect(decodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 0x02)).toBe(512)
      expect(decodeData(COMMAND_CHANNELS.STROBE_PULSE_DELAY, 0x04)).toBe(1024)
    })
  })
    