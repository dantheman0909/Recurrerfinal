import { FixedDatabaseStorage } from './fixed-storage';

declare global {
  var appStorage: FixedDatabaseStorage;
}

export {};