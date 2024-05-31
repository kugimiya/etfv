export type Vec2 = [x: number, y: number];

export interface IVectorMath {
  subtract(v1: Vec2, v2: Vec2): Vec2;
  add(v1: Vec2, v2: Vec2): Vec2;
  multiply(v1: Vec2, v: number): Vec2;
  divide(v1: Vec2, v: number): Vec2;
  lengthNormal(v1: Vec2): number;
  lengthSquared(v1: Vec2): number;
}

export class VectorMath {
  static subtract(v1: Vec2, v2: Vec2): Vec2 {
    return [v1[0] - v2[0], v1[1] - v2[1]];
  }

  static add(v1: Vec2, v2: Vec2): Vec2 {
    return [v1[0] + v2[0], v1[1] + v2[1]];
  }

  static multiply(v1: Vec2, v: number): Vec2 {
    return [v1[0] * v, v1[1] * v];
  }

  static divide(v1: Vec2, v: number): Vec2 {
    return [v1[0] / v, v1[1] / v];
  }

  static lengthNormal(v1: Vec2) {
    return Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  }

  static lengthSquared(v1: Vec2) {
    return v1[0] * v1[0] + v1[1] * v1[1];
  }
}
