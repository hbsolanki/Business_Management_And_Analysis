let API = "https://business-management-and-analysis.onrender.com";

export const setGlobalVariable = (value) => {
  API = value;
};

export const getGlobalVariable = () => {
  return API;
};
