import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export const getAnalysis = async () => {
  const res = await axios.get(`${API_URL}/analyze`);
  return res.data;
};

export const getHistory = async (dateFrom = "", dateTo = "") => {
  let url = `${API_URL}/history`;

  if (dateFrom && dateTo) {
    url += `?from=${dateFrom}&to=${dateTo}`;
  }

  const res = await axios.get(url);
  return res.data;
};