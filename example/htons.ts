import { htons } from "../index";

if (process.argv.length < 3) {
  console.log("node htons <unit16>");
  process.exit(-1);
}

const uint16 = parseInt(process.argv[2]);

console.log(htons(uint16));
