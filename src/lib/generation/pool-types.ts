export interface PoolImage {
  id: string;
  src: string;
  width: number;
  height: number;
  category: string;
  /** The first tag is always the primary subject (a noun). */
  tags: string[];
  color: string;
  credit: string;
  sourceUrl: string;
}
