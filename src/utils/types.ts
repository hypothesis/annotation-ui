/** Represents an operation that succeeded. */
export type Success<T> = {
  ok: true;
  value: T;
};

/** Represents an operation that failed. */
export type Failure<E> = {
  ok: false;
  error: E;
};

export type Result<T, E> = Success<T> | Failure<E>;
