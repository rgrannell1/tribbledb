import { TribbleParser } from "./tribble/parse.ts";
import { TribbleStringifier } from "./tribble/stringify.ts";

export * from "./urn.ts";
export * from "./types.ts";
export * from "./tribble-db.ts";

export class Tribble {
  static parser: TribbleParser
  static stringifier: TribbleStringifier
}
