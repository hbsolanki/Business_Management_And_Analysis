// let API = "http://127.0.0.1:8000";
let API = "https://business-management-and-analysis-backend.onrender.com";

export const setGlobalVariable = (value) => {
  API = value;
};

export const getGlobalVariable = () => {
  return API;
};
