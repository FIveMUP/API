'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.get('/retrieve', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query

        if (!auth_token) {
            return reply.code(400).send({
                message: 'auth_token are required params',
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
            const rows = await conn.query(
                'SELECT id FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                return reply.code(400).send({ message: 'User does not exist' })
            }

            const players_rows = await conn.query(
                'SELECT * FROM stock_accounts WHERE owner = ?',
                validToken.userId
            )

            console.log(`Players retrieved for user ${validToken.userId}`)

            return {
                message: 'Players retrieved',
                players: players_rows.map((player) => ({
                    id: player.id,
                    owner: player.owner,
                    assignedServer: player.assignedServer,
                    expireOn: player.expireOn,
                    username: player.username,
                }))
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
