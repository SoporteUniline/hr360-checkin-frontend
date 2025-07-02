import Cookies from "js-cookie";
import axios from "./axios";

export const fetcherWithToken = async (url) => {
  const token = Cookies.get("token");

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const fetcher = (url) => axios.get(url).then((res) => res.data);

export const swr_config = {
  //revalidateOnFocus: false, // no refetch al enfocar la ventana
  //revalidateOnReconnect: false, // no refetch si el usuario se reconecta a internet
  shouldRetryOnError: false, // no volver a intentar si hay error (como 404)
};
