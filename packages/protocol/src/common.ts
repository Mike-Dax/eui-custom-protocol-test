



export const FRAMING_START = 0xFE
export const FRAMING_END = 0xFD

// 5 byte messages
// [FRAMING_START, ADDRESS, COMMAND, DATA, FRAMING_END]
// ADDRESS and COMMAND must not be 0xFE or 0xFD
// DATA may be 0xFE or 0xFD
// ADDRESS of 0xFF is all lamps
// ADDRESS of 0x00 is master controller

// Set slave #2 light intensity to 53%
const testPacket = [0xfe,0x02,0x83,0x88,0xfd]

