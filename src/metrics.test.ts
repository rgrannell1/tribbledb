import { assertEquals } from "jsr:@std/assert";
import {
  IndexPerformanceMetrics,
  TribbleDBPerformanceMetrics,
} from "./metrics.ts";

Deno.test("IndexPerformanceMetrics: constructor initializes with zero count", () => {
  const metrics = new IndexPerformanceMetrics();
  assertEquals(metrics.mapReadCount, 0);
});

Deno.test("IndexPerformanceMetrics: mapRead increments count", () => {
  const metrics = new IndexPerformanceMetrics();
  assertEquals(metrics.mapReadCount, 0);
  metrics.mapRead();
  assertEquals(metrics.mapReadCount, 1);
});

Deno.test("IndexPerformanceMetrics: mapRead increments multiple times", () => {
  const metrics = new IndexPerformanceMetrics();
  metrics.mapRead();
  metrics.mapRead();
  metrics.mapRead();
  assertEquals(metrics.mapReadCount, 3);
});

Deno.test("IndexPerformanceMetrics: mapRead handles large counts", () => {
  const metrics = new IndexPerformanceMetrics();
  for (let idx = 0; idx < 1000; idx++) {
    metrics.mapRead();
  }
  assertEquals(metrics.mapReadCount, 1000);
});

Deno.test("IndexPerformanceMetrics: clone creates independent copy", () => {
  const original = new IndexPerformanceMetrics();
  original.mapRead();
  original.mapRead();
  original.mapRead();

  const cloned = original.clone();

  assertEquals(cloned.mapReadCount, 3);

  cloned.mapRead();
  assertEquals(cloned.mapReadCount, 4);
  assertEquals(original.mapReadCount, 3);
});

Deno.test("IndexPerformanceMetrics: clone preserves zero count", () => {
  const original = new IndexPerformanceMetrics();
  const cloned = original.clone();
  assertEquals(cloned.mapReadCount, 0);
});

Deno.test("IndexPerformanceMetrics: clone can be cloned again", () => {
  const original = new IndexPerformanceMetrics();
  original.mapRead();
  original.mapRead();

  const clone1 = original.clone();
  clone1.mapRead();

  const clone2 = clone1.clone();
  assertEquals(clone2.mapReadCount, 3);

  clone2.mapRead();
  assertEquals(clone2.mapReadCount, 4);
  assertEquals(clone1.mapReadCount, 3);
  assertEquals(original.mapReadCount, 2);
});

Deno.test("IndexPerformanceMetrics: mapReadCount can be directly modified", () => {
  const metrics = new IndexPerformanceMetrics();
  metrics.mapReadCount = 42;
  assertEquals(metrics.mapReadCount, 42);
});

Deno.test("TribbleDBPerformanceMetrics: constructor initializes with zero count", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  assertEquals(metrics.setCheckCount, 0);
});

Deno.test("TribbleDBPerformanceMetrics: setCheck increments count", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  assertEquals(metrics.setCheckCount, 0);
  metrics.setCheck();
  assertEquals(metrics.setCheckCount, 1);
});

Deno.test("TribbleDBPerformanceMetrics: setCheck increments multiple times", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  metrics.setCheck();
  metrics.setCheck();
  metrics.setCheck();
  assertEquals(metrics.setCheckCount, 3);
});

Deno.test("TribbleDBPerformanceMetrics: setCheck handles large counts", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  for (let idx = 0; idx < 1000; idx++) {
    metrics.setCheck();
  }
  assertEquals(metrics.setCheckCount, 1000);
});

Deno.test("TribbleDBPerformanceMetrics: clone creates independent copy", () => {
  const original = new TribbleDBPerformanceMetrics();
  original.setCheck();
  original.setCheck();
  original.setCheck();

  const cloned = original.clone();

  assertEquals(cloned.setCheckCount, 3);

  cloned.setCheck();
  assertEquals(cloned.setCheckCount, 4);
  assertEquals(original.setCheckCount, 3);
});

Deno.test("TribbleDBPerformanceMetrics: clone preserves zero count", () => {
  const original = new TribbleDBPerformanceMetrics();
  const cloned = original.clone();
  assertEquals(cloned.setCheckCount, 0);
});

Deno.test("TribbleDBPerformanceMetrics: clone can be cloned again", () => {
  const original = new TribbleDBPerformanceMetrics();
  original.setCheck();
  original.setCheck();

  const clone1 = original.clone();
  clone1.setCheck();

  const clone2 = clone1.clone();
  assertEquals(clone2.setCheckCount, 3);

  clone2.setCheck();
  assertEquals(clone2.setCheckCount, 4);
  assertEquals(clone1.setCheckCount, 3);
  assertEquals(original.setCheckCount, 2);
});

Deno.test("TribbleDBPerformanceMetrics: setCheckCount can be directly modified", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  metrics.setCheckCount = 42;
  assertEquals(metrics.setCheckCount, 42);
});

Deno.test("IndexPerformanceMetrics and TribbleDBPerformanceMetrics: independent instances", () => {
  const indexMetrics = new IndexPerformanceMetrics();
  const tribbleMetrics = new TribbleDBPerformanceMetrics();

  indexMetrics.mapRead();
  indexMetrics.mapRead();

  tribbleMetrics.setCheck();

  assertEquals(indexMetrics.mapReadCount, 2);
  assertEquals(tribbleMetrics.setCheckCount, 1);
});

Deno.test("IndexPerformanceMetrics: multiple instances are independent", () => {
  const metrics1 = new IndexPerformanceMetrics();
  const metrics2 = new IndexPerformanceMetrics();

  metrics1.mapRead();
  metrics1.mapRead();

  assertEquals(metrics1.mapReadCount, 2);
  assertEquals(metrics2.mapReadCount, 0);
});

Deno.test("TribbleDBPerformanceMetrics: multiple instances are independent", () => {
  const metrics1 = new TribbleDBPerformanceMetrics();
  const metrics2 = new TribbleDBPerformanceMetrics();

  metrics1.setCheck();
  metrics1.setCheck();

  assertEquals(metrics1.setCheckCount, 2);
  assertEquals(metrics2.setCheckCount, 0);
});
