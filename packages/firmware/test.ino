// Protocol Testbench
//   - barebones binary protocol implementation
// [FRAMING_START, ADDRESS, COMMAND, DATA, FRAMING_END]

/* -------------------------------------------------------------------- */

#define FRAMING_BYTE_PREFIX (0xFE)
#define FRAMING_BYTE_SUFFIX (0xFD)

#define PACKET_BUFFER_SIZE 5

typedef enum {
  STATE_FRAMING_START = 0,
  STATE_ADDRESS,
  STATE_COMMAND,
  STATE_DATA,
  STATE_FRAMING_END
} PROTOCOL_STATES;

typedef struct {
  uint8_t address;
  uint8_t command;
  uint8_t payload;
} Packet_t;

typedef struct
{
  uint8_t state;
  Packet_t packet;
} DecoderState_t;

typedef struct
{
  uint8_t buffer[PACKET_BUFFER_SIZE];
} EncoderState_t;

DecoderState_t decoder = { 0 };
EncoderState_t encoder = { 0 };

void user_callback(void);

/* -------------------------------------------------------------------- */

uint32_t emit_timer = 0;

uint8_t   led_state  = 0;   // track if the LED is illuminated

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  emit_timer = millis();
}

void loop() {
  while (Serial.available() > 0) {
    decode(Serial.read());
  }

  // Periodically (500ms) send a packet of this shape
  // if( millis() - emit_timer >= 500 )
  // {
  //   Packet_t example = { .address = 0x24, .command = 0x11, .payload = 0xFA };
  //   encode( &example );

  //   emit_timer = millis();
  // }
}

// Where inbound packets are handled
void user_callback(void) {
  // We just assume the decoder object is global, and we're here because the packet is valid

  // These aren't the actual commands, but they are fine for testing

  // This one is hard coded as address 0x10
  if (decoder.packet.address == 0x10) {
    // CMD_PULSE_AMP_T_SET
    if (decoder.packet.command == 0xA3) {
      led_state = decoder.packet.payload;
      switch (decoder.packet.payload) {
        case 0x00:  // off
          digitalWrite(LED_BUILTIN, LOW);
          break;

        case 0x01:  // on
        case 0xFF:  // some other value we'll use for on
          digitalWrite(LED_BUILTIN, HIGH);
          break;
      }
    }

    // CMD_RD_VERSION
    if (decoder.packet.command == 0xE3) {
      // Version 0x03
      Packet_t response = { .address = 0x00, .command = 0xE3, .payload = 0x03 };
      encode(&response);
    }

    // CMD_PULSE_AMP_T_RD
    if (decoder.packet.command == 0x93) {
      // Reply with LED state
      Packet_t response = { .address = 0x00, .command = 0x93, .payload = led_state };
      encode(&response);
    }
  }
}

/* -------------------------------------------------------------------- */

void encode(Packet_t *to_send) {
  memset(&encoder.buffer, 0, sizeof(encoder.buffer));  // not needed, but good practice for any non-trivial encoder

  encoder.buffer[STATE_FRAMING_START] = FRAMING_BYTE_PREFIX;
  encoder.buffer[STATE_ADDRESS] = to_send->address;
  encoder.buffer[STATE_COMMAND] = to_send->command;
  encoder.buffer[STATE_DATA] = to_send->payload;
  encoder.buffer[STATE_FRAMING_END] = FRAMING_BYTE_SUFFIX;

  Serial.write(encoder.buffer, PACKET_BUFFER_SIZE);

  // alternatively, for human readable output
  /*
  Serial.print("Encode: ");

  for( uint8_t i = 0; i < PACKET_BUFFER_SIZE; i++)
  {
    Serial.print( encoder.buffer[i], HEX);
  }
  Serial.println();
  */
}

void decode(uint8_t inbound_byte) {
  switch (decoder.state) {
    case STATE_FRAMING_START:
      if (inbound_byte == FRAMING_BYTE_PREFIX) {
        // Clear it out before use
        memset(&decoder.packet, 0, sizeof(Packet_t));
        decoder.state = STATE_ADDRESS;
      }
      break;

    case STATE_ADDRESS:
      decoder.packet.address = inbound_byte;
      decoder.state = STATE_COMMAND;
      break;

    case STATE_COMMAND:
      decoder.packet.command = inbound_byte;
      decoder.state = STATE_DATA;
      break;

    case STATE_DATA:
      decoder.packet.payload = inbound_byte;
      decoder.state = STATE_FRAMING_END;
      break;

    case STATE_FRAMING_END:
      if (inbound_byte == FRAMING_BYTE_SUFFIX) {
        // Packet passed all validation checks
        // Tell the end-user about it
        user_callback();
      }
      // else it didn't pass, so do nothing?
      // debug instrumentation would go here

      // Prepare for a new packet to arrive
      decoder.state = STATE_FRAMING_START;
      break;

    default:
      // problem
      decoder.state = STATE_FRAMING_START;
      break;
  }
}

/* -------------------------------------------------------------------- */