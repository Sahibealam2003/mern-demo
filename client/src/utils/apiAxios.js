import axios from "axios";

export const axiosinstanse = axios.create({
    baseURL  : import.meta.env.VITE_BASE_URL,
    headers :{
        "Content-Type": "application/json"
    }
})