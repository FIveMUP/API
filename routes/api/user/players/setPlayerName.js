'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.post('/setPlayerName', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query
        const { playerId, playerName } = request.body

        if (!auth_token || !playerId || !playerName) {
            return reply.code(400).send({
                message: 'auth_token, playerId, and playerName are required',
            })
        }

        try {
            const validToken = await jwt.verifyTokenWithAuth(
                auth_token,
                'user_auth'
            )
            if (validToken?.valid === false)
                return reply.code(400).send(validToken)

            conn = await request.dbpool.getConnection()
            await conn.beginTransaction()

            const rows = await conn.query(
                'SELECT * FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                await conn.rollback()
                return reply.code(400).send({ message: 'user does not exist' })
            }

            const queryUpdate = await conn.query(
                'UPDATE stock_accounts SET username = ? WHERE id = ? AND owner = ?',
                [playerName, playerId, validToken.userId]
            )

            if (queryUpdate.affectedRows <= 0) {
                await conn.rollback()
                return reply.code(400).send({ message: 'Player does not exist or is not owned by user' })
            }

            await conn.commit()

            console.log(`Player ${playerId} assigned to ${playerName}`)

            return {
                message: 'Player name updated',
            }
        } catch (err) {
            console.log(err)
            await conn.rollback()
            return reply.code(500).send({ message: 'Internal server error' })
        } finally {
            if (conn) conn.release()
        }
    })
}
