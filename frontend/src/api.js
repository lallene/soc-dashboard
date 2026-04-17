import axios from "axios";

const API_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response || error.message);
    return Promise.reject(error);
  }
);

export const getAnalysis = async () => {
  const res = await api.get("/analyze");
  return res.data;
};

export const getHistory = async (dateFrom = "", dateTo = "") => {
  const params = {};
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const res = await api.get("/history", { params });
  return res.data;
};

export const uploadLog = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const getCVE = async (cveId) => {
  const res = await api.get(`/cve/${cveId}`);
  return res.data;
};