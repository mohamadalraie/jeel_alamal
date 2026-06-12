/**
 * Base class for domain entities. Holds identity and equality semantics so
 * use-cases can compare entities by id rather than reference. Framework-free.
 */
export abstract class Entity<TId = string> {
  protected readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  equals(other?: Entity<TId>): boolean {
    if (other == null) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
