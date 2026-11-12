/** Creates unique ids for new entities. */
export interface IdGenerator {
  newId(): string;
}
