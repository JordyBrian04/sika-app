import * as SecureStore from "expo-secure-store";

export async function saveContante(key: string, value: any) {
  await SecureStore.setItemAsync(key, value);
}

export async function getConstante(key: string) {
  const value = await SecureStore.getItemAsync(key);
  //   console.log("value", value)
  const data = JSON.parse(value as string);
  return data;
}

export async function deleteConstante(key: string) {
  await SecureStore.deleteItemAsync(key);
}
