/*
 * Metrics describing how many operations TribbleDB performed.
 */

export class IndexPerformanceMetrics {
  mapReadCount: number;

  constructor() {
    this.mapReadCount = 0;
  }

  mapRead() {
    this.mapReadCount++;
  }

  clone() {
    const clone = new IndexPerformanceMetrics();
    clone.mapReadCount = this.mapReadCount;
    return clone;
  }
}

export class TribbleDBPerformanceMetrics {
  setCheckCount: number;

  constructor() {
    this.setCheckCount = 0;
  }

  setCheck() {
    this.setCheckCount++;
  }

  clone() {
    const clone = new TribbleDBPerformanceMetrics();
    clone.setCheckCount = this.setCheckCount;
    return clone;
  }
}
