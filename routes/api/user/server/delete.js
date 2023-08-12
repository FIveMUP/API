'use strict'

const { nanoid } = require('nanoid')

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')

    fastify.post('/delete', async function (request, reply) {
        let conn
        const jwt = new JWTModel()

        const { auth_token } = request.query
        const { server_id } = request.body

        if (!auth_token || !server_id ) {
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
                'SELECT * FROM users WHERE id = ?',
                validToken.userId
            )

            if (rows.length <= 0) {
                return reply.code(400).send({ message: 'user does not exist' })
            }

            const userServers = JSON.parse(rows[0].servers)

            if (!userServers.includes(server_id)) {
                return reply.code(400).send({ message: 'Server does not exist on user' })
            }

            userServers.splice(userServers.indexOf(server_id), 1)

            await conn.beginTransaction()

            await conn.query(
                'UPDATE users SET servers = ? WHERE id = ?',
                [JSON.stringify(userServers), validToken.userId]
            )

            await conn.query(
                'DELETE FROM servers WHERE id = ?',
                [server_id]
            )

            await conn.query(
                'UPDATE stock_accounts SET assignedServer = "none" WHERE owner = ? AND assignedServer = ?',
                [validToken.userId, server_id]
            )
            
            await conn.commit()

            console.log(`User ${validToken.userId} deleted server ${server_id}`)

            return {
                message: 'Server deleted successfully',
                server_id,
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
