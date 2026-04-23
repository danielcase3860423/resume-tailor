import { getCookie } from "cookies-next";
import { COOKIE_USER_KEY } from "@/config/constants";

export default function authHeader() {
  const user = JSON.parse(getCookie(COOKIE_USER_KEY) || null);
  if (user && user.token) {
    // For Spring Boot back-end
    // return { Authorization: "Bearer " + user.token };

    // for Node.js Express back-end
    return { authorization: "peragreemsolutions_gemini " + user.token };
  } else {
    return {};
  }
}
