import { EventEmitter } from "events";
import net from "net";
// The output will be relative to dist/
const raw = require("../build/Release/raw.node");

export enum IPVersion {
  IPv4 = 1,
  IPv6 = 2,
}

export enum Protocol {
  None = 0,
  ICMP = 1,
  TCP = 6,
  UDP = 17,
  ICMPv6 = 58,
}

interface SocketOption {
  SO_RCVBUF: number;
  SO_RCVTIMEO: number;
  SO_SNDBUF: number;
  SO_SNDTIMEO: number;
  IP_HDRINCL: number;
  IP_OPTIONS: number;
  IP_TOS: number;
  IP_TTL: number;
  IPV6_TTL: number;
  IPV6_UNICAST_HOPS: number;
  IPV6_V6ONLY: number;
  IPV6_HDRINCL?: number;
  SO_BINDTODEVICE?: number;
}

interface SocketLevel {
  SOL_SOCKET: number;
  IPPROTO_IP: number;
  IPPROTO_IPV6: number;
}

export interface SocketOptions {
  /**
   * Size, in bytes, of the sockets internal receive buffer, defaults to `4096`
   */
  bufferSize?: number;
  /**
   * Either one of the constants defined in `Protocol` or the protocol number to use for the socket, defaults to the consant `None`
   */
  protocol?: Protocol;
  /**
   * Either the constant raw.AddressFamily.IPv4 or the constant raw.AddressFamily.IPv6, defaults to the constant raw.AddressFamily.IPv4
   */
  ipVersion?: IPVersion;
  // /**
  //  * Either `true` or `false` to enable or disable the automatic checksum generation feature, defaults to `false`
  //  */
  // generateCheckSums?: boolean;
  // /**
  //  * When `generateChecksums` is `true` specifies how many bytes to index into the send buffer to write automatically generated checksums, defaults to `0`
  //  */
  // checksumOffset?: number;
}

interface Requests {
  buffer: Buffer;
  offset: number;
  length: number;
  address: string;
  beforeCallback: () => void;
  afterCallback: (error?: Error | null, bytes?: number | undefined) => void;
}

for (const key in EventEmitter.prototype) {
  // @ts-ignore
  raw.SocketWrap.prototype[key] = EventEmitter.prototype[key];
}

export class Socket extends EventEmitter {
  private requests: Requests[] = [];
  private buffer: Buffer;
  private recvPaused: boolean = false;
  private sendPaused: boolean = true;
  private wrapper: any;
  constructor(options: SocketOptions = {}) {
    super();
    this.buffer = Buffer.alloc(options?.bufferSize ?? 4096);

    this.wrapper = new raw.SocketWrap(
      options?.protocol ?? 0,
      options?.ipVersion ?? IPVersion.IPv4
    );

    this.wrapper.on("sendReady", this.onSendReady.bind(this));
    this.wrapper.on("recvReady", this.onRecvReady.bind(this));
    this.wrapper.on("error", this.onError.bind(this));
    this.wrapper.on("close", this.onClose.bind(this));
  }

  private onSendReady() {
    if (this.requests.length > 0) {
      const req = this.requests.shift();
      try {
        if (req?.beforeCallback) req?.beforeCallback();
        this.wrapper.send(
          req?.buffer,
          req?.offset,
          req?.length,
          req?.address,
          (bytes: number) => {
            req?.afterCallback.call(this, null, bytes);
          }
        );
      } catch (error) {
        req?.afterCallback.call(this, error, 0);
      }
    } else {
      if (!this.sendPaused) this.pauseSend();
    }
  }

  private onRecvReady() {
    try {
      this.wrapper.recv(
        this.buffer,
        (buffer: Buffer, bytes: number, source: any) => {
          var newBuffer = buffer.slice(0, bytes);
          this.emit("message", newBuffer, source);
        }
      );
    } catch (error) {
      this.emit("error", error);
    }
  }

  private onError(error: Error) {
    this.emit("error", error);
    this.close();
  }

  private onClose() {
    this.emit("close");
  }

  private close() {
    this.wrapper.close();
    return this;
  }

