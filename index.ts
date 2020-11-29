import { EventEmitter } from "events";
const raw = require("./build/Release/raw.node");
import net from "net";

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

export interface SocketOptions {
  bufferSize?: number;
  protocol?: Protocol;
  ipVersion?: IPVersion;
}

export class Socket extends EventEmitter {
  private requests: any[] = [];
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
      var me = this;
      var req = this.requests.shift();
      try {
        if (req.beforeCallback) req.beforeCallback();
        this.wrapper.send(
          req.buffer,
          req.offset,
          req.length,
          req.address,
          function (bytes: number) {
            req.afterCallback.call(me, null, bytes);
          }
        );
      } catch (error) {
        req.afterCallback.call(me, error, 0);
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

  send(
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    before?: (error: Error, bytes?: number) => void,
    after?: (error: Error, bytes?: number) => void
  ) {
    if (!after) {
      after = before;
      before = () => {};
    }

    if (length + offset > buffer.length) {
      after?.call(
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
      after?.call(this, new Error("Invalid IP address '" + address + "'"));
      return this;
    }

    const req = {
      buffer: buffer,
      offset: offset,
      length: length,
      address: address,
      afterCallback: after,
      beforeCallback: before,
    };
    this.requests.push(req);

    if (this.sendPaused) this.resumeSend();

    return this;
  }

  pauseSend() {
    this.sendPaused = true;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  pauseRecv() {
    this.recvPaused = true;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  resumeRecv() {
    this.recvPaused = false;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  resumeSend() {
    this.sendPaused = false;
    this.wrapper.pause(this.recvPaused, this.sendPaused);
    return this;
  }

  close() {
    this.wrapper.close();
    return this;
  }
}

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

export function writeChecksum(
  buffer: Buffer,
  checksum: number,
  offset: number
) {
  buffer.writeUInt8((checksum & 0xff00) >> 8, offset);
  buffer.writeUInt8(checksum & 0xff, offset + 1);
  return buffer;
}

export function createSocket(options?: SocketOptions) {
  return new Socket(options || {});
}

export const SocketLevel = raw.SocketLevel;
export const SocketOption = raw.SocketOption;

export const htonl = raw.htonl;
export const htons = raw.htons;
export const ntohl = raw.ntonl;
export const ntohs = raw.ntohs;
