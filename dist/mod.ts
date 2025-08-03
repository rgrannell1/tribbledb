function g(n) {
  return typeof n == "string" && n.startsWith("urn:r\xF3:");
}
function a(n) {
  return !0;
}
function h(n) {
  return !1;
}
function T(...n) {
  return (t) => n.every((r) => r(t));
}
function b(...n) {
  return (t) => n.some((r) => r(t));
}
function x(n) {
  return (t) => !n(t);
}
function m(n = "r\xF3") {
  return (t) => t.startsWith(`urn:${n}:`);
}
var s = class {
    static source(t) {
      return t[0];
    }
    static relation(t) {
      return t[1];
    }
    static target(t) {
      return t[2];
    }
  },
  c = class n {
    #t = [];
    constructor(t = []) {
      this.#t = t;
    }
    static from(t) {
      let r = [];
      for (let i of t) {
        let { id: e, ...o } = i;
        for (let [p, u] of Object.entries(o)) {
          if (Array.isArray(u)) {
            for (let l of u) r.push([e, p, l]);
          } else r.push([e, p, u]);
        }
      }
      return new n(r);
    }
    add(t) {
      this.#t.push(...t);
    }
    #r(t, r) {
      return typeof t == "string"
        ? t === r
        : typeof t == "function"
        ? t(r)
        : !1;
    }
    find(t, r, i) {
      return new n(
        this.#t.filter((e) =>
          this.#r(t, s.source(e)) && this.#r(r, s.relation(e)) &&
          this.#r(i, s.target(e))
        ),
      );
    }
    exists(t = a, r = a, i = a) {
      return this.#t.some((e) =>
        this.#r(t, s.source(e)) && this.#r(r, s.relation(e)) &&
        this.#r(i, s.target(e))
      );
    }
    hasSource(t) {
      return this.#t.some((r) => this.#r(t, s.source(r)));
    }
    hasRelation(t) {
      return this.#t.some((r) => this.#r(t, s.relation(r)));
    }
    hasTarget(t) {
      return this.#t.some((r) => this.#r(t, s.target(r)));
    }
    triples() {
      return this.#t;
    }
    sources() {
      return new Set(this.#t.map((t) => s.source(t)));
    }
    relations() {
      return new Set(this.#t.map((t) => s.relation(t)));
    }
    targets() {
      return new Set(this.#t.map((t) => s.target(t)));
    }
    objects() {
      let t = {};
      for (let [i, e, o] of this.#t) {
        t[i] || (t[i] = {}),
          t[i][e]
            ? Array.isArray(t[i][e]) ? t[i][e].push(o) : t[i][e] = [t[i][e], o]
            : t[i][e] = o;
      }
      let r = [];
      for (let [i, e] of Object.entries(t)) e.id = i, r.push(e);
      return r;
    }
  };
export {
  a as Truth,
  b as Any,
  c as TribbleDB,
  g as isURN,
  h as Falsity,
  m as IsUrn,
  s as Triples,
  T as All,
  x as Not,
};
//# sourceMappingURL=mod.ts.map
