let API = "http://127.0.0.1:8000";

export const setGlobalVariable = (value) => {
  API = value;
};

export const getGlobalVariable = () => {
  return API;
};
