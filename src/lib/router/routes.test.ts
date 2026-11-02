import { describe, expect, it } from "vitest";

import { href, parentRoute, parseReturnTo, parseRoute, routes, type Route } from "./routes";

const GIST = "gist:abc123def456abc123def456" as const;
const HOSTED = "hosted:rec1234567890ab" as const;

describe("parseRoute / href", () => {
  const cases: Array<[string, Route, string]> = [
    ["/", routes.landing(), "/"],
    ["/connect", routes.connect(), "/connect"],
    ["/vaults", routes.vaults(), "/vaults"],
    [`/v/abc123def456abc123def456`, routes.vault(GIST), `/v/abc123def456abc123def456`],
    [
      `/v/abc123def456abc123def456/l/loc-cafe`,
      routes.location(GIST, "loc-cafe"),
      `/v/abc123def456abc123def456/l/loc-cafe`,
    ],
    [
      `/v/abc123def456abc123def456/l/loc-cafe/p/p-alice`,
      routes.person(GIST, "loc-cafe", "p-alice"),
      `/v/abc123def456abc123def456/l/loc-cafe/p/p-alice`,
    ],
    // Hosted vaults keep their scheme in the segment, URL-encoded.
    [`/v/hosted%3Arec1234567890ab`, routes.vault(HOSTED), `/v/hosted%3Arec1234567890ab`],
    [
      `/v/hosted%3Arec1234567890ab/l/L1/p/P1`,
      routes.person(HOSTED, "L1", "P1"),
      `/v/hosted%3Arec1234567890ab/l/L1/p/P1`,
    ],
  ];

  it.each(cases)("round-trips %s", (pathname, route, expectedHref) => {
    expect(parseRoute(pathname)).toEqual(route);
    expect(href(route)).toBe(expectedHref);
  });

  it("carries ?version= on every vault-scoped route", () => {
    const route = parseRoute(`/v/abc123def456abc123def456/l/L1`, "?version=sha1");
    expect(route).toEqual(routes.location(GIST, "L1", "sha1"));
    expect(href(route)).toBe(`/v/abc123def456abc123def456/l/L1?version=sha1`);
    expect(parseRoute(href(route).split("?")[0], "?version=sha1")).toEqual(route);
  });

  it("reads share links on the landing route", () => {
    expect(parseRoute("/", "?gist=abc123def456abc123def456")).toEqual(routes.landing(GIST));
    expect(parseRoute("/", `?vault=${encodeURIComponent(HOSTED)}`)).toEqual(routes.landing(HOSTED));
    expect(parseRoute("/", "?gist=not%20valid")).toEqual(routes.landing());
  });

  it("reads returnTo on connect", () => {
    expect(parseRoute("/connect", "?returnTo=%2Fvaults")).toEqual(routes.connect("/vaults"));
    expect(href(routes.connect("/v/abc?x=1"))).toBe("/connect?returnTo=%2Fv%2Fabc%3Fx%3D1");
  });

  it("decodes segments and rejects malformed ones", () => {
    expect(parseRoute("/v/abc123def456abc123def456/l/caf%C3%A9")).toEqual(
      routes.location(GIST, "café"),
    );
    expect(href(routes.location(GIST, "café"))).toBe(`/v/abc123def456abc123def456/l/caf%C3%A9`);
    expect(parseRoute("/v/%E0%A4%A").kind).toBe("notFound");
  });

  it("treats unknown paths and bad vault ids as notFound", () => {
    expect(parseRoute("/nope")).toEqual({ kind: "notFound", pathname: "/nope" });
    expect(parseRoute("/v/bad id!").kind).toBe("notFound");
    expect(parseRoute("/v/abc/l").kind).toBe("notFound");
    expect(parseRoute("/v/abc/l/x/p").kind).toBe("notFound");
    expect(parseRoute("/api/whatever").kind).toBe("notFound");
  });

  it("tolerates trailing slashes", () => {
    expect(parseRoute("/vaults/")).toEqual(routes.vaults());
    expect(parseRoute("/v/abc123def456abc123def456/")).toEqual(routes.vault(GIST));
  });
});

describe("parentRoute", () => {
  it("walks up the hierarchy", () => {
    expect(parentRoute(routes.person(GIST, "L", "P", "v"))).toEqual(
      routes.location(GIST, "L", "v"),
    );
    expect(parentRoute(routes.location(GIST, "L"))).toEqual(routes.vault(GIST));
    expect(parentRoute(routes.vault(GIST))).toEqual(routes.vaults());
    expect(parentRoute(routes.vaults())).toEqual(routes.landing());
    expect(parentRoute(routes.connect())).toEqual(routes.landing());
    expect(parentRoute({ kind: "notFound", pathname: "/x" })).toEqual(routes.landing());
    expect(parentRoute(routes.landing())).toBeNull();
  });
});

describe("parseReturnTo", () => {
  it("parses app-relative paths and falls back to the vault list", () => {
    expect(parseReturnTo("/v/abc123def456abc123def456/l/L1")).toEqual(routes.location(GIST, "L1"));
    expect(parseReturnTo(undefined)).toEqual(routes.vaults());
    expect(parseReturnTo("https://evil.example/phish")).toEqual(routes.vaults());
    expect(parseReturnTo("//evil.example/phish")).toEqual(routes.vaults());
  });
});
