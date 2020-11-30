import {
  Protocol,
  createSocket,
  writeChecksum,
  createChecksum,
} from "../index";

if (process.argv.length < 5) {
  console.log("node ping <target> <count> <sleep-milliseconds>");
  process.exit(-1);
}

const target = process.argv[2];
const count = parseInt(process.argv[3]);
const sleep = parseInt(process.argv[4]);

const options = {
  protocol: Protocol.ICMP,
};

const socket = createSocket(options);

socket.on("close", function () {
  console.log("socket closed");
  process.exit(-1);
});

socket.on("error", function (error) {
  console.log("error: " + error.toString());
  process.exit(-1);
});

socket.on("message", function (buffer, address) {
  console.log("received " + buffer.length + " bytes from " + address);
  console.log("data: " + buffer.toString("hex"));
});

// ICMP echo (ping) request
const buffer = Buffer.from([
  0x08,
  0x00,
  0x00,
  0x00,
  0x00,
  0x01,
  0x0a,
  0x09,
  0x61,
  0x62,
  0x63,
  0x64,
  0x65,
  0x66,
  0x67,
  0x68,
  0x69,
  0x6a,
  0x6b,
  0x6c,
  0x6d,
  0x6e,
  0x6f,
  0x70,
  0x71,
  0x72,
  0x73,
  0x74,
  0x75,
  0x76,
  0x77,
  0x61,
  0x62,
  0x63,
  0x64,
  0x65,
  0x66,
  0x67,
  0x68,
  0x69,
]);

writeChecksum(buffer, 2, createChecksum(buffer));

function ping() {
  for (let i = 0; i < count; i++) {
    socket.send(buffer, 0, buffer.length, target, {
      after(error, bytes) {
        if (error) {
          console.log(error.toString());
        } else {
          console.log("sent " + bytes + " bytes to " + target);
        }
      },
    });
  }

  setTimeout(ping, sleep);
}

ping();
