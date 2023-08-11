'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.get('/retrieve', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token, server_id } = request.query

        if (!auth_token || !server_id) {
            return reply.code(400).send({
                message: 'auth_token & server_id are required params',
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
                'SELECT servers FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                return reply.code(400).send({ message: 'User does not exist' })
            }

            const servers = JSON.parse(rows[0].servers)

            if (!servers.includes(server_id)) {
                return reply.code(400).send({ message: 'Server does not exist or user doesnt have access to it' })
            }

            const rows_server = await conn.query(
                'SELECT * FROM servers WHERE id = ?',
                server_id
            )

            if (rows_server.length <= 0) {
                return reply.code(400).send({ message: 'Server does not exist' })
            }

            console.log(`Server info retrieved for user ${validToken.userId}`)

            const rows_server_players = await conn.query(
                'SELECT * FROM stock_accounts WHERE assignedServer = ?',
                server_id
            )

            return {
                message: 'Server info retrieved',
                server: {
                    id: rows_server[0].id,
                    name: rows_server[0].name + ' - ' + rows_server[0].id,
                    cfxCode: rows_server[0].cfxCode,
                    assignedPlayers: rows_server_players.length,
                }
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