  /**
   * Sends data to a remote host
   * @param buffer The `buffer` parameter is a Node.js `Buffer` object containing the data to be sent
   * @param offset
   * @param length The `length` parameter specifies how many bytes from `buffer`, beginning at `offset` offset, to send
   * @param address The host IP address in IPv4 or IPv6 format
   * @param before
   * @param after
   */
  send(
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    callbacks?: {
      before?: () => void;
      after?: (error?: Error | null, bytes?: number) => void;
    }
  ) {
    if (callbacks && !callbacks?.after) {
      callbacks.after = callbacks?.before;
      callbacks.before = () => {};
    }

    if (length + offset > buffer.length) {
      callbacks?.after?.call(
        this,
        new Error(
          "Buffer length '" +
            buffer.length +
            "' is not large enough for the specified offset '" +
            offset +
            "' plus length '" +
            length +
            "'"
        )
      );
      return this;
    }

    if (!net.isIP(address)) {
      callbacks?.after?.call(
        this,
        new Error("Invalid IP address '" + address + "'")
      );
      return this;
    }

    const req = {
      buffer: buffer,
      offset: offset,
      length: length,
      address: address,
      beforeCallback: callbacks?.before ?? (() => {}),
      afterCallback: callbacks?.after ?? (() => {}),
    };
    this.requests.push(req);

    if (this.sendPaused) this.resumeSend();

    return this;
  }

  /**
   * Stops the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
   */
  pauseSend() {
    this.sendPaused = true;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  /**
   * Stops the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
   */
  pauseRecv() {
    this.recvPaused = true;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  /**
   * Starts the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
   */
  resumeRecv() {
    this.recvPaused = false;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }
  /**
   * Starts the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
   */
  resumeSend() {
    this.sendPaused = false;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  /**
   * Sets a socket option using the operating systems `setsockopt()` function.
   */
  setOption({
    level,
    option,
    buffer,
    length,
  }: {
    level: keyof SocketLevel;
    option: keyof SocketOption;
    buffer?: Buffer;
    length: number;
  }) {
    if (buffer) {
      this.wrapper.setOption(level, option, buffer, length);
    } else this.wrapper.setOption(level, option, buffer);

    return this;
  }

  /**
   * Returns the number of bytes written into the buffer
   */
  getOption({
    level,
    option,
    buffer,
    length,
  }: {
    level: keyof SocketLevel;
    option: keyof SocketOption;
    buffer?: Buffer;
    length: number;
  }): number {
    return this.wrapper.getOption(level, option, buffer, length);
  }
}

/**
 * Creates and returns a 16 bit one's complement of the one's complement sum for all the data specified in one or more Node.js `Buffer` objects.
 */
exports.createChecksum = function () {
  var sum = 0;
  for (var i = 0; i < arguments.length; i++) {
    var object = arguments[i];
    if (object instanceof Buffer) {
      sum = raw.createChecksum(sum, object, 0, object.length);
    } else {
      sum = raw.createChecksum(
        sum,
        object.buffer,
        object.offset,
        object.length
      );
    }
  }
  return sum;
};

/**
 * The `writeChecksum()` function writes a checksum created by the `raw.createChecksum()` function to the Node.js `Buffer` object `buffer` at `offsets` offset and `offset + 1`
 * @param buffer
 * @param checksum
 * @param offset
 */
export function writeChecksum(
  buffer: Buffer,
  checksum: number,
  offset: number
) {
  buffer.writeUInt8((checksum & 0xff00) >> 8, offset);
  buffer.writeUInt8(checksum & 0xff, offset + 1);
  return buffer;
}

/**
 * Instantiates and returns an instance of the `Socket` class
 */
export function createSocket(options?: SocketOptions) {
  return new Socket(options || {});
}

export const SocketLevel = raw.SocketLevel as SocketLevel;
export const SocketOption = raw.SocketOption as SocketOption;

export const htonl = raw.htonl as (uint32: number) => number;
export const htons = raw.htons as (uint16: number) => number;
export const ntohl = raw.ntonl as (uint32: number) => number;
export const ntohs = raw.ntohs as (uint16: number) => number;
