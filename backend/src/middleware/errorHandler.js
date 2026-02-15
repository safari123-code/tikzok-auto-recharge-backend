export function errorHandler(err, req, reply) {
  req.log.error({ err }, "request_error");
  reply.code(500).send({ ok: false, error: "internal_error" });
}
