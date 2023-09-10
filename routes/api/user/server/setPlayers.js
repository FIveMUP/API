"use strict";

module.exports = async function (fastify, opts) {
  const JWTModel = require("../../../../models/JWT");

  fastify.post("/setPlayers", async function (request, reply) {
    let conn;
    const jwt = new JWTModel();

    const { auth_token } = request.query;
    const { serverId, playerAmount } = request.body;

    if (!auth_token || !serverId || isNaN(playerAmount)) {
      return reply.code(400).send({
        message: "auth_token, serverId, and playerAmount are required",
      });
    }

    try {
      const validToken = await jwt.verifyTokenWithAuth(auth_token, "user_auth");
      if (validToken?.valid === false) return reply.code(400).send(validToken);

      conn = await request.dbpool.getConnection();
      await conn.beginTransaction();

      const rows = await conn.query("SELECT * FROM users WHERE id = ?", [
        validToken.userId,
      ]);

      if (rows.length === 0) {
        await conn.rollback();
        return reply.code(400).send({ message: "El usuario no existe" });
      }

      console.log(validToken.userId);

      const servers = JSON.parse(rows[0].servers);

      if (!servers.includes(serverId)) {
        await conn.rollback();
        return reply
          .code(400)
          .send({ message: "El servidor no existe en el usuario" });
      }

      const [availableBots, assignedBots] = await Promise.all([
        conn.query(
          "SELECT * FROM stock_accounts WHERE owner = ? AND assignedServer = ? FOR UPDATE",
          [validToken.userId, "none"]
        ),
        conn.query(
          "SELECT * FROM stock_accounts WHERE owner = ? AND assignedServer = ? FOR UPDATE",
          [validToken.userId, serverId]
        ),
      ]);

      const availableBotsAmount = availableBots.length;
      const assignedBotsAmount = assignedBots.length;

      const botsToAssign = playerAmount - assignedBotsAmount;
      const botsToUnassign = assignedBotsAmount - playerAmount;

      if (botsToAssign > 0) {
        if (botsToAssign > availableBotsAmount) {
          await conn.rollback();
          return reply
            .code(400)
            .send({ message: "No hay suficientes bots disponibles" });
        }

        const updateIds = availableBots
          .slice(0, botsToAssign)
          .map((bot) => bot.id);
        await conn.query(
          "UPDATE stock_accounts SET assignedServer = ? WHERE id IN (?)",
          [serverId, updateIds]
        );
      } else if (botsToUnassign > 0) {
        const updateIds = assignedBots
          .slice(0, botsToUnassign)
          .map((bot) => bot.id);
        await conn.query(
          "UPDATE stock_accounts SET assignedServer = ? WHERE id IN (?)",
          ["none", updateIds]
        );
      } else {
        await conn.rollback();
        return reply
          .code(400)
          .send({
            message:
              "La cantidad de jugadores es la misma. No se realizaron cambios.",
          });
      }

      await conn.commit();
      console.log(
        `Bots cambiados para #${serverId} por el usuario ${validToken.userId} de ${assignedBotsAmount} a ${playerAmount}`
      );
      return { message: "Jugadores asignados" };
    } catch (err) {
      console.log(err);
      await conn.rollback();
      return reply.code(500).send({ message: "Internal server error" });
    } finally {
      if (conn) conn.release();
    }
  });
};
