import { BinaryWriter, WireType } from "@bufbuild/protobuf/wire";

/** A commoncommo-style ping: proto3 omits lat/lon/hae because their values are zero. */
export function protobufPing(uid: string, now = new Date()): Uint8Array {
  const writer = new BinaryWriter();
  writer.tag(2, WireType.LengthDelimited).fork();
  writer.tag(1, WireType.LengthDelimited).string("t-x-c-t");
  writer.tag(5, WireType.LengthDelimited).string(uid);
  writer.tag(6, WireType.Varint).uint64(now.getTime());
  writer.tag(7, WireType.Varint).uint64(now.getTime());
  writer.tag(8, WireType.Varint).uint64(now.getTime() + 10_000);
  writer.tag(9, WireType.LengthDelimited).string("m-g");
  writer.tag(13, WireType.Bit64).double(9_999_999);
  writer.tag(14, WireType.Bit64).double(9_999_999);
  writer.join();
  return writer.finish();
}
