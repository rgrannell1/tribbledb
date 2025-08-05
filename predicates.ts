import { Predicate } from "./types.ts";

export function truth(_: string) {
  return true;
}

export function falsity(_: string) {
  return false;
}

export function all(...preds: Predicate[]) {
  return (value: string) => preds.every((pred) => pred(value));
}

export function any(...preds: Predicate[]) {
  return (value: string) => preds.some((pred) => pred(value));
}

export function not(predicate: Predicate) {
  return (value: string) => !predicate(value);
}


export function isUrn(namespace: string = "ró") {
  return (value: string) => {
    return value.startsWith(`urn:${namespace}:`);
  };
}

export function isType(type: string) {
  return (value: string) => {
    if (!isUrn()(value)) {
      return false;
    }

    return parseUrn(value).type === type;
  };
}

export function sameUrn(candidate: string) {
  return (value: string) => {
    if (!isUrn()(value) || !isUrn()(candidate)) {
      return false;
    }

    const parsedValue = parseUrn(value);
    const parsedCandidate = parseUrn(candidate);

    return parsedValue.id === parsedCandidate.id &&
      parsedValue.type === parsedCandidate.type;
  };
}

export function sameType(candidate: string) {
  return (value: string) => {
    if (!isUrn()(value) || !isUrn()(candidate)) {
      return false;
    }

    const parsedValue = parseUrn(value);
    const parsedCandidate = parseUrn(candidate);

    return parsedValue.type === parsedCandidate.type;
  };
}

export function hasParameter(name: string, paramValue?: string) {
  return (value: string) => {
    if (!isUrn()(value)) {
      return false;
    }

    const parsed = parseUrn(value);
    if (!Object.prototype.hasOwnProperty.call(parsed.qs, name)) {
      return false;
    }

    if (typeof paramValue === 'undefined') {
      return true;
    }

    return parsed.qs[name] === paramValue;
  }
}