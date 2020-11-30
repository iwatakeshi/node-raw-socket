import { htonl } from "../index";

if (process.argv.length < 3) {
  console.log("node htonl <unit32>");
  process.exit(-1);
}

const uint32 = parseInt(process.argv[2]);

console.log(htonl(uint32));
