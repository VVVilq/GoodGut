import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncKeyValueStore } from './personal-profile-repository';

export const asyncStorageKeyValueStore: AsyncKeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
