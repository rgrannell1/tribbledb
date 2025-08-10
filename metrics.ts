
export class IndexPerformanceMetrics {
  mapReadCount: number;

  constructor() {
    this.mapReadCount = 0;
  }

  mapRead() {
    this.mapReadCount++;
  }
}

export class TribbleDBPerformanceMetrics {
  setCheckCount: number;

  constructor() {
    this.setCheckCount = 0
  }

  setCheck() {
    this.setCheckCount++;
  }
}
