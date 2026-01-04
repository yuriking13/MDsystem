import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export default fp(async function jwtCompat(fastify) {
  if (!fastify.hasDecorator("jwt")) {
    await fastify.register(jwt, { secret: env.JWT_SECRET });
  }

  if (!fastify.hasDecorator("authenticate")) {
    fastify.decorate(
      "authenticate",
      async function authenticate(request: FastifyRequest, reply: FastifyReply) {
        try {
          await request.jwtVerify();
        } catch {
          reply.code(401).send({ error: "Unauthorized" });
        }
      },
    );
  }
});
