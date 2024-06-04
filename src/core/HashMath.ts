export interface IHashMath {
  get_hash(x: number, y: number): number;
}

export class HashMath {
  static get_hash(x: number, y: number): number {
    const s = (n: number) => n * ((n + 1) / 2);
    return s(x + y) + x;
  }
}
