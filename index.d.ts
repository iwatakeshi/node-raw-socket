/// <reference types="node" />
import TypedEmitter from "typed-emitter";
interface SocketEvents {
    close: () => void;
    error: (error: Error) => void;
    message: (buffer: Buffer, address: string) => void;
}
export declare enum IPVersion {
    IPv4 = 1,
    IPv6 = 2
}
export declare enum Protocol {
    None = 0,
    ICMP = 1,
    TCP = 6,
    UDP = 17,
    ICMPv6 = 58
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
}
declare const Socket_base: new () => TypedEmitter<SocketEvents>;
export declare class Socket extends Socket_base {
    private requests;
    private buffer;
    private recvPaused;
    private sendPaused;
    private wrapper;
    constructor(options?: SocketOptions);
    private onSendReady;
    private onRecvReady;
    private onError;
    private onClose;
    private close;
    /**
     * Sends data to a remote host
     * @param buffer The `buffer` parameter is a Node.js `Buffer` object containing the data to be sent
     * @param offset
     * @param length The `length` parameter specifies how many bytes from `buffer`, beginning at `offset` offset, to send
     * @param address The host IP address in IPv4 or IPv6 format
     * @param before
     * @param after
     */
    send(buffer: Buffer, offset: number, length: number, address: string, callbacks?: {
        before?: () => void;
        after?: (error?: Error | null, bytes?: number) => void;
    }): this;
    /**
     * Stops the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
     */
    pauseSend(): this;
    /**
     * Stops the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
     */
    pauseRecv(): this;
    /**
     * Starts the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
     */
    resumeRecv(): this;
    /**
     * Starts the underlying `poll_handle_t` event watcher used by a socket from monitoring for readable and writeable events
     */
    resumeSend(): this;
    /**
     * Sets a socket option using the operating systems `setsockopt()` function.
     */
    setOption(level: SocketLevel | number, option: SocketOption | number, value: number | {
        buffer: Buffer | number;
        length: number;
    }): this;
    /**
     * Returns the number of bytes written into the buffer
     */
    getOption(level: SocketLevel | number, option: SocketOption | number, buffer: Buffer, length: number): number;
}
/**
 * Creates and returns a 16 bit one's complement of the one's complement sum for all the data specified in one or more Node.js `Buffer` objects.
 */
export declare function createChecksum(...args: (Buffer | {
    buffer: Buffer;
    offset: number;
    length: number;
})[]): number;
/**
 * The `writeChecksum()` function writes a checksum created by the `raw.createChecksum()` function to the Node.js `Buffer` object `buffer` at `offsets` offset and `offset + 1`
 * @param buffer
 * @param checksum
 * @param offset
 */
export declare function writeChecksum(buffer: Buffer, offset: number, checksum: number): Buffer;
/**
 * Instantiates and returns an instance of the `Socket` class
 */
export declare function createSocket(options?: SocketOptions): Socket;
export declare const SocketLevel: SocketLevel;
export declare const SocketOption: SocketOption;
export declare const htonl: (uint32: number) => number;
export declare const htons: (uint16: number) => number;
export declare const ntohl: (uint32: number) => number;
export declare const ntohs: (uint16: number) => number;
export {};
