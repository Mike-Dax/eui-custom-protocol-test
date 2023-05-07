import { CancellationToken } from '@electricui/async-utilities'
import { describe, expect, it } from '@jest/globals'

import { encodeData, decodeData } from '../src/codecs'

import {
  addressAndCommandToMessageID,
  COMMAND_NAMES,
  COMMAND_NAME_TO_BYTE,
  FRAMING_END,
  FRAMING_START,
  MessageMetadata,
} from '../src/common'

describe('Codecs Encode', () => {
    it('throws when data is out of range', () => {
      expect(() => {
        encodeData(COMMAND_NAMES.CMD_SET_ADDRESS, -100)
      }).toThrow()
  
      expect(() => {
        encodeData(COMMAND_NAMES.CMD_SET_ADDRESS, 0x00)
      }).toThrow()
  
      expect(() => {
        encodeData(COMMAND_NAMES.CMD_SET_ADDRESS, 0xffff)
      }).toThrow()
    })
    it('correctly maps data', () => {
      expect(encodeData(COMMAND_NAMES.CMD_STRB_DELAY_SET, 512)).toBe(2)
      expect(encodeData(COMMAND_NAMES.CMD_STRB_DELAY_SET, 515)).toBe(2)
      expect(encodeData(COMMAND_NAMES.CMD_STRB_DELAY_SET, 1024)).toBe(4)
    })
  })

  describe('Codecs Decode', () => {
    it('throws when data is out of range', () => {
      expect(() => {
        decodeData(COMMAND_NAMES.CMD_PULSE_AMP_RD, -100)
      }).toThrow()
  
      expect(() => {
        decodeData(COMMAND_NAMES.CMD_STRB_PW_RD, 0x00)
      }).toThrow()
  
      expect(() => {
        decodeData(COMMAND_NAMES.CMD_PULSE_AMP_RD, 0xffff)
      }).toThrow()
    })
    it('correctly maps data', () => {
      expect(decodeData(COMMAND_NAMES.CMD_STRB_DELAY_RD, 0x00)).toBe(0)
      expect(decodeData(COMMAND_NAMES.CMD_STRB_DELAY_RD, 0x01)).toBe(256)
      expect(decodeData(COMMAND_NAMES.CMD_STRB_DELAY_RD, 0x02)).toBe(512)
      expect(decodeData(COMMAND_NAMES.CMD_STRB_DELAY_RD, 0x04)).toBe(1024)
    })
  })
    