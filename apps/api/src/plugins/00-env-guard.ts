import fp from "fastify-plugin";
import { env } from "../env.js";

export default fp(async function envGuard() {
  // Просто импорт env уже валидирует и упадёт с понятным логом.
  void env;
});
