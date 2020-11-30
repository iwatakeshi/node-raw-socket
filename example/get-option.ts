import { createSocket, SocketOption, SocketLevel, Protocol } from "../index";

if (process.argv.length < 4) {
  console.log("node get-option <name> <option>");
  process.exit(-1);
}

const level =
  SocketLevel[process.argv[2] as keyof typeof SocketLevel] ||
  parseInt(process.argv[2]);
const option =
  SocketOption[process.argv[3] as keyof typeof SocketOption] ||
  parseInt(process.argv[3]);

const options = {
  protocol: Protocol.ICMP,
};

const socket = createSocket(options);

const buffer = Buffer.alloc(4096);
const len = socket.getOption(level, option, buffer, buffer.length);

socket.pauseSend().pauseRecv();

console.log(buffer.toString("hex", 0, len));
